"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { clearStoredAuth } from "@/lib/authReset";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { getWsBaseUrl } from "@/lib/wsUrl";
import { Button } from "@/components/ui/Button";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";

type SpeakMode = "idle" | "listening" | "processing" | "ai_speaking";
type ViewState = "lobby" | "session" | "complete";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  cefr_level: string;
  character_name: string;
  character_role: string;
  scene: string;
  sort_order: number;
}

const LEVEL_COLOR: Record<string, { bg: string; text: string; glow: string }> = {
  A1: { bg: "rgba(61,214,140,0.12)", text: "#3DD68C", glow: "rgba(61,214,140,0.25)" },
  A2: { bg: "rgba(34,211,238,0.12)", text: "#22D3EE", glow: "rgba(34,211,238,0.25)" },
  B1: { bg: "rgba(110,91,255,0.15)", text: "#8B7CFF", glow: "rgba(110,91,255,0.3)" },
  B2: { bg: "rgba(139,124,255,0.15)", text: "#A99BFF", glow: "rgba(139,124,255,0.3)" },
  C1: { bg: "rgba(245,158,11,0.12)", text: "#F59E0B", glow: "rgba(245,158,11,0.25)" },
  C2: { bg: "rgba(239,68,68,0.12)", text: "#EF4444", glow: "rgba(239,68,68,0.25)" },
};

// ── VAD tuning ─────────────────────────────────────────────
const SPEAK_THRESHOLD     = 0.018;  // RMS to enter LISTENING
const SILENCE_THRESHOLD   = 0.012;  // absolute silence floor
const INTERRUPT_THRESHOLD = 0.048;  // RMS during AI speech to barge-in
const SILENCE_MS          = 1400;   // ms of silence before END_OF_SPEECH
const MAX_LISTEN_MS       = 10000;  // auto-send after 10 s no matter what
const PREROLL_CHUNKS      = 3;      // chunks of audio to pre-buffer before speech
const PCM_RATE            = 16000;

// ──────────────────────────────────────────────────────────
//  MODE-AWARE ORB SHADER
//  u_mode: 0 idle · 1 listening · 2 processing · 3 ai_speaking
//  u_audio: 0..1 display level (mic RMS, playback RMS, or synthetic)
// ──────────────────────────────────────────────────────────
const FRAG_SHADER = `precision highp float;

varying vec2 v_texCoord;
uniform float u_time;
uniform vec2  u_resolution;
uniform float u_audio;
uniform float u_mode; // smoothly interpolated float: 0=idle 1=listen 2=think 3=speak

// ── 2D Simplex noise ────────────────────────────────────────
vec3 _m289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec2 _m289v(vec2 x){return x-floor(x*(1./289.))*289.;}
vec3 _perm(vec3 x){return _m289(((x*34.)+1.)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));
  vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;
  i=_m289v(i);
  vec3 p=_perm(_perm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
  vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
  m=m*m; m=m*m;
  vec3 x2=2.*fract(p*C.www)-1.,h=abs(x2)-.5,a0=x2-floor(x2+.5);
  m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.*dot(m,g);
}

void main(){
  vec2 uv=(gl_FragCoord.xy*2.-u_resolution)/min(u_resolution.x,u_resolution.y);
  float d=length(uv);
  float ang=atan(uv.y,uv.x);
  float t=u_time;
  float au=clamp(u_audio,0.,1.);

  // Per-state weights (linear blend between adjacent states)
  float w0=max(0.,1.-abs(u_mode-0.)); // idle
  float w1=max(0.,1.-abs(u_mode-1.)); // listen
  float w2=max(0.,1.-abs(u_mode-2.)); // think
  float w3=max(0.,1.-abs(u_mode-3.)); // speak

  // ── Idle breathing ──────────────────────────────────────
  float breathe=sin(t*.65)*.5+.5;
  float idlePulse=w0*(.12+.06*breathe);

  // ── Sphere base radius ──────────────────────────────────
  float baseR=.62+w0*.022*breathe;

  // ── Domain warping ──────────────────────────────────────
  float spd=.16+w1*.11+w3*.09+w2*.14;
  float ws=1.30+w1*.40+w3*.25;
  vec2 q=vec2(
    snoise(uv*ws          + t*spd),
    snoise(uv*ws+vec2(5.2,1.3) + t*spd*.88)
  );
  float wa=.20+au*.22+w1*.10+w3*.08;
  vec2 warp=vec2(
    snoise(uv*2.1 + wa*q          + t*spd*.50),
    snoise(uv*2.1 + wa*q+vec2(1.7,9.2) + t*spd*.40)
  );

  // ── Displaced sphere SDF ────────────────────────────────
  float dA=.055+au*.09+w1*.035+w3*.035;
  float dT=w2*.028*(sin(t*1.9)*.5+.5);
  float disp=snoise(uv*2.8+warp*.70+t*.12)*dA+dT;
  float sR=baseR+disp;
  float sdf=d-sR;

  // ── Fake 3D normal → Phong lighting ────────────────────
  float rn=clamp(d/max(sR,.001),0.,1.);
  vec3 N=normalize(vec3(uv/max(sR,.001),sqrt(max(0.,1.-rn*rn))*.9+.1));
  vec3 V=vec3(0.,0.,1.);
  vec3 L1=normalize(vec3(-.55,.70,1.));
  vec3 L2=normalize(vec3(.60,-.25,.55));
  float diff=max(0.,dot(N,L1))*.65+max(0.,dot(N,L2))*.12+.30;
  float spec=pow(max(0.,dot(N,normalize(L1+V))),36.)*.55*(.5+au*.8);

  // ── Color palettes per state ────────────────────────────
  vec3 ci=vec3(.28,.14,.82), ri=vec3(.52,.26,.98); // idle: violet
  vec3 cl=vec3(.05,.42,.92), rl=vec3(.18,.72,.98); // listen: cyan-blue
  vec3 ct=vec3(.88,.44,.06), rt=vec3(.98,.74,.18); // think: amber
  vec3 cs=vec3(.06,.78,.62), rs=vec3(.22,.96,.80); // speak: teal-mint

  vec3 core=ci*w0+cl*w1+ct*w2+cs*w3;
  vec3 rim =ri*w0+rl*w1+rt*w2+rs*w3;

  // Iridescence: subtle hue shift along surface
  float iri=sin(ang*2.5+t*.35+warp.x*.8)*.12+.06;
  core=mix(core,rim,iri);

  // ── Compositing ─────────────────────────────────────────
  vec3 col=vec3(0.); float alp=0.;

  // Inner volume (Phong-lit)
  float fill=smoothstep(0.,.5,-sdf);
  col+=core*fill*diff*(1.+au*.25+idlePulse);
  alp+=fill*.88;

  // Surface ring + chromatic aberration
  float sw=26.+au*16.;
  col.r+=rim.r*exp(-abs((d*1.016)-sR)*sw)*1.6;
  col.g+=rim.g*exp(-abs(sdf)*sw)*1.6;
  col.b+=rim.b*exp(-abs((d*.984)-sR)*sw)*1.6;
  alp+=exp(-abs(sdf)*sw);

  // Specular highlight
  col+=vec3(.85,.90,1.)*spec*fill; alp+=spec*.5*fill;

  // Fresnel rim glow
  float fr=pow(1.-clamp((sR-d)/(.28+au*.12),0.,1.),2.2);
  col+=rim*fr*(.40+au*.55+idlePulse*.5); alp+=fr*.38;

  // Atmospheric haze
  float atm=exp(-max(0.,sdf)*3.0)*.20;
  col+=rim*atm; alp+=atm*.55;

  // Thinking: two expanding concentric rings
  if(w2>.02){
    float rp1=fract(t*.55), rp2=fract(t*.55+.5);
    col+=rt*exp(-pow(d-sR-rp1*.42,2.)*110.)*(1.-rp1)*w2*.9;
    alp+=exp(-pow(d-sR-rp1*.42,2.)*110.)*(1.-rp1)*w2*.5;
    col+=rt*exp(-pow(d-sR-rp2*.42,2.)*110.)*(1.-rp2)*w2*.65;
    alp+=exp(-pow(d-sR-rp2*.42,2.)*110.)*(1.-rp2)*w2*.35;
  }

  // Audio-reactive outer pulse (listen & speak)
  float ap=(w1+w3)*au*exp(-max(0.,sdf-.03)*5.5)*.45;
  col+=rim*ap; alp+=ap*.35;

  // Edge fade
  float ef=1.-smoothstep(.85,1.05,d);
  col*=ef; alp*=ef;

  gl_FragColor=vec4(col,clamp(alp,0.,1.));
}`;

const VERT_SHADER = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main(){
  v_texCoord=a_position*.5+.5;
  gl_Position=vec4(a_position,0.,1.);
}`;

// Convert a Float32 sample block (at inRate) to 16kHz mono 16-bit PCM.
function toPcm16(samples: Float32Array, inRate: number): Int16Array {
  let src: Float32Array;
  if (inRate === PCM_RATE) {
    src = samples;
  } else {
    const ratio = inRate / PCM_RATE;
    const outLen = Math.max(1, Math.floor(samples.length / ratio));
    src = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.min(samples.length, Math.floor((i + 1) * ratio));
      let s = 0; let n = 0;
      for (let j = start; j < end; j++) { s += samples[j]; n++; }
      src[i] = n ? s / n : 0;
    }
  }
  const out = new Int16Array(src.length);
  for (let i = 0; i < src.length; i++) {
    const c = Math.max(-1, Math.min(1, src[i]));
    out[i] = c < 0 ? c * 0x8000 : c * 0x7fff;
  }
  return out;
}

function rmsFromTimeDomain(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const n = (data[i] - 128) / 128;
    sum += n * n;
  }
  return Math.sqrt(sum / data.length);
}

// ──────────────────────────────────────────────────────────
export default function SpeakingPage() {
  const router = useRouter();
  const token = useSelector((state: RootState) => state.auth.token);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
  const wsUrl  = getWsBaseUrl();

  const [viewState,        setViewState]        = useState<ViewState>("lobby");
  const [scenarios,        setScenarios]        = useState<Scenario[]>([]);
  const [activeScenario,   setActiveScenario]   = useState<Scenario | null>(null);
  const [sessionId,        setSessionId]        = useState<string | null>(null);
  const [mode,             setModeState]        = useState<SpeakMode>("idle");
  const [statusText,       setStatusText]       = useState("Ready");
  const [messages,         setMessages]         = useState<ChatMessage[]>([]);
  const [userText,         setUserText]         = useState("");
  const [captureReady,     setCaptureReady]     = useState(false);
  const [muted,            setMuted]            = useState(false);
  const [scenariosLoading, setScenariosLoading] = useState(true);
  // Word-token rolling subtitle stream
  const [wordTokens,  setWordTokens]  = useState<{ id: number; text: string }[]>([]);
  const tokenIdRef = useRef(0);
  const captionScrollRef = useRef<HTMLDivElement>(null);

  // WS + capture
  const wsRef            = useRef<WebSocket | null>(null);
  const captureCtxRef    = useRef<AudioContext | null>(null);
  const playbackCtxRef   = useRef<AudioContext | null>(null);
  const mediaStreamRef   = useRef<MediaStream | null>(null);
  const sourceRef        = useRef<MediaStreamAudioSourceNode | null>(null);
  const micAnalyserRef   = useRef<AnalyserNode | null>(null);
  const processorRef     = useRef<ScriptProcessorNode | null>(null);

  // Playback queue
  const playAnalyserRef  = useRef<AnalyserNode | null>(null);
  const playGainRef      = useRef<GainNode | null>(null);
  const audioQueueRef    = useRef<AudioBuffer[]>([]);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const generationDoneRef = useRef(false);

  // VAD / state
  const modeRef          = useRef<SpeakMode>("idle");
  const micLevelRef      = useRef(0);
  const aiLevelRef       = useRef(0);
  const audioLevelRef    = useRef(0);
  const silenceSinceRef  = useRef<number | null>(null);
  const mutedRef         = useRef(false);
  const aiStreamRef      = useRef("");

  // Connection management
  const pingIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const sessionEndedRef  = useRef(false);
  const captureReadyRef  = useRef(false);
  // (hasStartedRef removed — lobby controls session start)
  const _hasStartedRef   = useRef(false); // kept for reconnect guard only

  // VAD — separated display level (slow) from decision level (fast fall)
  const displayMicRef    = useRef(0);     // slow smooth for orb visual
  const vadMicRef        = useRef(0);     // asymmetric fast-fall for silence detection
  const peakMicRef       = useRef(0);     // peak RMS during current listen session
  const listenStartRef   = useRef<number | null>(null);
  const preRollRef       = useRef<ArrayBuffer[]>([]);  // circular pre-roll buffer

  // Smooth mode float for shader (interpolated, not discrete)
  const displayModeRef   = useRef(0.0);

  // WebGL
  const canvasRef        = useRef<HTMLCanvasElement | null>(null);
  const glRef            = useRef<WebGLRenderingContext | null>(null);
  const uTimeRef         = useRef<WebGLUniformLocation | null>(null);
  const uResRef          = useRef<WebGLUniformLocation | null>(null);
  const uAudioRef        = useRef<WebGLUniformLocation | null>(null);
  const uModeRef         = useRef<WebGLUniformLocation | null>(null);
  const rafRef           = useRef<number | null>(null);
  const startTimeRef     = useRef<number | null>(null);

  const setMode = (m: SpeakMode) => { modeRef.current = m; setModeState(m); };

  // ── WebGL setup (orb render loop) ────────────────────────
  // Runs when viewState becomes "session" because the canvas only exists then.
  // On mount (lobby), canvasRef is null and the effect would silently exit,
  // leaving the orb forever blank. Adding viewState fixes the dependency.
  useEffect(() => {
    if (viewState !== "session") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const syncSize = () => {
      const w = canvas!.clientWidth  || 360;
      const h = canvas!.clientHeight || 360;
      if (canvas!.width !== w || canvas!.height !== h) { canvas!.width = w; canvas!.height = h; }
    };
    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);
    syncSize();

    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return;
    glRef.current = gl;

    const compile = (type: number, src: string): WebGLShader | null => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("[orb] shader compile error:", gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT_SHADER);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG_SHADER);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("[orb] program link error:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    uTimeRef.current  = gl.getUniformLocation(prog, "u_time");
    uResRef.current   = gl.getUniformLocation(prog, "u_resolution");
    uAudioRef.current = gl.getUniformLocation(prog, "u_audio");
    uModeRef.current  = gl.getUniformLocation(prog, "u_mode");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    startTimeRef.current = performance.now();

    const frame = (now: number) => {
      const t = (now - (startTimeRef.current ?? now)) / 1000;
      syncSize();
      gl.viewport(0, 0, canvas!.width, canvas!.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // ── Read raw mic RMS ────────────────────────────────
      const micAnalyser = micAnalyserRef.current;
      let micRms = 0;
      if (micAnalyser) {
        const data = new Uint8Array(micAnalyser.frequencyBinCount);
        micAnalyser.getByteTimeDomainData(data);
        micRms = rmsFromTimeDomain(data);
      }

      // Display mic: slow smooth (visual only)
      displayMicRef.current = displayMicRef.current * 0.85 + micRms * 0.15;

      // VAD mic: asymmetric — slow attack, fast fall so silence registers quickly
      const vadPrev = vadMicRef.current;
      vadMicRef.current = micRms > vadPrev
        ? vadPrev * 0.80 + micRms * 0.20   // slow attack (voice onset)
        : vadPrev * 0.50 + micRms * 0.50;  // fast fall  (silence detection)

      // ── Read playback (AI) level ────────────────────────
      const playAnalyser = playAnalyserRef.current;
      let aiRms = 0;
      if (playAnalyser) {
        const data = new Uint8Array(playAnalyser.frequencyBinCount);
        playAnalyser.getByteTimeDomainData(data);
        aiRms = rmsFromTimeDomain(data);
      }
      aiLevelRef.current = aiLevelRef.current * 0.80 + aiRms * 0.20;

      // ── VAD state machine ───────────────────────────────
      const m = modeRef.current;
      const vadMic = vadMicRef.current;

      if (!mutedRef.current) {
        if (m === "idle") {
          if (vadMic > SPEAK_THRESHOLD) {
            // Flush pre-roll so speech onset isn't lost
            const ws = wsRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) {
              preRollRef.current.splice(0).forEach(buf => ws.send(buf));
            } else {
              preRollRef.current.length = 0;
            }
            peakMicRef.current = 0;
            listenStartRef.current = now;
            silenceSinceRef.current = null;
            setMode("listening");
          }
        } else if (m === "listening") {
          // Track peak so silence threshold adapts to speaker volume
          peakMicRef.current = Math.max(peakMicRef.current, micRms);
          const dynSilence = Math.max(SILENCE_THRESHOLD, peakMicRef.current * 0.22);

          // Auto-stop after MAX_LISTEN_MS regardless of noise
          const overMax = listenStartRef.current !== null && (now - listenStartRef.current) > MAX_LISTEN_MS;

          if (overMax || vadMic < dynSilence) {
            if (silenceSinceRef.current === null) silenceSinceRef.current = now;
            else if (overMax || (now - silenceSinceRef.current) > SILENCE_MS) {
              silenceSinceRef.current = null;
              listenStartRef.current = null;
              sendJson({ type: "end_of_speech" });
              setMode("processing");
            }
          } else {
            silenceSinceRef.current = null;
          }
        } else if (m === "ai_speaking") {
          if (vadMic > INTERRUPT_THRESHOLD) bargeIn();
        }
      }

      // ── Display level for the orb audio uniform ─────────
      let display: number;
      const dispMic = displayMicRef.current;
      if (m === "idle")            display = 0.08 + Math.max(0.06 * (0.5 + 0.5 * Math.sin(t * 1.1)), dispMic * 3);
      else if (m === "listening")  display = 0.20 + Math.min(0.80, dispMic * 9);
      else if (m === "processing") display = 0.40 + 0.28 * (0.5 + 0.5 * Math.sin(t * 4.0));
      else                         display = Math.min(1, aiLevelRef.current * 6);
      audioLevelRef.current = audioLevelRef.current * 0.82 + display * 0.18;

      // ── Smooth mode float for shader ─────────────────────
      const targetMode = m === "idle" ? 0 : m === "listening" ? 1 : m === "processing" ? 2 : 3;
      displayModeRef.current += (targetMode - displayModeRef.current) * 0.055;

      if (uTimeRef.current)  gl.uniform1f(uTimeRef.current, t);
      if (uResRef.current)   gl.uniform2f(uResRef.current, canvas!.width, canvas!.height);
      if (uAudioRef.current) gl.uniform1f(uAudioRef.current, audioLevelRef.current);
      if (uModeRef.current)  gl.uniform1f(uModeRef.current, displayModeRef.current);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      ro.disconnect();
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewState]); // re-run when canvas mounts (session view)

  // Auto-scroll caption to bottom whenever new word tokens arrive
  useEffect(() => {
    const el = captionScrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [wordTokens]);

  // ── Fetch scenarios on mount ─────────────────────────────
  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const res = await fetchWithAuth(`${apiUrl}/speaking/scenarios`);
        if (res.ok) setScenarios(await res.json());
      } catch { /* show empty state */ }
      finally { setScenariosLoading(false); }
    };
    fetchScenarios();
    // Cleanup on unmount
    return () => {
      sessionEndedRef.current = true;
      teardownCapture();
      wsRef.current?.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startSession = async (scenario: Scenario | null) => {
    setActiveScenario(scenario);
    sessionEndedRef.current = false;
    setMessages([]);
    setUserText("");
    setWordTokens([]);
    setCaptureReady(false);
    captureReadyRef.current = false;
    try {
      const res = await fetchWithAuth(`${apiUrl}/speaking/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario_id: scenario?.id ?? null }),
      });
      if (!res.ok) throw new Error("start failed");
      const data = await res.json();
      setSessionId(data.session_id);
      setViewState("session");
      connectWebSocket(data.session_id, scenario?.id ?? null);
    } catch {
      setStatusText("Failed to initialize session");
    }
  };

  const connectWebSocket = (sessId: string, scenarioId: string | null) => {
    if (sessionEndedRef.current) return;
    const wsToken = localStorage.getItem("access_token") || token || "";
    const scenarioParam = scenarioId ? `&scenario_id=${encodeURIComponent(scenarioId)}` : "";
    const ws = new WebSocket(`${wsUrl}/ws/speaking/${sessId}?token=${wsToken}${scenarioParam}`);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setStatusText(captureReadyRef.current ? "Reconnected — speak to continue" : "Tap to begin listening");
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
      }, 25000);
      // Re-announce start if capture is already active after a reconnect
      if (captureReadyRef.current) ws.send(JSON.stringify({ type: "start" }));
    };
    ws.onmessage = (event) => {
      // Binary frame = Piper audio for playback.
      if (event.data instanceof ArrayBuffer) {
        enqueueAudio(event.data);
        return;
      }
      let msg: any;
      try { msg = JSON.parse(event.data); } catch { return; }
      switch (msg.type) {
        case "ready":
          setStatusText("Ready");
          break;
        case "state":
          if (msg.state === "processing") setMode("processing");
          break;
        case "transcription":
          setUserText(msg.content);
          setWordTokens([]);   // clear AI text so user turn is clean
          setMessages((p) => [...p, { id: Math.random().toString(), role: "user", content: msg.content }]);
          break;
        case "chunk": {
          if (!msg.content) break;
          aiStreamRef.current += msg.content;
          // Split chunk into word-level tokens (preserving whitespace)
          const parts = msg.content.match(/\S+|\s+/g) ?? [msg.content];
          const newToks = parts.map((t: string) => ({ id: tokenIdRef.current++, text: t }));
          setWordTokens((prev) => {
            const next = [...prev, ...newToks];
            // Keep rolling window of last 60 tokens (~2 visible lines)
            return next.length > 60 ? next.slice(next.length - 60) : next;
          });
          break;
        }
        case "done":
          if (aiStreamRef.current) {
            setMessages((p) => [...p, { id: Math.random().toString(), role: "ai", content: aiStreamRef.current }]);
          }
          aiStreamRef.current = "";
          setUserText("");
          // keep wordTokens visible — they linger until the next user turn
          generationDoneRef.current = true;
          if (!currentSourceRef.current && audioQueueRef.current.length === 0) setMode("idle");
          setStatusText("Ready");
          break;
        case "interrupted":
          stopPlayback();
          aiStreamRef.current = "";
          setWordTokens([]);
          setMode("idle");
          setStatusText("Ready");
          break;
        case "error":
          setStatusText(`Error: ${msg.content}`);
          setMode("idle");
          break;
      }
    };
    ws.onclose = (event) => {
      if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
      setMode("idle");
      stopPlayback();
      // Invalid token (e.g. the user no longer exists): clear it and return to login.
      if (event.code === 4001) {
        clearStoredAuth();
        setStatusText("Session expired — please log in again");
        router.replace("/login");
        return;
      }
      // Auth/profile/server-setup errors won't resolve by retrying.
      const permanent = event.code === 4003 || event.code === 4004 || event.code === 4500;
      if (sessionEndedRef.current || permanent) {
        if (permanent) setStatusText("Connection error — please refresh");
        return;
      }
      // Transient drop: reconnect with capped backoff so we don't loop forever.
      if (reconnectAttemptsRef.current >= 5) {
        setStatusText("Connection lost — please refresh");
        return;
      }
      const delay = 1000 * Math.min(reconnectAttemptsRef.current + 1, 5);
      reconnectAttemptsRef.current++;
      setStatusText("Connection lost — reconnecting…");
      reconnectTimerRef.current = setTimeout(() => { if (!sessionEndedRef.current) connectWebSocket(sessId, scenarioId); }, delay);
    };
    ws.onerror = () => console.error("[speaking] WS error");
  };

  const sendJson = (obj: any) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  };

  // ── Hands-free mic capture (begun on user gesture) ───────
  const beginCapture = async () => {
    if (captureReady) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setStatusText("Microphone access denied");
      return;
    }
    mediaStreamRef.current = stream;

    // Capture context at 16kHz so PCM packets are directly Whisper-compatible.
    let captureCtx: AudioContext;
    try {
      captureCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: PCM_RATE });
    } catch {
      captureCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    captureCtxRef.current = captureCtx;
    await captureCtx.resume().catch(() => {});

    // Playback context (default rate; decodeAudioData resamples Piper WAV).
    const playCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    playbackCtxRef.current = playCtx;
    await playCtx.resume().catch(() => {});
    const pGain = playCtx.createGain();
    pGain.gain.value = 1.0;
    pGain.connect(playCtx.destination);
    playGainRef.current = pGain;
    const pAnalyser = playCtx.createAnalyser();
    pAnalyser.fftSize = 256;
    pAnalyser.connect(pGain);
    playAnalyserRef.current = pAnalyser;

    const source = captureCtx.createMediaStreamSource(stream);
    sourceRef.current = source;
    const analyser = captureCtx.createAnalyser();
    analyser.fftSize = 512;
    micAnalyserRef.current = analyser;
    const processor = captureCtx.createScriptProcessor(2048, 1, 1);
    processorRef.current = processor;
    processor.onaudioprocess = (e) => {
      const pcm = toPcm16(new Float32Array(e.inputBuffer.getChannelData(0)), captureCtx.sampleRate);
      if (!pcm.length) return;
      const ws = wsRef.current;
      if (modeRef.current === "listening" && !mutedRef.current) {
        // Send live PCM to backend while user is speaking
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(pcm.buffer);
      } else if (modeRef.current === "idle") {
        // Pre-roll: keep a short circular buffer so speech onset isn't lost
        preRollRef.current.push(pcm.buffer.slice(0) as ArrayBuffer);
        if (preRollRef.current.length > PREROLL_CHUNKS) preRollRef.current.shift();
      }
    };
    source.connect(analyser);
    analyser.connect(processor);
    processor.connect(captureCtx.destination);

    preRollRef.current.length = 0;
    peakMicRef.current = 0;
    displayModeRef.current = 0;
    displayMicRef.current = 0;
    vadMicRef.current = 0;
    captureReadyRef.current = true;
    setCaptureReady(true);
    setMode("idle");
    sendJson({ type: "start" });
    setStatusText("Just start talking — I'm listening");
  };

  // ── Playback queue (sequential, interruptible) ──────────
  const enqueueAudio = async (wavBytes: ArrayBuffer) => {
    const ctx = playbackCtxRef.current;
    if (!ctx) return;
    try {
      const buf = await ctx.decodeAudioData(wavBytes.slice(0));
      audioQueueRef.current.push(buf);
      pumpPlayback();
    } catch (e) {
      console.error("[speaking] decodeAudioData failed", e);
    }
  };

  const pumpPlayback = () => {
    const ctx = playbackCtxRef.current;
    const analyser = playAnalyserRef.current;
    if (!ctx || !analyser || currentSourceRef.current) return;
    const buf = audioQueueRef.current.shift();
    if (!buf) {
      if (generationDoneRef.current && modeRef.current === "ai_speaking") setMode("idle");
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(analyser);
    src.onended = () => {
      currentSourceRef.current = null;
      pumpPlayback();
    };
    currentSourceRef.current = src;
    if (modeRef.current !== "ai_speaking") setMode("ai_speaking");
    src.start();
  };

  const stopPlayback = () => {
    if (currentSourceRef.current) {
      try { currentSourceRef.current.onended = null; currentSourceRef.current.stop(); } catch { /* ignore */ }
      currentSourceRef.current = null;
    }
    audioQueueRef.current = [];
    generationDoneRef.current = false;
  };

  const bargeIn = () => {
    stopPlayback();
    aiStreamRef.current = "";
    setWordTokens([]);
    sendJson({ type: "interrupt" });
    setMode("idle");
  };

  const teardownCapture = () => {
    if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
    if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
    captureReadyRef.current = false;
    try { processorRef.current?.disconnect(); } catch { /* ignore */ }
    processorRef.current = null;
    try { sourceRef.current?.disconnect(); } catch { /* ignore */ }
    sourceRef.current = null;
    micAnalyserRef.current = null;
    try { captureCtxRef.current?.close(); } catch { /* ignore */ }
    captureCtxRef.current = null;
    stopPlayback();
    try { playAnalyserRef.current?.disconnect(); } catch { /* ignore */ }
    playAnalyserRef.current = null;
    try { playbackCtxRef.current?.close(); } catch { /* ignore */ }
    playbackCtxRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  };

  const toggleMute = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    if (next) {
      silenceSinceRef.current = null;
      setMode("idle");
    }
  };

  // ── End session ──────────────────────────────────────────
  const endSession = async () => {
    sessionEndedRef.current = true;
    teardownCapture();
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (sessionId) {
      try {
        await fetchWithAuth(`${apiUrl}/speaking/end?session_id=${sessionId}`, {
          method: "POST",
        });
      } catch { /* best-effort */ }
    }
    setViewState("complete");
  };

  const statusDot =
    mode === "listening"    ? "bg-primary animate-pulse" :
    mode === "processing"   ? "bg-warning animate-pulse" :
    mode === "ai_speaking"  ? "bg-success animate-pulse" :
    "bg-on-surface-variant";

  const statusLabel =
    mode === "listening"    ? "Listening…" :
    mode === "processing"   ? "Thinking…" :
    mode === "ai_speaking"  ? "Speaking…" :
    captureReady            ? "Idle" : "Tap to begin";

  // ── Lobby ────────────────────────────────────────────────
  if (viewState === "lobby") {
    const grouped = ["A1", "A2", "B1", "B2", "C1", "C2"].reduce<Record<string, Scenario[]>>((acc, lvl) => {
      acc[lvl] = scenarios.filter((s) => s.cefr_level === lvl);
      return acc;
    }, {});
    return (
      <div className="w-full min-h-[calc(100vh-160px)] overflow-y-auto bg-[#0A0A0C] rounded-xl border border-[#2A2A32] animate-fade-in">
        <style>{`
          @keyframes cardIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
          .scenario-card { animation: cardIn 0.35s ease-out both; }
        `}</style>

        {/* Page header */}
        <div className="px-xl pt-xl pb-md max-w-[860px] mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/70 mb-2">AI Speaking Practice</p>
          <h1 className="text-[28px] font-bold text-on-surface tracking-tight leading-tight mb-1">
            Choose a scenario
          </h1>
          <p className="text-[14px] text-on-surface-variant">
            Pick a real-world situation and have a live voice conversation with an AI character.
          </p>
        </div>

        {/* Scenario grid */}
        <div className="px-xl pb-xl max-w-[860px] mx-auto space-y-8">
          {scenariosLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[168px] rounded-2xl bg-[#15151A] border border-[#2A2A32] animate-pulse" />
              ))}
            </div>
          ) : scenarios.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant text-sm">
              No scenarios available — start a free conversation below.
            </div>
          ) : (
            ["A1", "A2", "B1", "B2", "C1", "C2"].filter((lvl) => (grouped[lvl]?.length ?? 0) > 0).map((lvl) => {
              const lc = LEVEL_COLOR[lvl] ?? LEVEL_COLOR.A1;
              return (
                <div key={lvl}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: lc.text }}>{lvl}</span>
                    <div className="flex-1 h-px" style={{ background: lc.glow }} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {grouped[lvl].map((s, idx) => (
                      <button
                        key={s.id}
                        onClick={() => startSession(s)}
                        className="scenario-card text-left rounded-2xl border p-5 flex gap-4 items-start transition-all duration-200 group"
                        style={{
                          animationDelay: `${idx * 60}ms`,
                          background: "#15151A",
                          borderColor: "#2A2A32",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = lc.text + "55";
                          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 18px ${lc.glow}`;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "#2A2A32";
                          (e.currentTarget as HTMLElement).style.boxShadow = "none";
                        }}
                      >
                        {/* Icon */}
                        <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5" style={{ background: lc.bg }}>
                          <span className="material-symbols-outlined text-[20px]" style={{ color: lc.text, fontVariationSettings: "'FILL' 1" }}>
                            {s.icon}
                          </span>
                        </div>
                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-on-surface leading-snug mb-1 group-hover:text-white transition-colors">{s.title}</p>
                          <p className="text-[12px] text-on-surface-variant leading-snug line-clamp-2">{s.description}</p>
                          <p className="text-[11px] mt-2 italic" style={{ color: lc.text + "bb" }}>as {s.character_name} · {s.character_role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {/* Free conversation option */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/40">Free</span>
              <div className="flex-1 h-px bg-[#2A2A32]" />
            </div>
            <button
              onClick={() => startSession(null)}
              className="w-full text-left rounded-2xl border border-dashed border-[#2A2A32] p-5 flex gap-4 items-center hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group"
            >
              <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.04]">
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 0" }}>forum</span>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-on-surface-variant group-hover:text-on-surface transition-colors">Free Conversation</p>
                <p className="text-[12px] text-on-surface-variant/60">No fixed scenario — just talk about anything</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Session complete ──────────────────────────────────────
  if (viewState === "complete") {
    const aiMessages = messages.filter((m) => m.role === "ai");
    return (
      <div className="w-full min-h-[calc(100vh-160px)] flex flex-col bg-[#0A0A0C] border border-[#2A2A32] rounded-xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="shrink-0 px-md py-4 border-b border-[#2A2A32] bg-[#15151A] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-on-surface">Session Complete</p>
              {activeScenario && (
                <p className="text-[11px] text-on-surface-variant">{activeScenario.title} · with {activeScenario.character_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-on-surface-variant">{aiMessages.length} AI {aiMessages.length === 1 ? "reply" : "replies"}</span>
          </div>
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto p-md space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant/60 text-sm italic">
              No conversation recorded.
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold mt-1 ${
                  msg.role === "user" ? "bg-primary/20 text-primary" : "bg-[#1E1E28] border border-[#2A2A32] text-on-surface-variant"
                }`}>
                  {msg.role === "user" ? (
                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                  ) : (
                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                  )}
                </div>
                {/* Bubble */}
                <div className={`max-w-[72%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/50 px-1">
                    {msg.role === "user" ? "You" : activeScenario?.character_name ?? "AI Coach"}
                  </span>
                  <div
                    className={`px-4 py-3 text-[14px] leading-relaxed ${
                      msg.role === "user"
                        ? "text-white rounded-2xl rounded-tr-sm"
                        : "text-on-surface/90 bg-[#15151A] border border-[#2A2A32] rounded-2xl rounded-tl-sm"
                    }`}
                    style={msg.role === "user" ? { background: "linear-gradient(135deg,#6E5BFF 0%,#8B7CFF 100%)" } : {}}
                  >
                    {msg.content || <span className="italic text-on-surface-variant/40">(no response captured)</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-md py-4 border-t border-[#2A2A32] bg-[#15151A] flex items-center justify-between gap-3">
          <Button onClick={() => setViewState("lobby")} variant="outline" className="text-sm">
            Practice Again
          </Button>
          <Button onClick={() => router.push("/dashboard")} className="text-sm">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // ── Main immersive speaking view ─────────────────────────
  return (
    <div className="relative w-full h-[calc(100vh-160px)] min-h-[580px] flex flex-col bg-[#0A0A0C] border border-[#2A2A32] rounded-xl overflow-hidden select-none animate-fade-in">
      {/* Ambient glow */}
      <div className="absolute w-[520px] h-[520px] bg-primary/[0.06] rounded-full blur-[140px] pointer-events-none left-1/2 -translate-x-1/2 top-[30%]" />

      {/* Keyframes */}
      <style>{`
        @keyframes wdIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes userIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes d1 { 0%,70%,100%{opacity:.12;transform:scale(1)}  25%{opacity:1;transform:scale(1.25)} }
        @keyframes d2 { 0%,70%,100%{opacity:.12;transform:scale(1)}  40%{opacity:1;transform:scale(1.25)} }
        @keyframes d3 { 0%,70%,100%{opacity:.12;transform:scale(1)}  55%{opacity:1;transform:scale(1.25)} }
        .caption-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Status bar — top, in flow */}
      <div className="shrink-0 flex justify-between items-center px-md py-2.5 z-30 border-b border-[#2A2A32]/50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { sessionEndedRef.current = true; teardownCapture(); wsRef.current?.close(); wsRef.current = null; setViewState("lobby"); }}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
            title="Back to scenarios"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          {activeScenario ? (
            <div>
              <p className="text-[12px] font-semibold text-on-surface leading-none">{activeScenario.title}</p>
              <p className="text-[10px] text-on-surface-variant/60 mt-0.5">with {activeScenario.character_name}</p>
            </div>
          ) : (
            <span className="text-[12px] text-on-surface-variant">Free Conversation</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
          <span className="text-[11px] text-on-surface-variant/70 font-mono uppercase tracking-wider">{statusLabel}</span>
        </div>
      </div>

      {/* Orb — takes all remaining vertical space */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div
          className="relative flex items-center justify-center"
          style={{ width: "360px", height: "360px" }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ display: "block" }} />
          <div className="absolute w-24 h-24 rounded-full bg-white/[0.04] blur-2xl pointer-events-none z-10" />
          {/* Tap-to-stop overlay visible only during listening */}
          {mode === "listening" && (
            <button
              onClick={() => {
                silenceSinceRef.current = null;
                listenStartRef.current = null;
                sendJson({ type: "end_of_speech" });
                setMode("processing");
              }}
              className="absolute inset-0 rounded-full flex flex-col items-center justify-center z-20 cursor-pointer"
              style={{ background: "transparent" }}
              aria-label="Stop speaking"
            >
              <span
                className="text-[11px] font-bold uppercase tracking-[0.18em] mt-[220px]"
                style={{ color: "rgba(110,91,255,0.55)", textShadow: "0 0 12px rgba(110,91,255,0.4)" }}
              >
                tap to send
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── Live caption bar ── */}
      <div className="shrink-0 z-20 w-full max-w-[540px] mx-auto px-4 mb-3">
        <div
          className="relative rounded-2xl border border-white/[0.07] overflow-hidden"
          style={{ background: "rgba(10,10,14,0.76)", backdropFilter: "blur(28px)" }}
        >
          {/* Speaker-colour accent stripe */}
          <div
            className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl transition-colors duration-500"
            style={{
              background:
                mode === "processing" || wordTokens.length > 0
                  ? "linear-gradient(to bottom,#22d3ee,#0ea5e9)"
                  : mode === "listening" || userText
                  ? "linear-gradient(to bottom,#6E5BFF,#8B7CFF)"
                  : "rgba(255,255,255,0.06)",
            }}
          />

          <div className="pl-5 pr-4 pt-3 pb-4">
            {/* Speaker label */}
            <span
              className="text-[9px] font-extrabold uppercase tracking-[0.18em] transition-colors duration-300 block mb-1.5"
              style={{
                color:
                  mode === "processing" || wordTokens.length > 0
                    ? "rgba(34,211,238,0.55)"
                    : mode === "listening" || userText
                    ? "rgba(110,91,255,0.55)"
                    : "rgba(255,255,255,0.15)",
              }}
            >
              {mode === "processing" || wordTokens.length > 0
                ? "AI Coach"
                : mode === "listening" || userText
                ? "You"
                : captureReady ? "Ready" : ""}
            </span>

            {/* ── Content ── */}
            {mode === "processing" && wordTokens.length === 0 ? (
              /* Thinking dots */
              <div className="flex items-center gap-[7px]" style={{ height: "46px" }}>
                {[1, 2, 3].map((n) => (
                  <span
                    key={n}
                    style={{
                      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
                      background: "#22d3ee",
                      animation: `d${n} 1.35s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>

            ) : wordTokens.length > 0 ? (
              /* Teleprompter: words scroll up as new ones arrive */
              <div style={{ position: "relative", height: "69px" }}>
                {/* Top-fade so scrolled-away text vanishes cleanly */}
                <div
                  style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: "30px",
                    background: "linear-gradient(to bottom, rgba(10,10,14,0.92) 0%, transparent 100%)",
                    zIndex: 2, pointerEvents: "none",
                  }}
                />
                <div
                  ref={captionScrollRef}
                  className="caption-scroll"
                  style={{ height: "100%", overflowY: "scroll", scrollbarWidth: "none" }}
                >
                  <p style={{ fontSize: "15px", fontWeight: 500, lineHeight: "23px", color: "rgba(255,255,255,0.92)", wordBreak: "break-word" }}>
                    {wordTokens.map((tok, i) => {
                      const age = wordTokens.length - 1 - i;
                      return (
                        <span
                          key={tok.id}
                          style={age < 4 ? { animation: "wdIn 0.22s ease-out forwards" } : undefined}
                        >
                          {tok.text}
                        </span>
                      );
                    })}
                  </p>
                </div>
              </div>

            ) : mode === "listening" || userText ? (
              /* User speech — fades in from above */
              <div style={{ height: "46px", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <p
                  key={userText}
                  style={{
                    fontSize: "15px", fontWeight: 500, lineHeight: "23px",
                    color: "rgba(139,124,255,0.92)", wordBreak: "break-word",
                    animation: userText ? "userIn 0.25s ease-out forwards" : "none",
                  }}
                >
                  {userText || <span style={{ opacity: 0.35, fontStyle: "italic" }}>Listening…</span>}
                </p>
              </div>

            ) : (
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.2)", fontStyle: "italic", height: "46px", lineHeight: "46px" }}>
                {captureReady ? "Just start talking" : "Tap below to begin"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Controls — always below caption, never overlapping */}
      <div className="shrink-0 flex items-center justify-center pb-5 pt-1 z-30">
        {!captureReady ? (
          <button
            onClick={beginCapture}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white text-sm font-semibold shadow-[0_0_28px_rgba(110,91,255,0.5)] hover:scale-105 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
            Enable microphone
          </button>
        ) : (
          <div className="flex items-center gap-5 bg-[#14141A]/80 backdrop-blur-xl px-8 py-3.5 rounded-full border border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <button
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-200 ${
                muted
                  ? "bg-error/10 border-error/30 text-error hover:bg-error/20"
                  : "bg-[#1E1E24] border-[#2A2A32] text-on-surface-variant hover:border-primary/50 hover:bg-primary/10"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{muted ? "mic_off" : "mic"}</span>
            </button>
            <button
              onClick={endSession}
              aria-label="End session"
              className="w-14 h-14 rounded-full flex items-center justify-center bg-error/10 border border-error/30 text-error hover:bg-error/20 hover:border-error/60 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <span className="material-symbols-outlined text-[22px]">call_end</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

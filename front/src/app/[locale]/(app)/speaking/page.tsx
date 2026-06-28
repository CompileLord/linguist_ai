"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";

type SpeakMode = "idle" | "listening" | "processing" | "ai_speaking";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
}

// ── VAD tuning ─────────────────────────────────────────────
const SPEAK_THRESHOLD     = 0.020;  // RMS to enter LISTENING
const SILENCE_THRESHOLD   = 0.014;  // RMS floor to consider silence
const INTERRUPT_THRESHOLD = 0.050;  // RMS during AI speech to barge-in
const SILENCE_MS          = 600;    // trailing silence before END_OF_SPEECH
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
uniform float u_mode;

vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}
vec3 permute(vec3 x){return mod289(((x*34.)+1.)*x);}

float snoise(vec2 v){
  const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));
  vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
  vec4 x12=x0.xyxy+C.xxzz;
  x12.xy-=i1;
  i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
  vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
  m=m*m;m=m*m;
  vec3 x=2.*fract(p*C.www)-1.;
  vec3 h=abs(x)-.5;
  vec3 a0=x-floor(x+.5);
  m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
  vec3 g;
  g.x =a0.x *x0.x +h.x *x0.y;
  g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.*dot(m,g);
}

void main(){
  vec2 uv=(gl_FragCoord.xy*2.-u_resolution)/min(u_resolution.y,u_resolution.x);
  float d=length(uv);
  float ang=atan(uv.y,uv.x);

  float audio=u_audio;
  float spin=0.15; float freq=1.6; float amp=0.5;
  vec3 colA=vec3(.43,.36,1.); vec3 colB=vec3(.68,.56,1.);

  if(u_mode<0.5){            // IDLE — slow breathing
    spin=0.12; freq=1.5; amp=0.45;
    audio=0.10+0.08*(0.5+0.5*sin(u_time*1.1));
    colA=vec3(.40,.34,1.); colB=vec3(.62,.52,1.);
  } else if(u_mode<1.5){     // LISTENING — energetic, mic-driven
    spin=0.55; freq=2.6; amp=1.7;
    colA=vec3(.72,.50,1.); colB=vec3(.96,.72,1.);
  } else if(u_mode<2.5){     // PROCESSING — smooth organic thinking pulse
    spin=0.65; freq=2.0; amp=0.88;
    float breathe=0.5+0.5*sin(u_time*1.5);
    float flicker=0.5+0.5*sin(u_time*4.1+0.7);
    audio=0.28+0.20*breathe+0.08*flicker;
    colA=vec3(.22,.78,.94); colB=vec3(.54,.94,1.);
  } else {                    // AI_SPEAKING — fluid waves, playback-driven
    spin=0.45; freq=1.8; amp=1.4;
    colA=vec3(.20,.76,.90); colB=vec3(.50,.96,.82);
  }

  float a=ang+u_time*spin;
  vec2 c1=vec2(cos(a),sin(a));
  vec2 c2=vec2(cos(a*.5),sin(a*.5));

  vec3 col=vec3(0.);
  float alp=0.;

  float n1=snoise(c1*freq+vec2(u_time*.70,0.));
  float r1=.30+n1*.052*(1.+audio*2.2*amp);
  float l1=1.-smoothstep(0.,.018,abs(d-r1));
  col+=colA*l1*(.75+audio*.55); alp+=l1*.90;

  float n2=snoise(c1*(freq*1.25)+vec2(-.4,u_time*.46));
  float r2=.46+n2*.070*(1.+audio*1.7*amp);
  float l2=1.-smoothstep(0.,.022,abs(d-r2));
  col+=colB*l2*(.62+audio*.42); alp+=l2*.78;

  float n3=snoise(c2*(freq*1.55)+vec2(u_time*.27,.6));
  float r3=.61+n3*.090*(1.+audio*1.3*amp);
  float l3=1.-smoothstep(0.,.026,abs(d-r3));
  col+=colA*l3*(.50+audio*.38); alp+=l3*.62;

  float n4=snoise(c1*(freq*1.9)+vec2(1.1,u_time*.16));
  float r4=.77+n4*.11+audio*.09;
  float l4=(1.-smoothstep(0.,.032,abs(d-r4)))*min(1.,audio*1.6);
  col+=colB*l4*.85; alp+=l4*.58;

  float coreR=.17+audio*.045;
  float core=smoothstep(coreR,0.,d);
  col+=mix(colA,colB,.5)*core*(.68+audio*.42); alp+=core*.92;

  float haze=smoothstep(1.,0.,d)*.028;
  col+=colA*haze; alp+=haze*.4;

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
  const wsUrl  = process.env.NEXT_PUBLIC_WS_URL  || "ws://localhost:8000";

  const [sessionId,    setSessionId]    = useState<string | null>(null);
  const [mode,         setModeState]    = useState<SpeakMode>("idle");
  const [statusText,   setStatusText]   = useState("Connecting...");
  const [messages,         setMessages]         = useState<ChatMessage[]>([]);
  const [userText,         setUserText]         = useState("");
  const [sessionEnded,     setSessionEnded]     = useState(false);
  const [captureReady,     setCaptureReady]     = useState(false);
  const [muted,            setMuted]            = useState(false);
  // Word-token rolling subtitle stream
  const [wordTokens,  setWordTokens]  = useState<{ id: number; text: string }[]>([]);
  const tokenIdRef = useRef(0);

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
  const sessionEndedRef  = useRef(false);
  const captureReadyRef  = useRef(false);

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
  useEffect(() => {
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

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s); return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER,   VERT_SHADER));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG_SHADER));
    gl.linkProgram(prog);
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

      // ── VAD: read mic level ──
      const micAnalyser = micAnalyserRef.current;
      let micRms = 0;
      if (micAnalyser) {
        const data = new Uint8Array(micAnalyser.frequencyBinCount);
        micAnalyser.getByteTimeDomainData(data);
        micRms = rmsFromTimeDomain(data);
      }
      micLevelRef.current = micLevelRef.current * 0.80 + micRms * 0.20;
      const mic = micLevelRef.current;

      // ── VAD: read playback (AI) level ──
      const playAnalyser = playAnalyserRef.current;
      let aiRms = 0;
      if (playAnalyser) {
        const data = new Uint8Array(playAnalyser.frequencyBinCount);
        playAnalyser.getByteTimeDomainData(data);
        aiRms = rmsFromTimeDomain(data);
      }
      aiLevelRef.current = aiLevelRef.current * 0.80 + aiRms * 0.20;

      // ── State machine ──
      const m = modeRef.current;
      if (!mutedRef.current) {
        if (m === "idle") {
          if (mic > SPEAK_THRESHOLD) { silenceSinceRef.current = null; setMode("listening"); }
        } else if (m === "listening") {
          if (mic < SILENCE_THRESHOLD) {
            if (silenceSinceRef.current === null) silenceSinceRef.current = now;
            else if (now - silenceSinceRef.current > SILENCE_MS) {
              silenceSinceRef.current = null;
              sendJson({ type: "end_of_speech" });
              setMode("processing");
            }
          } else {
            silenceSinceRef.current = null;
          }
        } else if (m === "ai_speaking") {
          if (mic > INTERRUPT_THRESHOLD) bargeIn();
        }
      }

      // ── Display level for the orb ──
      let display: number;
      if (m === "idle")            display = 0.10 + Math.max(0.08 * (0.5 + 0.5 * Math.sin(t * 1.1)), mic * 4);
      else if (m === "listening")  display = 0.25 + Math.min(0.75, mic * 10);
      else if (m === "processing") display = 0.45 + 0.30 * (0.5 + 0.5 * Math.sin(t * 4.5));
      else                         display = Math.min(1, aiLevelRef.current * 6);
      audioLevelRef.current = audioLevelRef.current * 0.80 + display * 0.20;

      if (uTimeRef.current)  gl.uniform1f(uTimeRef.current, t);
      if (uResRef.current)   gl.uniform2f(uResRef.current, canvas!.width, canvas!.height);
      if (uAudioRef.current) gl.uniform1f(uAudioRef.current, audioLevelRef.current);
      if (uModeRef.current)  gl.uniform1f(uModeRef.current, modeRef.current === "idle" ? 0 : modeRef.current === "listening" ? 1 : modeRef.current === "processing" ? 2 : 3);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);

    return () => { ro.disconnect(); if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Session lifecycle ────────────────────────────────────
  useEffect(() => {
    sessionEndedRef.current = false;
    startSession();
    return () => {
      sessionEndedRef.current = true;
      teardownCapture();
      wsRef.current?.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startSession = async () => {
    try {
      const res = await fetch(`${apiUrl}/speaking/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("start failed");
      const data = await res.json();
      setSessionId(data.session_id);
      connectWebSocket(data.session_id);
    } catch {
      setStatusText("Failed to initialize session");
    }
  };

  const connectWebSocket = (sessId: string) => {
    if (sessionEndedRef.current) return;
    const ws = new WebSocket(`${wsUrl}/ws/speaking/${sessId}?token=${token}`);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    ws.onopen = () => {
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
    ws.onclose = () => {
      if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
      setMode("idle");
      stopPlayback();
      if (!sessionEndedRef.current) {
        setStatusText("Connection lost — reconnecting…");
        setTimeout(() => { if (!sessionEndedRef.current) connectWebSocket(sessId); }, 2000);
      }
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
      // Stream raw PCM upstream only while the user is actively speaking.
      if (modeRef.current !== "listening" || mutedRef.current) return;
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const pcm = toPcm16(new Float32Array(e.inputBuffer.getChannelData(0)), captureCtx.sampleRate);
      if (pcm.length) ws.send(pcm.buffer);
    };
    source.connect(analyser);
    analyser.connect(processor);
    processor.connect(captureCtx.destination);

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
        await fetch(`${apiUrl}/speaking/end?session_id=${sessionId}`, {
          method: "POST", headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* best-effort */ }
    }
    setSessionEnded(true);
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

  // ── Session ended screen ─────────────────────────────────
  if (sessionEnded) {
    return (
      <div className="w-full min-h-[calc(100vh-160px)] flex flex-col bg-[#0A0A0C] border border-[#2A2A32] rounded-xl overflow-hidden animate-fade-in">
        <div className="p-md border-b border-[#2A2A32] bg-[#15151A] flex items-center justify-between">
          <h1 className="text-headline-md font-bold text-on-surface">Session Complete</h1>
          <Button onClick={() => router.push("/dashboard")} variant="outline" className="text-xs py-1 px-3">
            Back to Dashboard
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-md space-y-sm">
          {messages.length === 0 ? (
            <div className="text-center py-xl text-on-surface-variant text-sm">
              No conversation recorded for this session.
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <span className="text-[10px] font-medium text-on-surface-variant mb-1">
                  {msg.role === "user" ? "You" : "AI Coach"}
                </span>
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-[75%] ${
                    msg.role === "user"
                      ? "text-white rounded-tr-sm"
                      : "text-on-surface border border-[#2A2A32] rounded-tl-sm bg-[#15151A]"
                  }`}
                  style={msg.role === "user" ? { background: "linear-gradient(135deg, #6E5BFF 0%, #8B7CFF 100%)" } : {}}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-sm border-t border-[#2A2A32] bg-[#15151A] flex justify-end gap-sm">
          <Button onClick={() => router.push("/speaking")} variant="outline">Practice Again</Button>
          <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  // ── Main immersive speaking view ─────────────────────────
  return (
    <div className="relative w-full h-[calc(100vh-160px)] min-h-[580px] flex flex-col items-center justify-center bg-[#0A0A0C] border border-[#2A2A32] rounded-xl overflow-hidden select-none animate-fade-in">
      <div className="absolute w-[520px] h-[520px] bg-primary/[0.06] rounded-full blur-[140px] pointer-events-none" />

      {/* Top status bar */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-md py-sm z-30 bg-gradient-to-b from-[#0A0A0C]/70 to-transparent pointer-events-none">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
          <span className="text-[11px] text-on-surface-variant font-mono uppercase tracking-wider">{statusLabel}</span>
        </div>
        <span className="text-[12px] text-on-surface-variant/70 font-mono">{statusText}</span>
      </div>

      {/* Orb */}
      <div className="relative flex items-center justify-center" style={{ width: "360px", height: "360px" }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ display: "block" }} />
        <div className="absolute w-24 h-24 rounded-full bg-white/[0.04] blur-2xl pointer-events-none z-10" />
      </div>

      {/* Caption keyframes */}
      <style>{`
        @keyframes wdIn {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes userIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes d1 { 0%,70%,100%{opacity:.12;transform:scale(1)}  25%{opacity:1;transform:scale(1.25)} }
        @keyframes d2 { 0%,70%,100%{opacity:.12;transform:scale(1)}  40%{opacity:1;transform:scale(1.25)} }
        @keyframes d3 { 0%,70%,100%{opacity:.12;transform:scale(1)}  55%{opacity:1;transform:scale(1.25)} }
      `}</style>

      {/* ── Live caption bar ── */}
      <div className="z-20 w-full max-w-[500px] px-4 mt-5">
        <div
          className="relative rounded-2xl border border-white/[0.07] overflow-hidden"
          style={{ background: "rgba(10,10,14,0.72)", backdropFilter: "blur(24px)" }}
        >
          {/* Left accent stripe that changes colour per speaker */}
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

          <div className="pl-5 pr-4 pt-3 pb-3.5 min-h-[76px] flex flex-col justify-center gap-1.5">

            {/* Speaker label */}
            <span
              className="text-[9px] font-extrabold uppercase tracking-[0.18em] transition-colors duration-300"
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
                : captureReady
                ? "Ready"
                : ""}
            </span>

            {/* ── Content ── */}

            {mode === "processing" && wordTokens.length === 0 ? (
              /* Thinking dots */
              <div className="flex items-center gap-[7px]">
                {[1, 2, 3].map((n) => (
                  <span
                    key={n}
                    style={{
                      display: "inline-block",
                      width: 7, height: 7,
                      borderRadius: "50%",
                      background: "#22d3ee",
                      animation: `d${n} 1.35s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>

            ) : wordTokens.length > 0 ? (
              /* Rolling word-by-word AI stream */
              <div
                style={{
                  height: "46px",       // exactly 2 lines at 23px line-height
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                }}
              >
                <p style={{ fontSize: "15px", fontWeight: 500, lineHeight: "23px", color: "rgba(255,255,255,0.92)", wordBreak: "break-word" }}>
                  {wordTokens.map((tok, i) => {
                    const age = wordTokens.length - 1 - i;
                    const op = age === 0 ? 1 : age < 6 ? 1 : age < 14 ? 0.65 : 0.22;
                    const isNew = age === 0;
                    return (
                      <span
                        key={tok.id}
                        style={{
                          opacity: op,
                          ...(isNew ? { animation: "wdIn 0.18s ease-out forwards" } : {}),
                        }}
                      >
                        {tok.text}
                      </span>
                    );
                  })}
                </p>
              </div>

            ) : mode === "listening" || userText ? (
              /* User transcription — slides down from above */
              <div
                style={{
                  height: "46px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                }}
              >
                <p
                  key={userText}
                  style={{
                    fontSize: "15px", fontWeight: 500, lineHeight: "23px",
                    color: "rgba(139,124,255,0.92)",
                    wordBreak: "break-word",
                    animation: userText ? "userIn 0.25s ease-out forwards" : "none",
                  }}
                >
                  {userText || (
                    <span style={{ opacity: 0.35, fontStyle: "italic" }}>Listening…</span>
                  )}
                </p>
              </div>

            ) : captureReady ? (
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>
                Just start talking
              </p>
            ) : (
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>
                Tap below to begin
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Begin overlay (user gesture to satisfy autoplay + mic permission) */}
      {!captureReady && (
        <button
          onClick={beginCapture}
          className="absolute z-40 bottom-16 flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white text-sm font-semibold shadow-[0_0_28px_rgba(110,91,255,0.5)] hover:scale-105 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
          Enable microphone
        </button>
      )}

      {/* Bottom controls */}
      {captureReady && (
        <div className="absolute bottom-10 z-30 flex items-center gap-6 bg-[#14141A]/75 backdrop-blur-md px-8 py-4 rounded-full border border-white/[0.07] shadow-[0_24px_48px_rgba(0,0,0,0.5)]">
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
  );
}

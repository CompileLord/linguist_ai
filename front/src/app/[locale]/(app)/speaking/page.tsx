"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
}

interface Takeaway {
  content: string;
  type: string;
  is_critical: boolean;
  word?: string | null;
  translation?: string | null;
}

interface TakeawaysResult {
  summary: string;
  takeaways: Takeaway[];
}

// ──────────────────────────────────────────────────────────
//  WAVE-LINE RIBBON SHADER
//  4 organic rings that undulate via circular simplex noise.
//  u_audio_level drives distortion amplitude + outer ring visibility.
// ──────────────────────────────────────────────────────────
const FRAG_SHADER = `precision highp float;

varying vec2 v_texCoord;
uniform float u_time;
uniform vec2  u_resolution;
uniform float u_audio_level;

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
  float audio=u_audio_level;

  // Circular basis vectors — keeps noise continuous at ang=±PI
  vec2 c1=vec2(cos(ang),sin(ang));
  vec2 c2=vec2(cos(ang*.5),sin(ang*.5));

  vec3 col=vec3(0.);
  float alp=0.;

  // ── Ring 1: inner, fast, bright ──
  float n1=snoise(c1*1.9+vec2(u_time*.70,0.));
  float r1=.30+n1*.052*(1.+audio*2.2);
  float l1=1.-smoothstep(0.,.018,abs(d-r1));
  col+=vec3(.68,.56,1.)*l1*(.75+audio*.55);
  alp+=l1*.90;

  // ── Ring 2: medium, slightly slower ──
  float n2=snoise(c1*2.3+vec2(-.4,u_time*.46));
  float r2=.46+n2*.070*(1.+audio*1.7);
  float l2=1.-smoothstep(0.,.022,abs(d-r2));
  col+=vec3(.43,.36,1.)*l2*(.62+audio*.42);
  alp+=l2*.78;

  // ── Ring 3: outer, slow, cooler hue ──
  float n3=snoise(c2*2.9+vec2(u_time*.27,.6));
  float r3=.61+n3*.090*(1.+audio*1.3);
  float l3=1.-smoothstep(0.,.026,abs(d-r3));
  col+=vec3(.52,.28,1.)*l3*(.50+audio*.38);
  alp+=l3*.62;

  // ── Ring 4: outermost ripple — appears with audio ──
  float n4=snoise(c1*3.4+vec2(1.1,u_time*.16));
  float r4=.77+n4*.11+audio*.09;
  float l4=(1.-smoothstep(0.,.032,abs(d-r4)))*min(1.,audio*1.6);
  col+=vec3(.72,.44,1.)*l4*.85;
  alp+=l4*.58;

  // ── Core white-purple glow ──
  float coreR=.17+audio*.045;
  float core=smoothstep(coreR,0.,d);
  col+=vec3(.88,.82,1.)*core*(.68+audio*.42);
  alp+=core*.92;

  // ── Soft ambient haze ──
  float haze=smoothstep(1.,0.,d)*.028;
  col+=vec3(.43,.36,1.)*haze;
  alp+=haze*.4;

  gl_FragColor=vec4(col,clamp(alp,0.,1.));
}`;

const VERT_SHADER = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main(){
  v_texCoord=a_position*.5+.5;
  gl_Position=vec4(a_position,0.,1.);
}`;

// ──────────────────────────────────────────────────────────
export default function SpeakingPage() {
  const router = useRouter();
  const token = useSelector((state: RootState) => state.auth.token);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
  const wsUrl  = process.env.NEXT_PUBLIC_WS_URL  || "ws://localhost:8000";

  const [sessionId,          setSessionId]          = useState<string | null>(null);
  const [isRecording,        setIsRecording]        = useState(false);
  const [statusText,         setStatusText]         = useState("Connecting...");
  const [messages,           setMessages]           = useState<ChatMessage[]>([]);
  const [aiStreamText,       setAiStreamText]       = useState("");
  const [remainingTime,      setRemainingTime]      = useState("5:00");
  const [takeawaysResult,    setTakeawaysResult]    = useState<TakeawaysResult | null>(null);
  const [isLoadingTakeaways, setIsLoadingTakeaways] = useState(false);
  const [sessionEnded,       setSessionEnded]       = useState(false);

  const wsRef               = useRef<WebSocket | null>(null);
  const audioContextRef     = useRef<AudioContext | null>(null);
  const mediaStreamRef      = useRef<MediaStream | null>(null);
  const processorRef        = useRef<ScriptProcessorNode | null>(null);
  const audioInputRef       = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef         = useRef<AnalyserNode | null>(null);
  const recordingBuffersRef = useRef<Float32Array[]>([]);
  const aiStreamRef         = useRef("");
  const messagesRef         = useRef<ChatMessage[]>([]);

  // WebGL
  const canvasRef     = useRef<HTMLCanvasElement | null>(null);
  const glRef         = useRef<WebGLRenderingContext | null>(null);
  const uTimeRef      = useRef<WebGLUniformLocation | null>(null);
  const uResRef       = useRef<WebGLUniformLocation | null>(null);
  const uAudioRef     = useRef<WebGLUniformLocation | null>(null);
  const rafRef        = useRef<number | null>(null);
  const audioLevelRef = useRef(0);
  const startTimeRef  = useRef<number | null>(null);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // ── WebGL setup ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const syncSize = () => {
      const w = canvas.clientWidth  || 360;
      const h = canvas.clientHeight || 360;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    };

    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);
    syncSize();

    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return;
    glRef.current = gl;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
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
    uAudioRef.current = gl.getUniformLocation(prog, "u_audio_level");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    startTimeRef.current = performance.now();

    const frame = (now: number) => {
      const t = (now - (startTimeRef.current ?? now)) / 1000;
      syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) { const n = (v - 128) / 128; sum += n * n; }
        const rms = Math.sqrt(sum / data.length);
        audioLevelRef.current = audioLevelRef.current * 0.85 + rms * 0.15;
      } else {
        audioLevelRef.current *= 0.95;
      }

      if (uTimeRef.current)  gl.uniform1f(uTimeRef.current, t);
      if (uResRef.current)   gl.uniform2f(uResRef.current, canvas.width, canvas.height);
      if (uAudioRef.current) gl.uniform1f(uAudioRef.current, Math.min(1.0, audioLevelRef.current * 4));

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      ro.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Session lifecycle ─────────────────────────────────────
  useEffect(() => {
    startSession();
    return () => { cleanupAudio(); if (wsRef.current) wsRef.current.close(); };
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
    const ws = new WebSocket(`${wsUrl}/ws/speaking/${sessId}?token=${token}`);
    wsRef.current = ws;
    ws.onopen = () => setStatusText("Ready to speak");
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "transcription") {
        setMessages((prev) => [...prev, { id: Math.random().toString(), role: "user", content: msg.content }]);
        setStatusText("AI is thinking...");
      } else if (msg.type === "chunk") {
        aiStreamRef.current += msg.content;
        setAiStreamText(aiStreamRef.current);
      } else if (msg.type === "audio") {
        new Audio(`data:audio/wav;base64,${msg.data}`).play().catch(() => {});
      } else if (msg.type === "done") {
        setMessages((prev) => [...prev, { id: Math.random().toString(), role: "ai", content: aiStreamRef.current }]);
        aiStreamRef.current = "";
        setAiStreamText("");
        setStatusText("Ready to speak");
      } else if (msg.type === "error") {
        setStatusText(`Error: ${msg.content}`);
      }
    };
    ws.onclose = () => setStatusText("Disconnected");
    ws.onerror = (err) => console.error("WS error", err);
  };

  // ── Recording ─────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      audioInputRef.current = ctx.createMediaStreamSource(stream);
      processorRef.current  = ctx.createScriptProcessor(4096, 1, 1);
      recordingBuffersRef.current = [];
      processorRef.current.onaudioprocess = (e) => {
        recordingBuffersRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      audioInputRef.current.connect(analyser);
      analyser.connect(processorRef.current);
      processorRef.current.connect(ctx.destination);
      setIsRecording(true);
      setStatusText("Listening...");
    } catch {
      setStatusText("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    setStatusText("Processing speech...");
    analyserRef.current = null;
    cleanupAudio();
    const merged = mergeBuffers(recordingBuffersRef.current);
    const b64    = arrayBufferToBase64(encodeWAV(merged, 16000));
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify({ type: "audio", data: b64 }));
  };

  const cleanupAudio = () => {
    processorRef.current?.disconnect();   processorRef.current  = null;
    audioInputRef.current?.disconnect();  audioInputRef.current = null;
    audioContextRef.current?.close();     audioContextRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  };

  const mergeBuffers = (buffers: Float32Array[]) => {
    const total = buffers.reduce((s, b) => s + b.length, 0);
    const out   = new Float32Array(total);
    let offset  = 0;
    for (const b of buffers) { out.set(b, offset); offset += b.length; }
    return out;
  };

  const encodeWAV = (samples: Float32Array, sr: number) => {
    const buf  = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buf);
    const ws   = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
    ws(0,"RIFF"); view.setUint32(4,36+samples.length*2,true); ws(8,"WAVE");
    ws(12,"fmt "); view.setUint32(16,16,true); view.setUint16(20,1,true);
    view.setUint16(22,1,true); view.setUint32(24,sr,true);
    view.setUint32(28,sr*2,true); view.setUint16(32,2,true);
    view.setUint16(34,16,true); ws(36,"data"); view.setUint32(40,samples.length*2,true);
    let off = 44;
    for (const s of Array.from(samples)) {
      const c = Math.max(-1,Math.min(1,s));
      view.setInt16(off, c < 0 ? c*0x8000 : c*0x7fff, true); off += 2;
    }
    return buf;
  };

  const arrayBufferToBase64 = (buf: ArrayBuffer) => {
    let b = ""; const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) b += String.fromCharCode(bytes[i]);
    return window.btoa(b);
  };

  // ── End session + takeaways ───────────────────────────────
  const endSession = async () => {
    cleanupAudio();
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (sessionId) {
      try {
        await fetch(`${apiUrl}/speaking/end?session_id=${sessionId}`, {
          method: "POST", headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* best-effort */ }
    }
    const msgs = messagesRef.current;
    if (msgs.length > 0) {
      setSessionEnded(true);
      setIsLoadingTakeaways(true);
      try {
        const res = await fetch(`${apiUrl}/speaking/takeaways`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ transcript: msgs.map((m) => ({ role: m.role, content: m.content })) }),
        });
        if (res.ok) setTakeawaysResult(await res.json());
      } catch { /* ignore */ } finally {
        setIsLoadingTakeaways(false);
      }
    } else {
      router.push("/dashboard");
    }
  };

  // ── Helpers ───────────────────────────────────────────────
  const typeIcon  = (t: string) => t === "vocabulary" ? "translate" : t === "grammar" ? "spellcheck" : "lightbulb";
  const typeColor = (t: string) =>
    t === "vocabulary" ? "text-primary border-primary/30 bg-primary/10"
    : t === "grammar"  ? "text-warning border-warning/30 bg-warning/10"
    : "text-success border-success/30 bg-success/10";

  const statusDot =
    statusText === "Listening..."   ? "bg-error animate-pulse" :
    statusText === "Ready to speak" ? "bg-success" : "bg-warning animate-pulse";

  const lastMsg = messages[messages.length - 1];

  // ── Takeaways screen (unchanged) ─────────────────────────
  if (sessionEnded) {
    return (
      <div className="w-full min-h-[calc(100vh-160px)] flex flex-col bg-[#0A0A0C] border border-[#2A2A32] rounded-xl overflow-hidden animate-fade-in">
        <div className="p-md border-b border-[#2A2A32] bg-[#15151A] flex items-center justify-between">
          <h1 className="text-headline-md font-bold text-on-surface">Session Complete</h1>
          <Button onClick={() => router.push("/dashboard")} variant="outline" className="text-xs py-1 px-3">
            Back to Dashboard
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-md space-y-md">
          {isLoadingTakeaways ? (
            <div className="flex flex-col items-center justify-center gap-sm py-xl">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-on-surface-variant text-sm">Generating your session insights...</p>
            </div>
          ) : takeawaysResult ? (
            <>
              <div className="bg-[#15151A] border border-[#2A2A32] rounded-xl p-md">
                <div className="flex items-center gap-xs mb-sm">
                  <span className="material-symbols-outlined text-primary text-sm">summarize</span>
                  <span className="text-label-md font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">
                    Session Summary
                  </span>
                </div>
                <p className="text-body-md text-on-surface leading-relaxed">{takeawaysResult.summary}</p>
              </div>

              <div>
                <h3 className="text-label-md font-bold text-on-surface-variant uppercase tracking-wider text-[10px] mb-sm">
                  Key Takeaways
                </h3>
                <div className="space-y-sm">
                  {takeawaysResult.takeaways.map((tk, i) => (
                    <div
                      key={i}
                      className={`border rounded-xl p-sm flex items-start gap-sm ${tk.is_critical ? "border-warning/30 bg-warning/5" : "border-[#2A2A32] bg-[#15151A]"}`}
                    >
                      <div className={`p-1 rounded border shrink-0 ${typeColor(tk.type)}`}>
                        <span className="material-symbols-outlined text-[16px]">{typeIcon(tk.type)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-xs mb-0.5 flex-wrap">
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${typeColor(tk.type)}`}>
                            {tk.type}
                          </span>
                          {tk.is_critical && (
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border text-warning border-warning/30 bg-warning/10 flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[10px]">bookmark</span>
                              saved to review
                            </span>
                          )}
                        </div>
                        <p className="text-body-sm text-on-surface">{tk.content}</p>
                        {tk.word && tk.translation && (
                          <p className="text-[11px] text-on-surface-variant mt-0.5 font-mono">
                            {tk.word} → {tk.translation}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-xl text-on-surface-variant text-sm">
              No insights available for this session.
            </div>
          )}
        </div>

        <div className="p-sm border-t border-[#2A2A32] bg-[#15151A] flex justify-end gap-sm">
          <Button onClick={() => router.push("/speaking")} variant="outline">Practice Again</Button>
          <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  // ── Main immersive speaking view ──────────────────────────
  return (
    <div className="relative w-full h-[calc(100vh-160px)] min-h-[580px] flex flex-col items-center justify-center bg-[#0A0A0C] border border-[#2A2A32] rounded-xl overflow-hidden select-none animate-fade-in">

      {/* Wide ambient background glow */}
      <div className="absolute w-[520px] h-[520px] bg-primary/[0.06] rounded-full blur-[140px] pointer-events-none" />

      {/* ── Top status bar ── */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-md py-sm z-30 bg-gradient-to-b from-[#0A0A0C]/70 to-transparent pointer-events-none">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
          <span className="text-[11px] text-on-surface-variant font-mono uppercase tracking-wider">{statusText}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-warning font-medium pointer-events-auto">
          <span className="material-symbols-outlined text-sm">schedule</span>
          <span className="tabular-nums">{remainingTime} left</span>
        </div>
      </div>

      {/* ── WebGL shader canvas (wave-line ribbons) ── */}
      <div className="relative flex items-center justify-center" style={{ width: "360px", height: "360px" }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ display: "block" }}
        />
        {/* Core white glow overlay */}
        <div className="absolute w-24 h-24 rounded-full bg-white/[0.04] blur-2xl pointer-events-none z-10" />
      </div>

      {/* ── Last message / streaming text below canvas ── */}
      <div className="z-20 max-w-[300px] text-center px-md mt-5 min-h-[54px] flex items-start justify-center">
        {aiStreamText ? (
          <p className="text-sm text-on-surface/80 leading-relaxed line-clamp-2">
            {aiStreamText}
            <span className="inline-block w-0.5 h-3 ml-0.5 bg-primary animate-pulse rounded-sm align-middle" />
          </p>
        ) : lastMsg ? (
          <p className={`text-sm leading-relaxed line-clamp-2 ${lastMsg.role === "user" ? "text-primary/80" : "text-on-surface/70"}`}>
            <span className="font-bold text-[10px] uppercase tracking-wider opacity-50 mr-1">
              {lastMsg.role === "user" ? "You" : "AI"}
            </span>
            {lastMsg.content}
          </p>
        ) : (
          <p className="text-xs text-on-surface-variant/40 italic">Tap the mic to start speaking…</p>
        )}
      </div>

      {/* ── Floating glassmorphic controls pill ── */}
      <div className="absolute bottom-10 z-30 flex items-center gap-6 bg-[#14141A]/75 backdrop-blur-md px-8 py-4 rounded-full border border-white/[0.07] shadow-[0_24px_48px_rgba(0,0,0,0.5)]">

        {/* Mic button — spinning arc halo when user is recording */}
        <div className="relative" style={{ width: 56, height: 56 }}>
          {isRecording && (
            /* Sweeping arc that circles the mic button */
            <div
              className="absolute rounded-full animate-spin pointer-events-none"
              style={{
                inset: "-4px",
                animationDuration: "2s",
                background: "conic-gradient(from 0deg, rgba(110,91,255,0) 0%, rgba(110,91,255,0.75) 45%, rgba(110,91,255,0) 60%)",
              }}
            />
          )}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            className={`absolute inset-0 rounded-full flex items-center justify-center z-10 transition-all duration-300 ${
              isRecording
                ? "bg-primary shadow-[0_0_26px_rgba(110,91,255,0.6)] scale-105"
                : "bg-[#1E1E24] border border-[#2A2A32] hover:border-primary/50 hover:bg-primary/10"
            }`}
          >
            <span
              className="material-symbols-outlined text-[22px] text-white"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {isRecording ? "stop" : "mic"}
            </span>
          </button>
        </div>

        {/* End session button */}
        <button
          onClick={endSession}
          aria-label="End session"
          className="w-14 h-14 rounded-full flex items-center justify-center bg-error/10 border border-error/30 text-error hover:bg-error/20 hover:border-error/60 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <span className="material-symbols-outlined text-[22px]">call_end</span>
        </button>
      </div>
    </div>
  );
}

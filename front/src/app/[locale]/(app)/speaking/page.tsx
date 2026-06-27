"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";

export default function SpeakingPage() {
  const router = useRouter();
  const token = useSelector((state: RootState) => state.auth.token);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [statusText, setStatusText] = useState("Connecting...");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [remainingTime, setRemainingTime] = useState("5:00");
  const [aiText, setAiText] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioInputRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const recordingBuffersRef = useRef<Float32Array[]>([]);

  useEffect(() => {
    startSession();
    return () => {
      cleanupAudio();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const startSession = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/speaking/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Failed to start speaking session");
      }
      const data = await res.json();
      setSessionId(data.session_id);
      connectWebSocket(data.session_id);
    } catch (err) {
      setStatusText("Failed to initialize session");
      console.error(err);
    }
  };

  const connectWebSocket = (sessId: string) => {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"}/ws/speaking/${sessId}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatusText("Ready to speak");
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "transcription") {
        setTranscript((prev) => [...prev, `You: ${msg.content}`]);
        setStatusText("AI is thinking...");
      } else if (msg.type === "chunk") {
        setAiText((prev) => prev + msg.content);
      } else if (msg.type === "audio") {
        playWavAudio(msg.data);
      } else if (msg.type === "done") {
        setStatusText("Ready to speak");
        setTranscript((prev) => [...prev, `AI: ${aiText}`]);
        setAiText("");
      } else if (msg.type === "error") {
        setStatusText(`Error: ${msg.content}`);
      }
    };

    ws.onclose = () => {
      setStatusText("Disconnected");
    };

    ws.onerror = (err) => {
      console.error("WS error", err);
    };
  };

  const playWavAudio = (base64Data: string) => {
    const audio = new Audio(`data:audio/wav;base64,${base64Data}`);
    audio.play().catch((err) => console.error("Playback failed", err));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      audioInputRef.current = audioContext.createMediaStreamSource(stream);
      processorRef.current = audioContext.createScriptProcessor(4096, 1, 1);
      recordingBuffersRef.current = [];

      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        recordingBuffersRef.current.push(new Float32Array(inputData));
      };

      audioInputRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContext.destination);

      setIsRecording(true);
      setStatusText("Listening...");
    } catch (err) {
      console.error("Recording error", err);
      setStatusText("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    setStatusText("Processing speech...");

    cleanupAudio();

    const mergedBuffer = mergeBuffers(recordingBuffersRef.current);
    const wavBytes = encodeWAV(mergedBuffer, 16000);
    const base64Wav = arrayBufferToBase64(wavBytes);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "audio", data: base64Wav }));
    }
  };

  const cleanupAudio = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioInputRef.current) {
      audioInputRef.current.disconnect();
      audioInputRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const mergeBuffers = (buffers: Float32Array[]) => {
    let totalLength = 0;
    for (const buf of buffers) {
      totalLength += buf.length;
    }
    const result = new Float32Array(totalLength);
    let offset = 0;
    for (const buf of buffers) {
      result.set(buf, offset);
      offset += buf.length;
    }
    return result;
  };

  const encodeWAV = (samples: Float32Array, sampleRate: number) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return buffer;
  };

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const endSession = async () => {
    if (!sessionId) {
      router.push("/dashboard");
      return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/speaking/end?session_id=${sessionId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        console.log("Ended speaking session, earned:", data.xp_earned);
      }
    } catch (err) {
      console.error(err);
    }
    router.push("/dashboard");
  };

  return (
    <div className="w-full h-[calc(100vh-160px)] min-h-[500px] flex flex-col relative overflow-hidden font-body-md antialiased select-none rounded-xl border border-[#2A2A32] bg-background">
      <header className="absolute top-0 w-full flex justify-end p-lg md:p-xl z-30">
        <div className="flex items-center gap-xs">
          <span className="material-symbols-outlined text-[16px] text-warning font-light">schedule</span>
          <span className="font-label-md text-label-md text-warning font-medium">
            <span className="tabular-nums">{remainingTime}</span> left today
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative z-10 w-full h-full">
        <div className="absolute w-72 h-72 md:w-96 md:h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen animate-pulse"></div>

        <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden border border-primary/30 z-20 transition-all duration-700 ease-out hover:scale-[1.04] shadow-[0_0_60px_rgba(110,91,255,0.15)] flex items-center justify-center bg-surface">
          <div className={`w-48 h-48 rounded-full bg-gradient-to-tr from-primary to-[#8B7CFF] opacity-80 flex items-center justify-center ${isRecording ? "animate-ping" : "animate-pulse"}`}>
            <span className="material-symbols-outlined text-white text-[64px]">{isRecording ? "settings_voice" : "graphic_eq"}</span>
          </div>
        </div>

        <div className="absolute bottom-1/4 md:bottom-1/3 flex flex-col items-center gap-xs mt-6">
          <h1 className="font-headline-md text-headline-md text-on-surface tracking-wide">{statusText}</h1>
          {aiText && (
            <p className="max-w-[400px] text-center text-on-surface-variant italic text-sm mt-2">
              &ldquo;{aiText}&rdquo;
            </p>
          )}
        </div>
      </main>

      <footer className="w-full flex flex-col items-center pb-xl z-30 relative bg-[#0A0A0C]/80 backdrop-blur-md border-t border-[#2A2A32] py-6">
        <div className="flex items-center gap-md mb-lg">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? "primary" : "outline"}
            className="w-16 h-16 rounded-full flex items-center justify-center group shadow-sm"
          >
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isRecording ? "stop" : "mic"}
            </span>
          </Button>

          <Button
            onClick={endSession}
            variant="outline"
            className="w-16 h-16 rounded-full flex items-center justify-center text-error border-error/30 hover:bg-error/10 hover:border-error transition-[transform,colors] duration-200"
          >
            <span className="material-symbols-outlined text-[24px]">call_end</span>
          </Button>
        </div>

        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="flex items-center gap-xs text-on-surface-variant hover:text-on-surface transition-colors font-label-md text-label-md group focus:outline-none"
        >
          {showTranscript ? "Hide transcript" : "Show transcript"}
          <span className="material-symbols-outlined text-[18px]">
            {showTranscript ? "keyboard_arrow_down" : "keyboard_arrow_up"}
          </span>
        </button>

        {showTranscript && (
          <div className="w-full max-w-[600px] mt-md max-h-[150px] overflow-y-auto bg-surface-container border border-[#2A2A32] rounded-lg p-sm scrollbar-thin">
            {transcript.map((line, idx) => (
              <p key={idx} className="text-body-sm text-on-surface-variant mb-xs">
                {line}
              </p>
            ))}
          </div>
        )}
      </footer>
    </div>
  );
}

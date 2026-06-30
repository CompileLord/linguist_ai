"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link, useRouter as useIntlRouter } from "@/i18n/navigation";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import {
  useStartMissionMutation,
  useCompleteMissionMutation,
  useGetMissionsQuery,
} from "@/services/missionsApi";
import { useTranslateTextMutation } from "@/services/tutorApi";
import { useGetProfileQuery } from "@/services/onboardingApi";
import { clearStoredAuth } from "@/lib/authReset";
import { getWsBaseUrl } from "@/lib/wsUrl";

/* ─────────────── Types ─────────────── */
interface ParsedCorrection { wrong: string; correct: string; reason: string; }
interface Message {
  id: string; role: "ai" | "user"; text: string;
  fromVoice?: boolean;
  userWordCount?: number;
}

/* ─────────────── Constants ─────────────── */
const CEFR_HEX: Record<string, string> = {
  A1: "#22c55e", A2: "#14b8a6", B1: "#3b82f6",
  B2: "#8B7CFF", C1: "#f97316", C2: "#ef4444",
};
const STEPS = ["Start", "Practice", "Complete"];
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const LANG_NAMES: Record<string, string> = {
  en: "English", ru: "Russian", tg: "Tajik", es: "Spanish",
  fr: "French", de: "German", uk: "Ukrainian", ar: "Arabic",
  zh: "Chinese", hi: "Hindi", tr: "Turkish",
};
const VAD_SILENCE_THRESHOLD = 0.018;
const VAD_SILENCE_MS = 800;
const VAD_POLL_MS = 50;

let idCounter = 0;
const newId = () => `m${Date.now()}_${idCounter++}`;

/* ─────────────── Memory ─────────────── */
interface MissionMemory {
  level: string; title: string; attempts: number;
  totalExchanges: number; mistakes: string[]; lastSeen: number;
}
function loadMemory(id: string): MissionMemory | null {
  if (typeof window === "undefined") return null;
  try { const r = localStorage.getItem(`mission_memory_${id}`); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function saveMemory(id: string, mem: MissionMemory) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(`mission_memory_${id}`, JSON.stringify(mem)); } catch { /* quota */ }
}

/* ─────────────── Correction parsing ─────────────── */
function parseCorrectionBlocks(text: string): { cleanText: string; corrections: ParsedCorrection[] } {
  const corrections: ParsedCorrection[] = [];
  const cleanText = text
    .replace(/\[Correction:\s*([^\]]+?)\]/gi, (_, content: string) => {
      const m = content.match(/instead of\s+['"'""](.+?)['"'""]\s+write\s+['"'""](.+?)['"'""]\s*(?:[—–\-]\s*(.+))?/i);
      if (m) corrections.push({ wrong: m[1], correct: m[2], reason: (m[3] ?? "").trim() });
      return "";
    })
    .replace(/  +/g, " ").trim();
  return { cleanText, corrections };
}
function extractCorrections(text: string): string[] {
  const out: string[] = [];
  const re = /\[Correction:\s*([^\]]+)\]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[1].trim());
  return out;
}

/* ─────────────── Markdown ─────────────── */
const MD_COMPONENTS: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold" style={{ color: "rgba(255,255,255,0.95)" }}>{children}</strong>,
  em: ({ children }) => <em className="italic" style={{ color: "#B0A3FF" }}>{children}</em>,
  code: ({ children, className }) => {
    if ((className ?? "").includes("language-")) {
      return (
        <pre className="my-2 p-3 rounded-lg overflow-x-auto" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <code className="text-[13px] font-mono" style={{ color: "#B0A3FF" }}>{children}</code>
        </pre>
      );
    }
    return <code className="px-1.5 py-0.5 rounded text-[13px] font-mono" style={{ background: "rgba(110,91,255,0.15)", color: "#B0A3FF" }}>{children}</code>;
  },
  ul: ({ children }) => <ul className="list-disc pl-5 space-y-0.5 my-1.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-0.5 my-1.5">{children}</ol>,
  li: ({ children }) => <li style={{ color: "rgba(255,255,255,0.8)" }}>{children}</li>,
  blockquote: ({ children }) => <blockquote className="pl-3 my-2 italic" style={{ borderLeft: "2px solid rgba(110,91,255,0.5)", color: "rgba(255,255,255,0.55)" }}>{children}</blockquote>,
  h1: ({ children }) => <h1 className="text-base font-bold mb-1 mt-2 first:mt-0" style={{ color: "rgba(255,255,255,0.9)" }}>{children}</h1>,
  h2: ({ children }) => <h2 className="text-[15px] font-semibold mb-1 mt-2 first:mt-0" style={{ color: "rgba(255,255,255,0.85)" }}>{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0" style={{ color: "rgba(255,255,255,0.8)" }}>{children}</h3>,
  a: ({ children, href }) => <a href={href} className="underline" style={{ color: "#8B7CFF" }} target="_blank" rel="noopener noreferrer">{children}</a>,
  table: ({ children }) => <div className="my-2 overflow-x-auto"><table className="w-full text-[13px] border-collapse">{children}</table></div>,
  th: ({ children }) => <th className="px-2 py-1 text-left text-sm font-semibold" style={{ border: "1px solid #2A2A32", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.85)" }}>{children}</th>,
  td: ({ children }) => <td className="px-2 py-1 text-sm" style={{ border: "1px solid #2A2A32", color: "rgba(255,255,255,0.7)" }}>{children}</td>,
};
const MissionMarkdown = memo(function MissionMarkdown({ content }: { content: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>{content}</ReactMarkdown>;
});

/* ─────────────── Sub-components ─────────────── */
function CorrectionAnnotation({ correction }: { correction: ParsedCorrection }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }}
      style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: 12, padding: "6px 10px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}
    >
      <span style={{ fontFamily: "monospace", color: "#ef4444", textDecoration: "line-through" }}>{correction.wrong}</span>
      <span style={{ color: "rgba(255,255,255,0.3)" }}>→</span>
      <span style={{ fontFamily: "monospace", color: "#34d399", fontWeight: 600 }}>{correction.correct}</span>
      {correction.reason && <span style={{ color: "rgba(255,255,255,0.4)", fontStyle: "italic", marginLeft: 2 }}>{correction.reason}</span>}
    </motion.div>
  );
}

function WaveformDots({ color = "#8B7CFF" }: { color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {[0, 1, 2, 3].map((i) => (
        <motion.div key={i} style={{ width: 3, borderRadius: 9999, backgroundColor: color }}
          animate={{ height: ["4px", "14px", "4px"] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }} />
      ))}
    </div>
  );
}

function AiAvatar({ accentHex, size = 28, pulse = false }: { accentHex: string; size?: number; pulse?: boolean }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {pulse && <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: accentHex, opacity: 0.22, borderRadius: "50%" }} />}
      <div style={{
        position: "relative", width: size, height: size, borderRadius: "50%",
        background: `linear-gradient(135deg, ${accentHex}22 0%, ${accentHex}0d 100%)`,
        border: `1px solid ${accentHex}50`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: size * 0.48, color: accentHex, fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
      </div>
    </div>
  );
}

/* ─────────────── Action bar (hover-only via CSS) ─────────────── */
function ActionBar({
  isAi, accentHex, onListen, isPlaying,
  onTranslate, isTranslating, hasTranslation,
  onCopy, copied, onRegenerate,
}: {
  isAi: boolean; accentHex: string;
  onListen: () => void; isPlaying: boolean;
  onTranslate: () => void; isTranslating: boolean; hasTranslation: boolean;
  onCopy: () => void; copied: boolean;
  onRegenerate?: () => void;
}) {
  const btn: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 8,
    border: "none", background: "transparent", cursor: "pointer", fontSize: 11,
    color: "rgba(255,255,255,0.3)", transition: "all 0.15s",
  };
  return (
    <div className="msg-actions" style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 4, justifyContent: isAi ? "flex-start" : "flex-end" }}>
      <button onClick={onListen} style={{ ...btn, ...(isPlaying ? { color: accentHex } : {}) }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.65)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = isPlaying ? accentHex : "rgba(255,255,255,0.3)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: isPlaying ? "'FILL' 1" : "'FILL' 0" }}>{isPlaying ? "stop_circle" : "volume_up"}</span>
        <span>{isPlaying ? "Stop" : "Listen"}</span>
      </button>
      <button onClick={onTranslate} disabled={isTranslating} style={{ ...btn, ...(hasTranslation ? { color: accentHex } : {}) }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.65)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = hasTranslation ? accentHex : "rgba(255,255,255,0.3)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14, ...(isTranslating ? { animation: "spin 1s linear infinite" } : {}), fontVariationSettings: hasTranslation ? "'FILL' 1" : "'FILL' 0" }}>{isTranslating ? "sync" : "translate"}</span>
        <span>{isTranslating ? "…" : hasTranslation ? "Hide" : "Translate"}</span>
      </button>
      <button onClick={onCopy} style={btn}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.65)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: copied ? "'FILL' 1" : "'FILL' 0" }}>{copied ? "check" : "content_copy"}</span>
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
      {isAi && onRegenerate && (
        <button onClick={onRegenerate} style={btn}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.65)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>
          <span>Regenerate</span>
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                  */
/* ═══════════════════════════════════════════════════════════ */
export default function ActiveMissionPage() {
  const params = useParams();
  const intlRouter = useIntlRouter();
  const missionId = params.id as string;

  const token = useSelector((s: RootState) => s.auth.token);
  const { data: missions } = useGetMissionsQuery();
  const { data: profile } = useGetProfileQuery();
  const [translateText] = useTranslateTextMutation();

  const mission = missions?.find((m) => m.id === missionId);
  const accentHex = CEFR_HEX[mission?.cefr_level_min ?? ""] ?? "#6E5BFF";
  const missionTitle = mission?.title ?? "Mission";
  const userLevel = profile?.current_level ?? mission?.cefr_level_min ?? "A1";
  const nativeLang = LANG_NAMES[profile?.native_language_code ?? ""] ?? "Russian";

  /* ── State ── */
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [wsStatus, setWsStatus] = useState<"connecting" | "ready" | "lost" | "disconnected">("connecting");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [continuous, setContinuous] = useState(false);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [translationMap, setTranslationMap] = useState<Record<string, string>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [returningHint, setReturningHint] = useState<MissionMemory | null>(null);

  /* ── Refs ── */
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastUserMsgRef = useRef("");
  const lastUserWordCountRef = useRef(0);
  const continuousRef = useRef(false);
  const startRecordingRef = useRef<() => void>(() => {});
  const voiceInputRef = useRef(false);
  const handleListenRef = useRef<(id: string, text: string) => Promise<void>>(async () => {});
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const wsSessionIdRef = useRef<string | null>(null);
  const unmountedRef = useRef(false);
  const wsSttRef = useRef<WebSocket | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const vadContextRef = useRef<AudioContext | null>(null);
  const vadAnalyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceStartRef = useRef<number | null>(null);

  const [startMission] = useStartMissionMutation();
  const [completeMission] = useCompleteMissionMutation();
  const attemptIdRef = useRef<string | null>(null);
  const hasStartedRef = useRef(false);

  const getAuthToken = useCallback(
    () => token ?? (typeof window !== "undefined" ? localStorage.getItem("access_token") : null),
    [token],
  );

  const aiTurns = messages.filter((m) => m.role === "ai").length;
  const currentStep = aiTurns >= 5 ? 2 : aiTurns >= 3 ? 1 : 0;

  /* ── Memory ── */
  useEffect(() => {
    if (!missionId) return;
    const mem = loadMemory(missionId);
    if (mem && (mem.totalExchanges > 0 || mem.mistakes.length > 0)) setReturningHint(mem);
  }, [missionId]);

  useEffect(() => {
    if (!messages.length) return;
    const prev = loadMemory(missionId);
    const newMistakes = messages.filter((m) => m.role === "ai").flatMap((m) => extractCorrections(m.text));
    const merged = Array.from(new Set([...(prev?.mistakes ?? []), ...newMistakes])).slice(-25);
    const userTurns = messages.filter((m) => m.role === "user").length;
    saveMemory(missionId, {
      level: String(userLevel), title: missionTitle,
      attempts: prev?.attempts ?? 1,
      totalExchanges: Math.max(prev?.totalExchanges ?? 0, userTurns),
      mistakes: merged, lastSeen: Date.now(),
    });
  }, [messages, missionId, missionTitle, userLevel]);

  /* ── STT helpers ── */
  const closeSttWs = () => {
    if (wsSttRef.current) { try { wsSttRef.current.close(); } catch { /* ignore */ } wsSttRef.current = null; }
  };
  const teardownVad = useCallback(() => {
    if (vadIntervalRef.current) { clearInterval(vadIntervalRef.current); vadIntervalRef.current = null; }
    vadAnalyserRef.current = null;
    silenceStartRef.current = null;
    if (vadContextRef.current) { vadContextRef.current.close().catch(() => {}); vadContextRef.current = null; }
  }, []);
  const teardownRecording = useCallback(() => {
    teardownVad();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null; mediaRecRef.current = null; audioChunksRef.current = [];
  }, [teardownVad]);

  /* ── Tutor WS: connect with heartbeat + reconnect ── */
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    unmountedRef.current = false;

    const prev = loadMemory(missionId);
    if (prev) saveMemory(missionId, { ...prev, attempts: prev.attempts + 1, lastSeen: Date.now() });

    const connectWs = (sessionId: string) => {
      if (unmountedRef.current) return;
      const authToken = getAuthToken();
      if (!authToken) { setWsStatus("lost"); return; }

      const wsUrl = `${getWsBaseUrl()}/ws/tutor/${sessionId}?token=${authToken}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmountedRef.current) { ws.close(); return; }
        setWsStatus("ready");
        // Only refresh the retry budget once the socket has stayed open a few
        // seconds. Resetting immediately would let an accept-then-close server
        // error (e.g. a 4004) reset the counter every cycle and loop forever.
        if (stableTimerRef.current) clearTimeout(stableTimerRef.current);
        stableTimerRef.current = setTimeout(() => { reconnectAttemptsRef.current = 0; }, 3000);
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        heartbeatRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: "ping" }));
        }, 25000);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "pong") return;
          if (msg.type === "chunk") {
            streamRef.current += msg.content || "";
            setStreamingText(streamRef.current);
          } else if (msg.type === "done") {
            const fullText = (streamRef.current + (msg.content || "")).trim();
            streamRef.current = ""; setStreamingText("");
            if (fullText) {
              const msgId = newId();
              const shouldAutoPlay = voiceInputRef.current;
              const wordCount = lastUserWordCountRef.current;
              voiceInputRef.current = false;
              setMessages((p) => [...p, { id: msgId, role: "ai", text: fullText, userWordCount: wordCount }]);
              setIsGenerating(false);
              if (shouldAutoPlay) setTimeout(() => handleListenRef.current(msgId, fullText), 250);
            } else { setIsGenerating(false); }
            if (continuousRef.current) setTimeout(() => startRecordingRef.current(), 350);
          } else if (msg.type === "error") {
            streamRef.current = ""; setStreamingText(""); setIsGenerating(false);
          }
        } catch { /* ignore non-JSON */ }
      };

      ws.onerror = () => {}; // onclose fires automatically after error

      ws.onclose = (event) => {
        if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
        if (stableTimerRef.current) { clearTimeout(stableTimerRef.current); stableTimerRef.current = null; }
        if (unmountedRef.current) return;
        // Invalid token (e.g. the user no longer exists): clear it and send the
        // user back to login rather than retrying a doomed token forever.
        if (event.code === 4001) {
          clearStoredAuth();
          setWsStatus("disconnected");
          intlRouter.replace("/login");
          return;
        }
        // Other auth/session errors (and a clean close) won't resolve by
        // retrying — stop reconnecting and surface a permanent state.
        const permanent =
          event.code === 1000 || event.code === 4003 || event.code === 4004;
        if (!permanent && reconnectAttemptsRef.current < 3 && wsSessionIdRef.current) {
          const delay = 1000 * (reconnectAttemptsRef.current + 1);
          reconnectAttemptsRef.current++;
          setWsStatus("lost");
          reconnectTimerRef.current = setTimeout(() => connectWs(wsSessionIdRef.current!), delay);
        } else {
          setWsStatus("disconnected");
        }
      };
    };

    startMission(missionId)
      .unwrap()
      .then((session) => {
        attemptIdRef.current = session.attempt_id;
        wsSessionIdRef.current = session.session_id;
        connectWs(session.session_id);
      })
      .catch(() => setWsStatus("disconnected"));

    return () => {
      unmountedRef.current = true;
      reconnectAttemptsRef.current = 99;
      if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
      if (stableTimerRef.current) { clearTimeout(stableTimerRef.current); stableTimerRef.current = null; }
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      wsRef.current?.close();
      teardownRecording();
      closeSttWs();
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText]);

  /* ── Send over WS ── */
  const sendOverWs = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", content: text }));
      return true;
    }
    return false;
  }, []);

  const sendMessage = useCallback((text: string, fromVoice = false) => {
    const userMsg = text.trim();
    if (!userMsg || isGenerating) return;
    setInput("");
    lastUserMsgRef.current = userMsg;
    lastUserWordCountRef.current = userMsg.split(/\s+/).filter(Boolean).length;
    voiceInputRef.current = fromVoice;
    setMessages((p) => [...p, { id: newId(), role: "user", text: userMsg, fromVoice }]);
    setIsGenerating(true);
    streamRef.current = "";
    if (!sendOverWs(userMsg)) {
      setIsGenerating(false);
    }
  }, [isGenerating, sendOverWs]);

  const handleRegenerate = useCallback(() => {
    if (isGenerating || !lastUserMsgRef.current) return;
    setMessages((p) => {
      const idx = [...p].reverse().findIndex((m) => m.role === "ai");
      if (idx === -1) return p;
      return p.filter((_, i) => i !== p.length - 1 - idx);
    });
    setIsGenerating(true);
    streamRef.current = "";
    if (!sendOverWs(lastUserMsgRef.current)) setIsGenerating(false);
  }, [isGenerating, sendOverWs]);

  /* ── TTS ── */
  const handleListen = useCallback(async (msgId: string, text: string) => {
    if (playingMsgId === msgId) {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.src = "";
      setPlayingMsgId(null); return;
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    setPlayingMsgId(msgId);
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_BASE}/tutor/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`TTS ${res.status}`);
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPlayingMsgId(null); URL.revokeObjectURL(url); };
      audio.onerror = () => { setPlayingMsgId(null); URL.revokeObjectURL(url); };
      await audio.play().catch(() => setPlayingMsgId(null));
    } catch { setPlayingMsgId(null); }
  }, [playingMsgId, getAuthToken]);

  useEffect(() => { handleListenRef.current = handleListen; }, [handleListen]);

  /* ── Translate ── */
  const handleTranslate = useCallback(async (msgId: string, text: string) => {
    if (translationMap[msgId]) {
      setTranslationMap((p) => { const n = { ...p }; delete n[msgId]; return n; }); return;
    }
    setTranslatingId(msgId);
    try {
      const data = await translateText({ text, target_language: nativeLang }).unwrap();
      setTranslationMap((p) => ({ ...p, [msgId]: data.translation }));
    } catch { /* ignore */ } finally { setTranslatingId(null); }
  }, [translationMap, translateText, nativeLang]);

  const handleCopy = useCallback((msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId((c) => (c === msgId ? null : c)), 1500);
  }, []);

  /* ── STT stop ── */
  const stopRecording = useCallback(() => {
    teardownVad();
    const mr = mediaRecRef.current;
    if (mr && mr.state !== "inactive") { try { mr.stop(); } catch { /* ignore */ } }
    else { setIsRecording(false); teardownRecording(); closeSttWs(); }
  }, [teardownVad, teardownRecording]);

  /* ── STT start with VAD ── */
  const startRecording = useCallback(async () => {
    if (isRecording || isTranscribing) return;
    const authToken = getAuthToken();
    if (!authToken) return;

    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch { return; }
    mediaStreamRef.current = stream;
    audioChunksRef.current = [];
    setIsRecording(true);

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      vadContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      vadAnalyserRef.current = analyser;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      const vadData = new Uint8Array(analyser.frequencyBinCount);
      silenceStartRef.current = null;
      vadIntervalRef.current = setInterval(() => {
        const an = vadAnalyserRef.current;
        const mr = mediaRecRef.current;
        if (!an || !mr || mr.state === "inactive") return;
        an.getByteTimeDomainData(vadData);
        let sum = 0;
        for (let i = 0; i < vadData.length; i++) { const x = (vadData[i] - 128) / 128; sum += x * x; }
        const rms = Math.sqrt(sum / vadData.length);
        if (rms < VAD_SILENCE_THRESHOLD) {
          if (silenceStartRef.current === null) silenceStartRef.current = Date.now();
          else if (Date.now() - silenceStartRef.current > VAD_SILENCE_MS) {
            silenceStartRef.current = null;
            if (vadIntervalRef.current) { clearInterval(vadIntervalRef.current); vadIntervalRef.current = null; }
            stopRecording();
          }
        } else { silenceStartRef.current = null; }
      }, VAD_POLL_MS);
    } catch { /* VAD optional */ }

    const wsDomain = getWsBaseUrl();
    const ws = new WebSocket(`${wsDomain}/ws/stt?token=${authToken}`);
    ws.binaryType = "arraybuffer";
    wsSttRef.current = ws;

    const startRecorder = () => {
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) { audioChunksRef.current.push(e.data); if (ws.readyState === WebSocket.OPEN) ws.send(e.data); }
      };
      mr.onstop = () => {
        if (ws.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ type: "stop" })); setIsTranscribing(true); }
        else setIsTranscribing(false);
        setIsRecording(false);
        teardownRecording();
      };
      mr.onerror = () => stopRecording();
      mr.start(250);
      mediaRecRef.current = mr;
    };

    ws.onopen = () => { ws.send(JSON.stringify({ type: "start", language: "en-US" })); startRecorder(); };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "transcript") {
          const text = (msg.content || "").trim();
          setIsTranscribing(false); closeSttWs();
          if (text) sendMessage(text, true);
          else if (continuousRef.current) setTimeout(() => startRecordingRef.current(), 300);
        } else if (msg.type === "error") { setIsTranscribing(false); closeSttWs(); }
      } catch { /* ignore */ }
    };
    ws.onerror = () => { setIsRecording(false); setIsTranscribing(false); teardownRecording(); closeSttWs(); };
    ws.onclose = () => setIsTranscribing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, isTranscribing, getAuthToken, sendMessage, stopRecording, teardownRecording]);

  useEffect(() => { startRecordingRef.current = startRecording; }, [startRecording]);

  const toggleContinuous = useCallback(() => {
    const next = !continuousRef.current;
    continuousRef.current = next;
    setContinuous(next);
    if (next && !isRecording && !isTranscribing && !isGenerating) startRecording();
    if (!next && isRecording) stopRecording();
  }, [isRecording, isTranscribing, isGenerating, startRecording, stopRecording]);

  const handleEnd = async () => {
    continuousRef.current = false;
    unmountedRef.current = true;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    wsRef.current?.close();
    teardownRecording();
    closeSttWs();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    if (attemptIdRef.current) {
      try {
        const feedback = await completeMission({ id: missionId, attempt_id: attemptIdRef.current }).unwrap();
        sessionStorage.setItem(`mission_feedback_${missionId}`, JSON.stringify(feedback));
      } catch { /* continue even if feedback fails */ }
    }
    intlRouter.push(`/missions/${missionId}/feedback`);
  };

  const lastAiId = [...messages].reverse().find((m) => m.role === "ai")?.id;
  const isOffline = wsStatus === "lost" || wsStatus === "disconnected";
  const isInputDisabled = isRecording || isTranscribing || isOffline;
  const statusColor = isOffline ? "#EF4444" : isGenerating ? "#f97316" : "#22c55e";
  const statusLabel = wsStatus === "disconnected" ? "Disconnected — refresh to retry"
    : wsStatus === "lost" ? "Reconnecting…"
    : isGenerating ? "Elena is thinking…"
    : continuous ? "Listening mode" : "Active";

  /* ════════════════════════════════ RENDER ════════════════════════════════ */
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-background">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .chat-scroll::-webkit-scrollbar { width: 4px }
        .chat-scroll::-webkit-scrollbar-track { background: transparent }
        .chat-scroll::-webkit-scrollbar-thumb { background: #2A2A32; border-radius: 9999px }
        .msg-group .msg-actions { opacity: 0; pointer-events: none; transition: opacity 0.15s ease; }
        .msg-group:hover .msg-actions { opacity: 1; pointer-events: auto; }
        .prose-chat { font-size: 15px; line-height: 1.8; color: rgba(255,255,255,0.82); }
      `}</style>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, background: "rgba(10,10,12,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #2A2A32" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px", height: 54 }}>
          <Link href="/missions" style={{ display: "flex", alignItems: "center", color: "rgba(255,255,255,0.4)", textDecoration: "none", transition: "color 0.15s", flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </Link>

          <AiAvatar accentHex={accentHex} size={30} pulse={isGenerating} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Elena</span>
              <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: `1px solid ${accentHex}40`, background: `${accentHex}12`, color: accentHex, fontWeight: 600 }}>
                {mission?.cefr_level_min ?? "AI"}
              </span>
              <span className="hidden sm:block" style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
                {missionTitle}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              {isTranscribing ? (
                <>
                  <WaveformDots color={accentHex} />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>Transcribing…</span>
                </>
              ) : (
                <>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: statusColor, display: "inline-block" }} />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{statusLabel}</span>
                </>
              )}
            </div>
          </div>

          <button onClick={handleEnd}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#F87171", border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.07)", padding: "6px 12px", borderRadius: 9999, cursor: "pointer", flexShrink: 0, transition: "all 0.15s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.15)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.07)"; }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>call_end</span>
            <span className="hidden sm:inline">End</span>
          </button>
        </div>

        {/* Progress steps */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 20px 10px" }}>
          {STEPS.map((step, i) => (
            <div key={step} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 && <div style={{ height: 1, width: 40, backgroundColor: i <= currentStep ? accentHex : "#2A2A32", transition: "background-color 0.5s" }} />}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1px solid ${i <= currentStep ? accentHex : "#2A2A32"}`,
                  backgroundColor: i < currentStep ? accentHex : i === currentStep ? `${accentHex}22` : "transparent",
                  color: i < currentStep ? "#fff" : i === currentStep ? accentHex : "#9A9AA5",
                  fontSize: 10, fontWeight: 700, transition: "all 0.4s",
                }}>
                  {i < currentStep ? <span className="material-symbols-outlined" style={{ fontSize: 10 }}>check</span> : i + 1}
                </div>
                <span className="hidden sm:block" style={{ fontSize: 10, fontWeight: 500, color: i <= currentStep ? accentHex : "#9A9AA5", transition: "color 0.3s" }}>{step}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 chat-scroll" style={{ overflowY: "auto", padding: "32px 0" }}>
        <div style={{ width: "100%", maxWidth: 720, margin: "0 auto", padding: "0 20px", display: "flex", flexDirection: "column", gap: 4 }}>

          {messages.length === 0 && !isGenerating && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 16, textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.28)", fontStyle: "italic", maxWidth: 440, lineHeight: 1.7 }}>
                {mission?.scenario_prompt ?? "The scenario will begin shortly…"}
              </p>
              {returningHint && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9999, padding: "6px 14px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, color: accentHex }}>psychology</span>
                  Elena remembers you ({returningHint.level})
                  {returningHint.mistakes.length > 0 && ` · ${returningHint.mistakes.length} point${returningHint.mistakes.length !== 1 ? "s" : ""} to revisit`}
                </div>
              )}
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => {
              const prev = messages[idx - 1];

              if (msg.role === "ai") {
                const { cleanText, corrections } = parseCorrectionBlocks(msg.text);
                const wordCount = msg.userWordCount ?? 0;
                const hasMajorIssues = wordCount > 0 && corrections.length / wordCount >= 0.3 && corrections.length >= 2;
                const grouped = prev?.role === "ai";

                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
                    className="msg-group"
                    style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginTop: grouped ? 2 : 24 }}
                  >
                    {!grouped && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <AiAvatar accentHex={accentHex} size={20} />
                        <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.38)" }}>Elena</span>
                      </div>
                    )}
                    <div style={{ paddingLeft: 28, maxWidth: "90%" }}>
                      <div
                        className="prose-chat"
                        style={{
                          padding: "10px 16px", borderRadius: "4px 18px 18px 18px",
                          backgroundColor: hasMajorIssues ? "rgba(239,68,68,0.04)" : "#15151A",
                          border: `1px solid ${hasMajorIssues ? "rgba(239,68,68,0.2)" : "#2A2A32"}`,
                        }}
                      >
                        {hasMajorIssues && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid rgba(239,68,68,0.12)" }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 13, color: "rgba(239,68,68,0.6)" }}>edit_note</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(239,68,68,0.55)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Feedback on your message</span>
                          </div>
                        )}
                        <MissionMarkdown content={cleanText} />
                        {corrections.length > 0 && (
                          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #2A2A32", display: "flex", flexDirection: "column", gap: 6 }}>
                            {hasMajorIssues && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>Corrections</p>}
                            {corrections.map((c, i) => <CorrectionAnnotation key={i} correction={c} />)}
                          </div>
                        )}
                        {translationMap[msg.id] && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #2A2A32" }}>
                            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 4 }}>{nativeLang}</p>
                            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>{translationMap[msg.id]}</p>
                          </div>
                        )}
                      </div>
                      <ActionBar
                        isAi accentHex={accentHex}
                        onListen={() => handleListen(msg.id, cleanText || msg.text)} isPlaying={playingMsgId === msg.id}
                        onTranslate={() => handleTranslate(msg.id, msg.text)} isTranslating={translatingId === msg.id} hasTranslation={!!translationMap[msg.id]}
                        onCopy={() => handleCopy(msg.id, cleanText || msg.text)} copied={copiedId === msg.id}
                        onRegenerate={msg.id === lastAiId && !isGenerating ? handleRegenerate : undefined}
                      />
                    </div>
                  </motion.div>
                );
              }

              // User message
              const grouped = prev?.role === "user";
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
                  className="msg-group"
                  style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginTop: grouped ? 2 : 24 }}
                >
                  {!grouped && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexDirection: "row-reverse" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>person</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.38)" }}>You</span>
                      {msg.fromVoice && <span className="material-symbols-outlined" style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>mic</span>}
                    </div>
                  )}
                  <div style={{ maxWidth: "80%", fontSize: 15, lineHeight: 1.75, padding: "10px 16px", borderRadius: "18px 4px 18px 18px", color: "rgba(255,255,255,0.88)", background: "#1E1E24", border: "1px solid #2A2A32" }}>
                    {msg.text}
                    {translationMap[msg.id] && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #2A2A32" }}>
                        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 3 }}>{nativeLang}</p>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{translationMap[msg.id]}</p>
                      </div>
                    )}
                  </div>
                  <ActionBar
                    isAi={false} accentHex={accentHex}
                    onListen={() => handleListen(msg.id, msg.text)} isPlaying={playingMsgId === msg.id}
                    onTranslate={() => handleTranslate(msg.id, msg.text)} isTranslating={translatingId === msg.id} hasTranslation={!!translationMap[msg.id]}
                    onCopy={() => handleCopy(msg.id, msg.text)} copied={copiedId === msg.id}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Transcribing indicator */}
          <AnimatePresence>
            {isTranscribing && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 24, paddingLeft: 28 }}
              >
                <WaveformDots color={accentHex} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Transcribing your voice…</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI generating */}
          {isGenerating && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginTop: 24 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <AiAvatar accentHex={accentHex} size={20} pulse />
                <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.38)" }}>Elena</span>
              </div>
              <div style={{ paddingLeft: 28 }}>
                {streamingText ? (
                  <div className="prose-chat" style={{ padding: "10px 16px", borderRadius: "4px 18px 18px 18px", backgroundColor: "#15151A", border: "1px solid #2A2A32" }}>
                    <MissionMarkdown content={streamingText} />
                    <span style={{ display: "inline-block", width: 2, height: 18, marginLeft: 2, background: accentHex, borderRadius: 2, verticalAlign: "text-bottom" }} className="animate-pulse" />
                  </div>
                ) : (
                  <div style={{ padding: "10px 16px", borderRadius: "4px 18px 18px 18px", backgroundColor: "#15151A", border: "1px solid #2A2A32", display: "flex", alignItems: "center", gap: 8 }}>
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.25)" }}
                        animate={{ y: [0, -5, 0] }} transition={{ duration: 0.65, repeat: Infinity, delay: i * 0.13 }} />
                    ))}
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>thinking…</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} style={{ height: 8 }} />
        </div>
      </div>

      {/* ── Input area ── */}
      <div style={{ flexShrink: 0, background: "var(--color-background)", borderTop: "1px solid #2A2A32", padding: "12px 20px 20px" }}>
          {/* Input row */}
        <div style={{ width: "100%", maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: "#1C1C24", border: "1px solid #2A2A32", borderRadius: 18, padding: 8, transition: "border-color 0.2s" }}
            onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${accentHex}40`; }}
            onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#2A2A32"; }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              placeholder={isTranscribing ? "Transcribing…" : isRecording ? "Listening…" : wsStatus === "disconnected" ? "Disconnected — refresh to retry" : wsStatus === "lost" ? "Reconnecting…" : "Message Elena…"}
              disabled={isInputDisabled}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "rgba(255,255,255,0.85)", fontSize: 14, minHeight: 40, padding: "8px 12px", lineHeight: 1.5, opacity: isInputDisabled ? 0.4 : 1 }}
              className="placeholder:text-white/25"
            />
            <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 4, paddingRight: 4, flexShrink: 0 }}>
              {/* Continuous toggle */}
              <button onClick={toggleContinuous}
                style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${continuous ? `${accentHex}80` : "rgba(255,255,255,0.08)"}`, background: continuous ? `${accentHex}18` : "transparent", color: continuous ? accentHex : "rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                title={continuous ? "Continuous mode: on — click to disable" : "Enable continuous listening"}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: continuous ? "'FILL' 1" : "'FILL' 0" }}>{continuous ? "graphic_eq" : "hearing"}</span>
              </button>

              {/* Mic */}
              <div style={{ position: "relative" }}>
                {isRecording && <div className="absolute inset-0 animate-ping pointer-events-none" style={{ borderRadius: 10, background: "#ef4444", opacity: 0.2 }} />}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isGenerating || isTranscribing || isOffline}
                  style={{ position: "relative", width: 36, height: 36, borderRadius: 10, border: isRecording ? "none" : "1px solid rgba(255,255,255,0.08)", background: isRecording ? "#EF4444" : isTranscribing ? `${accentHex}18` : "transparent", color: isRecording ? "#fff" : isTranscribing ? accentHex : "rgba(255,255,255,0.35)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                  title={isRecording ? "Stop" : "Click once to speak — auto-sends on silence"}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: isRecording ? "'FILL' 1" : "'FILL' 0" }}>
                    {isTranscribing ? "sync" : isRecording ? "stop" : "mic"}
                  </span>
                </button>
              </div>

              {/* Send */}
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isGenerating || isInputDisabled}
                style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: accentHex, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: (!input.trim() || isGenerating || isInputDisabled) ? 0.25 : 1, transition: "all 0.15s", boxShadow: `0 0 12px ${accentHex}35` }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_upward</span>
              </button>
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.18)", marginTop: 8 }}>
            Click mic · auto-sends after 800ms silence
            <span style={{ margin: "0 8px", opacity: 0.4 }}>·</span>
            <kbd style={{ fontFamily: "monospace" }}>Enter</kbd> to send
            <span style={{ margin: "0 8px", opacity: 0.4 }}>·</span>
            AI replies read aloud when you use voice
          </p>
        </div>
      </div>
    </div>
  );
}

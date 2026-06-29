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

interface Message {
  id: string;
  role: "ai" | "user";
  text: string;
}

const CEFR_HEX: Record<string, string> = {
  A1: "#22c55e",
  A2: "#14b8a6",
  B1: "#3b82f6",
  B2: "#8B7CFF",
  C1: "#f97316",
  C2: "#ef4444",
};

const STEPS = ["Start", "Practice", "Complete"];
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  ru: "Russian",
  tg: "Tajik",
  es: "Spanish",
  fr: "French",
  de: "German",
  uk: "Ukrainian",
  ar: "Arabic",
  zh: "Chinese",
  hi: "Hindi",
  tr: "Turkish",
};

const SUGGESTIONS = [
  "Yes, I'm ready",
  "Can you repeat?",
  "Give me vocabulary for this",
  "I'm not sure how to answer",
];

let idCounter = 0;
const newId = () => `m${Date.now()}_${idCounter++}`;

/* ── Memory persistence (level, past mistakes, mission progress) ── */
interface MissionMemory {
  level: string;
  title: string;
  attempts: number;
  totalExchanges: number;
  mistakes: string[];
  lastSeen: number;
}

function loadMemory(missionId: string): MissionMemory | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`mission_memory_${missionId}`);
    return raw ? (JSON.parse(raw) as MissionMemory) : null;
  } catch {
    return null;
  }
}

function saveMemory(missionId: string, mem: MissionMemory) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`mission_memory_${missionId}`, JSON.stringify(mem));
  } catch {
    /* quota */
  }
}

// Pull Elena's inline corrections — format: [Correction: instead of 'x' write 'y' — reason]
function extractCorrections(text: string): string[] {
  const out: string[] = [];
  const re = /\[Correction:\s*([^\]]+)\]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[1].trim());
  return out;
}

/* ─────────────── MEMOIZED MARKDOWN ─────────────── */
const MD_COMPONENTS: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-[#B0A3FF]">{children}</em>,
  code: ({ children, className }) => {
    const isBlock = (className ?? "").includes("language-");
    if (isBlock) {
      return (
        <pre
          className="my-2 p-3 rounded-lg overflow-x-auto"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <code className="text-[13px] text-[#B0A3FF] font-mono">
            {children}
          </code>
        </pre>
      );
    }
    return (
      <code
        className="px-1.5 py-0.5 rounded text-[13px] font-mono text-[#B0A3FF]"
        style={{ background: "rgba(110,91,255,0.15)" }}
      >
        {children}
      </code>
    );
  },
  ul: ({ children }) => (
    <ul className="list-disc pl-5 space-y-0.5 my-1.5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 space-y-0.5 my-1.5">{children}</ol>
  ),
  li: ({ children }) => <li className="text-on-surface/85">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote
      className="pl-3 my-2 text-on-surface-variant italic"
      style={{ borderLeft: "2px solid rgba(110,91,255,0.5)" }}
    >
      {children}
    </blockquote>
  ),
  h1: ({ children }) => (
    <h1 className="text-base font-bold text-white mb-1 mt-2 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[15px] font-semibold text-white mb-1 mt-2 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-white/90 mb-1 mt-2 first:mt-0">
      {children}
    </h3>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-primary underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full text-[13px] border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-[#2A2A32] px-2 py-1 text-left font-semibold text-white/90 bg-white/[0.03]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-[#2A2A32] px-2 py-1 text-on-surface/80">
      {children}
    </td>
  ),
};

// Memoized so streaming tokens elsewhere don't re-parse settled messages.
const MissionMarkdown = memo(function MissionMarkdown({
  content,
}: {
  content: string;
}) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
      {content}
    </ReactMarkdown>
  );
});

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-on-surface-variant"
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.7,
            repeat: Infinity,
            delay: i * 0.14,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function AiAvatar({
  accentHex,
  size = 32,
  pulse = false,
}: {
  accentHex: string;
  size?: number;
  pulse?: boolean;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {pulse && (
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{ backgroundColor: accentHex, opacity: 0.25 }}
        />
      )}
      <div
        className="relative w-full h-full rounded-full flex items-center justify-center border"
        style={{
          background: `linear-gradient(135deg, ${accentHex}22 0%, ${accentHex}0d 100%)`,
          borderColor: `${accentHex}50`,
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: size * 0.48,
            color: accentHex,
            fontVariationSettings: "'FILL' 1",
          }}
        >
          smart_toy
        </span>
      </div>
    </div>
  );
}

/* ─────────────── PER-MESSAGE ACTION BAR ─────────────── */
function ActionBar({
  isAi,
  accentHex,
  onListen,
  isPlaying,
  onTranslate,
  isTranslating,
  hasTranslation,
  onCopy,
  copied,
  onRegenerate,
}: {
  isAi: boolean;
  accentHex: string;
  onListen: () => void;
  isPlaying: boolean;
  onTranslate: () => void;
  isTranslating: boolean;
  hasTranslation: boolean;
  onCopy: () => void;
  copied: boolean;
  onRegenerate?: () => void;
}) {
  const btn =
    "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-on-surface-variant hover:text-on-surface hover:bg-white/[0.06] transition-all active:scale-95";
  return (
    <div
      className={`flex items-center gap-0.5 mt-1.5 ${isAi ? "" : "justify-end"}`}
    >
      <button
        onClick={onListen}
        className={btn}
        title={isPlaying ? "Stop" : "Listen"}
        style={isPlaying ? { color: accentHex } : undefined}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 14,
            fontVariationSettings: isPlaying ? "'FILL' 1" : "'FILL' 0",
          }}
        >
          {isPlaying ? "stop_circle" : "volume_up"}
        </span>
        <span>{isPlaying ? "Stop" : "Listen"}</span>
      </button>
      <button
        onClick={onTranslate}
        className={btn}
        title="Translate"
        disabled={isTranslating}
        style={hasTranslation ? { color: accentHex } : undefined}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 14,
            ...(isTranslating ? { animation: "spin 1s linear infinite" } : {}),
            fontVariationSettings: hasTranslation ? "'FILL' 1" : "'FILL' 0",
          }}
        >
          {isTranslating ? "sync" : "translate"}
        </span>
        <span>
          {isTranslating ? "…" : hasTranslation ? "Hide" : "Translate"}
        </span>
      </button>
      <button onClick={onCopy} className={btn} title="Copy">
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 14,
            fontVariationSettings: copied ? "'FILL' 1" : "'FILL' 0",
          }}
        >
          {copied ? "check" : "content_copy"}
        </span>
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
      {isAi && onRegenerate && (
        <button onClick={onRegenerate} className={btn} title="Regenerate">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            refresh
          </span>
          <span>Regenerate</span>
        </button>
      )}
    </div>
  );
}

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
  const nativeLang =
    LANG_NAMES[profile?.native_language_code ?? ""] ?? "Russian";

  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // voice / continuous mode
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [continuous, setContinuous] = useState(false);

  // per-message UI state
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [translationMap, setTranslationMap] = useState<Record<string, string>>(
    {},
  );
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [returningHint, setReturningHint] = useState<MissionMemory | null>(
    null,
  );

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastUserMsgRef = useRef<string>("");
  const continuousRef = useRef(false);
  const startRecordingRef = useRef<() => void>(() => {});

  // STT refs
  const wsSttRef = useRef<WebSocket | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [startMission] = useStartMissionMutation();
  const [completeMission] = useCompleteMissionMutation();
  const attemptIdRef = useRef<string | null>(null);
  const hasStartedRef = useRef(false);

  const getAuthToken = useCallback(
    () =>
      token ??
      (typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null),
    [token],
  );

  /* ── progress steps (derived from how far the conversation has gone) ── */
  const aiTurns = messages.filter((m) => m.role === "ai").length;
  const currentStep = aiTurns >= 5 ? 2 : aiTurns >= 3 ? 1 : 0;

  /* ── load memory once mission is known ── */
  useEffect(() => {
    if (!missionId) return;
    const mem = loadMemory(missionId);
    if (mem && (mem.totalExchanges > 0 || mem.mistakes.length > 0))
      setReturningHint(mem);
  }, [missionId]);

  /* ── persist conversation memory whenever messages change ── */
  useEffect(() => {
    if (!messages.length) return;
    const prev = loadMemory(missionId);
    const newMistakes = messages
      .filter((m) => m.role === "ai")
      .flatMap((m) => extractCorrections(m.text));
    const merged = Array.from(
      new Set([...(prev?.mistakes ?? []), ...newMistakes]),
    ).slice(-25);
    const userTurns = messages.filter((m) => m.role === "user").length;
    saveMemory(missionId, {
      level: String(userLevel),
      title: missionTitle,
      attempts: prev?.attempts ?? 1,
      totalExchanges: Math.max(prev?.totalExchanges ?? 0, userTurns),
      mistakes: merged,
      lastSeen: Date.now(),
    });
  }, [messages, missionId, missionTitle, userLevel]);

  /* ── STT teardown helpers (used by the start effect cleanup too) ── */
  const closeSttWs = () => {
    if (wsSttRef.current) {
      try {
        wsSttRef.current.close();
      } catch {
        /* ignore */
      }
      wsSttRef.current = null;
    }
  };
  const teardownRecording = () => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    mediaRecRef.current = null;
    audioChunksRef.current = [];
  };

  /* ── start mission + open WS ── */
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    // bump attempt counter in memory
    const prev = loadMemory(missionId);
    if (prev)
      saveMemory(missionId, {
        ...prev,
        attempts: prev.attempts + 1,
        lastSeen: Date.now(),
      });

    const authToken = getAuthToken();
    startMission(missionId)
      .unwrap()
      .then((session) => {
        attemptIdRef.current = session.attempt_id;
        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000"}/ws/tutor/${session.session_id}${authToken ? `?token=${authToken}` : ""}`;
        const ws = new WebSocket(wsUrl);
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === "chunk") {
              streamRef.current += msg.content || "";
              setStreamingText(streamRef.current);
            } else if (msg.type === "done") {
              const fullText = (streamRef.current + (msg.content || "")).trim();
              streamRef.current = "";
              setStreamingText("");
              if (fullText)
                setMessages((prev) => [
                  ...prev,
                  { id: newId(), role: "ai", text: fullText },
                ]);
              setIsGenerating(false);
              if (continuousRef.current)
                setTimeout(() => startRecordingRef.current(), 350);
            } else if (msg.type === "error") {
              streamRef.current = "";
              setStreamingText("");
              setIsGenerating(false);
            }
          } catch {
            /* ignore non-JSON frames */
          }
        };
        ws.onerror = () => ws.close();
        wsRef.current = ws;
      })
      .catch(() => {
        /* fallback static mode */
      });

    return () => {
      wsRef.current?.close();
      teardownRecording();
      closeSttWs();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  /* ── send a message over the tutor WS ── */
  const sendOverWs = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", content: text }));
      return true;
    }
    return false;
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      const userMsg = text.trim();
      if (!userMsg || isGenerating) return;
      setInput("");
      lastUserMsgRef.current = userMsg;
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "user", text: userMsg },
      ]);
      setIsGenerating(true);
      streamRef.current = "";
      if (!sendOverWs(userMsg)) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: newId(),
              role: "ai",
              text: "Connection lost. Please refresh and try again.",
            },
          ]);
          setIsGenerating(false);
        }, 800);
      }
    },
    [isGenerating, sendOverWs],
  );

  /* ── regenerate: drop last AI reply, re-ask the last user turn ── */
  const handleRegenerate = useCallback(() => {
    if (isGenerating || !lastUserMsgRef.current) return;
    setMessages((prev) => {
      const idx = [...prev].reverse().findIndex((m) => m.role === "ai");
      if (idx === -1) return prev;
      const realIdx = prev.length - 1 - idx;
      return prev.filter((_, i) => i !== realIdx);
    });
    setIsGenerating(true);
    streamRef.current = "";
    if (!sendOverWs(lastUserMsgRef.current)) setIsGenerating(false);
  }, [isGenerating, sendOverWs]);

  /* ── TTS (reuses backend /tutor/tts) ── */
  const handleListen = useCallback(
    async (msgId: string, text: string) => {
      if (playingMsgId === msgId) {
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.src = "";
        setPlayingMsgId(null);
        return;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      setPlayingMsgId(msgId);
      try {
        const authToken = getAuthToken();
        const res = await fetch(`${API_BASE}/tutor/tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error(`TTS ${res.status}`);
        const url = URL.createObjectURL(await res.blob());
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setPlayingMsgId(null);
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          setPlayingMsgId(null);
          URL.revokeObjectURL(url);
        };
        await audio.play().catch(() => setPlayingMsgId(null));
      } catch {
        setPlayingMsgId(null);
      }
    },
    [playingMsgId, getAuthToken],
  );

  /* ── Translate to user's native language ── */
  const handleTranslate = useCallback(
    async (msgId: string, text: string) => {
      if (translationMap[msgId]) {
        setTranslationMap((prev) => {
          const n = { ...prev };
          delete n[msgId];
          return n;
        });
        return;
      }
      setTranslatingId(msgId);
      try {
        const data = await translateText({
          text,
          target_language: nativeLang,
        }).unwrap();
        setTranslationMap((prev) => ({ ...prev, [msgId]: data.translation }));
      } catch {
        /* ignore */
      } finally {
        setTranslatingId(null);
      }
    },
    [translationMap, translateText, nativeLang],
  );

  const handleCopy = useCallback((msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId((c) => (c === msgId ? null : c)), 1500);
  }, []);

  /* ── STT (reuses backend /ws/stt) — auto-sends transcript ── */
  const stopRecording = useCallback(() => {
    const mr = mediaRecRef.current;
    if (mr && mr.state !== "inactive") {
      try {
        mr.stop();
      } catch {
        /* ignore */
      }
    } else {
      setIsRecording(false);
      teardownRecording();
      closeSttWs();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording || isTranscribing) return;
    const authToken = getAuthToken();
    if (!authToken) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return;
    }
    mediaStreamRef.current = stream;
    audioChunksRef.current = [];
    setIsRecording(true);

    const wsDomain = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    const ws = new WebSocket(`${wsDomain}/ws/stt?token=${authToken}`);
    ws.binaryType = "arraybuffer";
    wsSttRef.current = ws;

    const startRecorder = () => {
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          if (ws.readyState === WebSocket.OPEN) ws.send(e.data);
        }
      };
      mr.onstop = () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "stop" }));
          setIsTranscribing(true);
        } else setIsTranscribing(false);
        setIsRecording(false);
        teardownRecording();
      };
      mr.onerror = () => stopRecording();
      mr.start(250);
      mediaRecRef.current = mr;
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "start", language: "en-US" }));
      startRecorder();
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "transcript") {
          const text = (msg.content || "").trim();
          setIsTranscribing(false);
          closeSttWs();
          if (text)
            sendMessage(text); // auto-send transcribed speech
          else if (continuousRef.current)
            setTimeout(() => startRecordingRef.current(), 300);
        } else if (msg.type === "error") {
          setIsTranscribing(false);
          closeSttWs();
        }
      } catch {
        /* ignore */
      }
    };
    ws.onerror = () => {
      setIsRecording(false);
      setIsTranscribing(false);
      teardownRecording();
      closeSttWs();
    };
    ws.onclose = () => setIsTranscribing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, isTranscribing, getAuthToken, sendMessage]);

  // Keep a stable ref to the latest startRecording for use in WS callbacks/timeouts.
  useEffect(() => {
    startRecordingRef.current = startRecording;
  }, [startRecording]);

  const toggleContinuous = useCallback(() => {
    const next = !continuousRef.current;
    continuousRef.current = next;
    setContinuous(next);
    if (next && !isRecording && !isTranscribing && !isGenerating)
      startRecording();
    if (!next && isRecording) stopRecording();
  }, [
    isRecording,
    isTranscribing,
    isGenerating,
    startRecording,
    stopRecording,
  ]);

  const handleEnd = async () => {
    continuousRef.current = false;
    wsRef.current?.close();
    teardownRecording();
    closeSttWs();
    if (attemptIdRef.current) {
      try {
        const feedback = await completeMission({
          id: missionId,
          attempt_id: attemptIdRef.current,
        }).unwrap();
        sessionStorage.setItem(
          `mission_feedback_${missionId}`,
          JSON.stringify(feedback),
        );
      } catch {
        /* empty state on results page */
      }
    }
    intlRouter.push(`/missions/${missionId}/feedback`);
  };

  const lastAiId = [...messages].reverse().find((m) => m.role === "ai")?.id;

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#0A0A0C]">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Top bar ── */}
      <div className="shrink-0 border-b border-[#2A2A32] bg-[#15151A]/95 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 md:px-6 h-14">
          <Link
            href="/missions"
            className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface text-sm transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>
            <span className="hidden sm:inline text-sm">Back</span>
          </Link>

          <div className="flex-1 flex items-center justify-center gap-3">
            <AiAvatar accentHex={accentHex} size={36} pulse={isGenerating} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-on-surface">
                  Elena
                </span>
                <span className="text-[10px] text-on-surface-variant hidden sm:inline">
                  · {missionTitle}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded border font-semibold leading-none"
                  style={{
                    color: accentHex,
                    borderColor: `${accentHex}40`,
                    backgroundColor: `${accentHex}12`,
                  }}
                >
                  {mission?.cefr_level_min ?? "AI"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: isGenerating ? "#f97316" : "#22c55e",
                  }}
                />
                <span className="text-[10px] text-on-surface-variant">
                  {isGenerating
                    ? "Responding…"
                    : continuous
                      ? "Listening mode on"
                      : "Active session"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleEnd}
            className="shrink-0 flex items-center gap-1.5 bg-error/10 text-error hover:bg-error/20 font-medium py-1.5 px-3 rounded-lg text-xs active:scale-95 transition-all border border-error/20"
          >
            <span className="material-symbols-outlined text-[15px]">
              call_end
            </span>
            <span className="hidden sm:inline">End</span>
          </button>
        </div>

        <div className="flex items-center px-4 md:px-6 pb-3 pt-0.5 gap-0">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center">
              {i > 0 && (
                <div
                  className="h-px w-8 md:w-14 transition-all duration-500"
                  style={{
                    backgroundColor: i <= currentStep ? accentHex : "#2A2A32",
                  }}
                />
              )}
              <div className="flex items-center gap-1.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-400 text-[10px] font-bold"
                  style={{
                    backgroundColor:
                      i < currentStep
                        ? accentHex
                        : i === currentStep
                          ? `${accentHex}22`
                          : "transparent",
                    borderColor: i <= currentStep ? accentHex : "#2A2A32",
                    color:
                      i < currentStep
                        ? "#fff"
                        : i === currentStep
                          ? accentHex
                          : "#9A9AA5",
                  }}
                >
                  {i < currentStep ? (
                    <span className="material-symbols-outlined text-[10px]">
                      check
                    </span>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className="text-[10px] font-medium hidden sm:inline transition-colors duration-300"
                  style={{ color: i <= currentStep ? accentHex : "#9A9AA5" }}
                >
                  {step}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-6 py-5 space-y-5">
        {messages.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full py-16 gap-3 text-center">
            <p className="text-sm text-on-surface-variant/60 italic max-w-[1000px]">
              {mission?.scenario_prompt ?? "The scenario will begin shortly…"}
            </p>
            {returningHint && (
              <div className="flex items-center gap-2 text-[11px] text-on-surface-variant bg-white/[0.03] border border-[#2A2A32] rounded-full px-3 py-1.5">
                <span
                  className="material-symbols-outlined text-[14px]"
                  style={{ color: accentHex }}
                >
                  psychology
                </span>
                Elena remembers you ({returningHint.level})
                {returningHint.mistakes.length > 0 &&
                  ` · ${returningHint.mistakes.length} point${returningHint.mistakes.length > 1 ? "s" : ""} to revisit`}
              </div>
            )}
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) =>
            msg.role === "ai" ? (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex items-start gap-3 pr-8 md:pr-20 group"
              >
                <AiAvatar accentHex={accentHex} size={32} />
                <div className="min-w-0">
                  <span className="text-[10px] font-medium text-on-surface-variant mb-1.5 block">
                    Elena
                  </span>
                  <div
                    className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-on-surface leading-relaxed border max-w-prose"
                    style={{
                      backgroundColor: "#15151A",
                      borderColor: "#2A2A32",
                    }}
                  >
                    <MissionMarkdown content={msg.text} />
                    {translationMap[msg.id] && (
                      <div className="mt-2.5 pt-2.5 border-t border-[#2A2A32]/70">
                        <p className="text-[9px] uppercase tracking-wider font-semibold text-on-surface-variant/50 mb-1">
                          {nativeLang}
                        </p>
                        <p className="text-[13px] text-on-surface-variant leading-relaxed">
                          {translationMap[msg.id]}
                        </p>
                      </div>
                    )}
                  </div>
                  <ActionBar
                    isAi
                    accentHex={accentHex}
                    onListen={() => handleListen(msg.id, msg.text)}
                    isPlaying={playingMsgId === msg.id}
                    onTranslate={() => handleTranslate(msg.id, msg.text)}
                    isTranslating={translatingId === msg.id}
                    hasTranslation={!!translationMap[msg.id]}
                    onCopy={() => handleCopy(msg.id, msg.text)}
                    copied={copiedId === msg.id}
                    onRegenerate={
                      msg.id === lastAiId && !isGenerating
                        ? handleRegenerate
                        : undefined
                    }
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex flex-col items-end pl-8 md:pl-20 group"
              >
                <span className="text-[10px] font-medium text-on-surface-variant mb-1.5">
                  You
                </span>
                <div
                  className="px-4 py-3 rounded-2xl rounded-tr-sm text-sm text-white leading-relaxed max-w-prose"
                  style={{
                    background:
                      "linear-gradient(135deg, #6E5BFF 0%, #8B7CFF 100%)",
                  }}
                >
                  {msg.text}
                  {translationMap[msg.id] && (
                    <div className="mt-2.5 pt-2.5 border-t border-white/20">
                      <p className="text-[9px] uppercase tracking-wider font-semibold text-white/50 mb-1">
                        {nativeLang}
                      </p>
                      <p className="text-[13px] text-white/80 leading-relaxed">
                        {translationMap[msg.id]}
                      </p>
                    </div>
                  )}
                </div>
                <ActionBar
                  isAi={false}
                  accentHex={accentHex}
                  onListen={() => handleListen(msg.id, msg.text)}
                  isPlaying={playingMsgId === msg.id}
                  onTranslate={() => handleTranslate(msg.id, msg.text)}
                  isTranslating={translatingId === msg.id}
                  hasTranslation={!!translationMap[msg.id]}
                  onCopy={() => handleCopy(msg.id, msg.text)}
                  copied={copiedId === msg.id}
                />
              </motion.div>
            ),
          )}
        </AnimatePresence>

        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 pr-8 md:pr-20"
          >
            <AiAvatar accentHex={accentHex} size={32} pulse />
            <div>
              <span className="text-[10px] font-medium text-on-surface-variant mb-1.5 block">
                Elena
              </span>
              {streamingText ? (
                <div
                  className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-on-surface leading-relaxed border max-w-prose"
                  style={{ backgroundColor: "#15151A", borderColor: "#2A2A32" }}
                >
                  <MissionMarkdown content={streamingText} />
                  <span className="inline-block w-0.5 h-[14px] ml-0.5 bg-on-surface-variant animate-pulse rounded-sm align-text-bottom" />
                </div>
              ) : (
                <div
                  className="px-4 py-3 rounded-2xl rounded-tl-sm border"
                  style={{ backgroundColor: "#15151A", borderColor: "#2A2A32" }}
                >
                  <TypingDots />
                </div>
              )}
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <div className="shrink-0 border-t border-[#2A2A32] bg-[#0A0A0C]/95 backdrop-blur-md pt-3 pb-4 px-4 md:px-6 space-y-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              disabled={isGenerating}
              className="shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full bg-[#15151A] border border-[#2A2A32] text-on-surface-variant hover:text-on-surface hover:border-primary/40 active:scale-95 transition-all duration-150 disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 max-w-[820px] mx-auto">
          <div className="relative flex-1">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && sendMessage(input)
              }
              placeholder={
                isTranscribing
                  ? "Transcribing…"
                  : isRecording
                    ? "Listening…"
                    : "Type your response…"
              }
              className="w-full bg-[#15151A] border border-[#2A2A32] rounded-xl py-3.5 pl-4 pr-12 text-sm text-on-surface focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-[#9A9AA5]"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isGenerating}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 disabled:opacity-25 active:scale-90 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">
                send
              </span>
            </button>
          </div>

          {/* Push-to-talk mic — auto-sends on release */}
          <div className="relative shrink-0">
            {isRecording && (
              <div
                className="absolute inset-0 rounded-xl animate-ping pointer-events-none"
                style={{ backgroundColor: "#ef4444", opacity: 0.2 }}
              />
            )}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isGenerating || isTranscribing}
              className="relative w-11 h-11 rounded-xl flex items-center justify-center border active:scale-90 transition-all disabled:opacity-40"
              style={{
                backgroundColor: isRecording
                  ? "#ef4444"
                  : isTranscribing
                    ? `${accentHex}1f`
                    : "#15151A",
                borderColor: isRecording ? "#ef4444" : "#2A2A32",
                color: isRecording
                  ? "#fff"
                  : isTranscribing
                    ? accentHex
                    : undefined,
              }}
              title={
                isRecording
                  ? "Stop & send"
                  : isTranscribing
                    ? "Transcribing…"
                    : "Voice input"
              }
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{
                  fontVariationSettings: isRecording ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {isTranscribing ? "sync" : isRecording ? "stop" : "mic"}
              </span>
            </button>
          </div>

          {/* Continuous (hands-free) toggle */}
          <button
            onClick={toggleContinuous}
            className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center border active:scale-90 transition-all"
            style={{
              backgroundColor: continuous ? `${accentHex}1f` : "#15151A",
              borderColor: continuous ? `${accentHex}80` : "#2A2A32",
              color: continuous ? accentHex : undefined,
            }}
            title={
              continuous
                ? "Continuous listening on"
                : "Continuous listening off"
            }
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{
                fontVariationSettings: continuous ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              {continuous ? "graphic_eq" : "hearing"}
            </span>
          </button>
        </div>
        <p className="text-center text-[10px] text-on-surface-variant/40">
          Tap mic to speak (auto-sends) · toggle{" "}
          <span className="material-symbols-outlined text-[11px] align-middle">
            hearing
          </span>{" "}
          for hands-free mode
        </p>
      </div>
    </div>
  );
}

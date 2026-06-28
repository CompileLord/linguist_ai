"use client";

import { useState, useEffect, useRef, useCallback, Suspense, CSSProperties } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSelector } from "react-redux";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import type { RootState } from "@/store/store";
import {
  useGetTutorSessionsQuery,
  useCreateTutorSessionMutation,
  useEndTutorSessionMutation,
  useLazyGetTutorMessagesQuery,
  useCorrectTextMutation,
  useTranslateTextMutation,
  TutorSessionResponse,
  TutorMessageResponse,
  CorrectionResponse,
  CorrectionIssue,
} from "@/services/tutorApi";

const AI_PERSONA = { name: "Elena", role: "Conversational Tutor" };

const ISSUE_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  grammar:     { label: "Grammar",     color: "#F97316", bg: "rgba(249,115,22,0.1)"  },
  spelling:    { label: "Spelling",    color: "#EF4444", bg: "rgba(239,68,68,0.1)"   },
  word_choice: { label: "Word choice", color: "#8B5CF6", bg: "rgba(139,92,246,0.1)"  },
  fluency:     { label: "Fluency",     color: "#3B82F6", bg: "rgba(59,130,246,0.1)"  },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

function formatTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function AiAvatar({ size = 28, pulse = false }: { size?: number; pulse?: boolean }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {pulse && (
        <div className="absolute inset-0 rounded-full animate-ping opacity-25" style={{ backgroundColor: "#6E5BFF", borderRadius: "50%" }} />
      )}
      <div
        style={{
          width: size, height: size, borderRadius: "50%",
          background: "linear-gradient(135deg,#6E5BFF 0%,#8B7CFF 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: pulse ? "0 0 12px rgba(110,91,255,0.5)" : "none",
          position: "relative",
        }}
      >
        <span className="material-symbols-outlined text-white" style={{ fontSize: size * 0.5, fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
      </div>
    </div>
  );
}

function ChatMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-white/95">{children}</strong>,
        em: ({ children }) => <em className="italic text-white/75">{children}</em>,
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <pre className="my-2 p-3 rounded-lg overflow-x-auto" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <code className="text-[13px] text-[#B0A3FF] font-mono">{children}</code>
              </pre>
            );
          }
          return <code className="px-1.5 py-0.5 rounded text-[13px] font-mono text-[#B0A3FF]" style={{ background: "rgba(110,91,255,0.15)" }}>{children}</code>;
        },
        ul: ({ children }) => <ul className="list-disc pl-5 space-y-0.5 my-1.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 space-y-0.5 my-1.5">{children}</ol>,
        li: ({ children }) => <li className="text-white/80">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="pl-3 my-2 text-white/55 italic" style={{ borderLeft: "2px solid rgba(110,91,255,0.5)" }}>{children}</blockquote>
        ),
        h1: ({ children }) => <h1 className="text-lg font-bold text-white/90 mb-1 mt-3 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-semibold text-white/85 mb-1 mt-2 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-white/80 mb-1 mt-2 first:mt-0">{children}</h3>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function FluentScore({ score }: { score: number }) {
  const color = score >= 8 ? "#3DD68C" : score >= 5 ? "#E8B339" : "#EF4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 9999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(score / 10) * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          style={{ height: "100%", backgroundColor: color, borderRadius: 9999 }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 32, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{score}/10</span>
    </div>
  );
}

/* ─────────────── CORRECTION MODAL ─────────────── */
function CorrectionModal({
  text, onClose, token,
}: {
  text: string;
  onClose: () => void;
  token: string | null;
}) {
  const [mounted, setMounted] = useState(false);
  const [result, setResult] = useState<CorrectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [correctText] = useCorrectTextMutation();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(false); setResult(null);
    correctText({ text })
      .unwrap()
      .then((d) => { if (!cancelled) { setResult(d); setLoading(false); } })
      .catch((err) => { console.error("[CorrectionModal] API error:", err); if (!cancelled) { setError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [text]);

  if (!mounted) return null;

  /* All positioning via inline styles to guarantee no Tailwind/overflow clipping */
  const overlay: CSSProperties = {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999999,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "16px",
    background: "rgba(0,0,0,0.8)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  };

  const panel: CSSProperties = {
    position: "relative",
    width: "100%", maxWidth: 520,
    height: "clamp(320px, 82vh, 640px)",
    background: "#18181F",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 18,
    overflow: "hidden",
    display: "flex", flexDirection: "column",
    boxShadow: "0 32px 96px rgba(0,0,0,0.75)",
  };

  const body: CSSProperties = {
    flex: 1, minHeight: 0, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16,
  };

  return createPortal(
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panel}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#6E5BFF,#8B7CFF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined text-white" style={{ fontSize: 17, fontVariationSettings: "'FILL' 1" }}>auto_fix_high</span>
            </div>
            <div>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Grammar Check</p>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 }}>Powered by Elena AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "rgba(255,255,255,0.45)" }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div style={body}>
          {/* Original text */}
          <div>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: "rgba(255,255,255,0.25)", marginBottom: 8 }}>Your message</p>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
              {text}
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 0" }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Analyzing your text…</p>
              {[75, 55, 85, 45].map((w, i) => (
                <div key={i} className="animate-pulse" style={{ height: 10, borderRadius: 9999, background: "rgba(255,255,255,0.12)", width: `${w}%` }} />
              ))}
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: "#EF4444", display: "block", marginBottom: 8 }}>wifi_off</span>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Couldn't analyze text right now.</p>
            </div>
          ) : result ? (
            <>
              {/* Score */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>Fluency score</span>
                  {result.is_correct && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "#3DD68C", background: "rgba(61,214,140,0.1)", padding: "3px 8px", borderRadius: 9999 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      Correct
                    </span>
                  )}
                </div>
                <FluentScore score={result.fluency_score} />
              </div>

              {/* Feedback */}
              <div style={{ background: "rgba(110,91,255,0.07)", border: "1px solid rgba(110,91,255,0.15)", borderRadius: 12, padding: "12px 16px" }}>
                <p style={{ fontSize: 13, color: "#B0A3FF", lineHeight: 1.6 }}>{result.overall_feedback}</p>
              </div>

              {/* Corrected */}
              {!result.is_correct && (
                <div>
                  <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: "rgba(255,255,255,0.25)", marginBottom: 8 }}>Suggested correction</p>
                  <div style={{ background: "rgba(61,214,140,0.05)", border: "1px solid rgba(61,214,140,0.15)", borderRadius: 12, padding: "12px 16px" }}>
                    <p style={{ fontSize: 14, color: "#3DD68C", lineHeight: 1.6 }}>{result.corrected_text}</p>
                  </div>
                </div>
              )}

              {/* Issues */}
              {result.issues.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: "rgba(255,255,255,0.25)", marginBottom: 10 }}>
                    Issues found ({result.issues.length})
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {result.issues.map((issue: CorrectionIssue, i: number) => {
                      const cfg = ISSUE_COLORS[issue.type] ?? ISSUE_COLORS.grammar;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07 }}
                          style={{ background: cfg.bg, border: `1px solid ${cfg.color}22`, borderRadius: 12, padding: "12px 14px" }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: cfg.color, background: `${cfg.color}18`, padding: "2px 6px", borderRadius: 4, flexShrink: 0, marginTop: 2 }}>
                              {cfg.label}
                            </span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                                <span style={{ fontSize: 12, textDecoration: "line-through", color: "rgba(255,255,255,0.35)" }}>{issue.original}</span>
                                <span className="material-symbols-outlined" style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>arrow_forward</span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>{issue.corrected}</span>
                              </div>
                              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{issue.explanation}</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {result.is_correct && result.issues.length === 0 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0", gap: 10 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(61,214,140,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 26, color: "#3DD68C", fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>No issues found — great job!</p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─────────────── ACTION BAR ─────────────── */
function MessageActionBar({
  isAi, content, onReadAloud, isPlaying, onCorrect, onTranslate, isTranslating, hasTranslation,
}: {
  isAi: boolean; content: string;
  onReadAloud: () => void; isPlaying: boolean;
  onCorrect?: () => void;
  onTranslate?: () => void; isTranslating?: boolean; hasTranslation?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 4, justifyContent: isAi ? "flex-start" : "flex-end" }}
      className="msg-actions">
      <button onClick={onReadAloud} className={`action-btn ${isPlaying ? "action-active" : ""}`} title={isPlaying ? "Stop" : "Listen"}>
        <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: isPlaying ? "'FILL' 1" : "'FILL' 0" }}>{isPlaying ? "stop_circle" : "volume_up"}</span>
        <span>{isPlaying ? "Stop" : "Listen"}</span>
      </button>
      {onTranslate && (
        <button onClick={onTranslate} className={`action-btn ${hasTranslation ? "action-active" : ""}`} title="Translate" disabled={isTranslating}>
          {isTranslating
            ? <span className="material-symbols-outlined" style={{ fontSize: 14 }}>sync</span>
            : <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: hasTranslation ? "'FILL' 1" : "'FILL' 0" }}>translate</span>
          }
          <span>{isTranslating ? "…" : hasTranslation ? "Hide" : "Translate"}</span>
        </button>
      )}
      <button onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="action-btn" title="Copy">
        <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: copied ? "'FILL' 1" : "'FILL' 0" }}>{copied ? "check" : "content_copy"}</span>
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
      {!isAi && onCorrect && (
        <button onClick={onCorrect} className="action-btn" title="Grammar check">
          <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>auto_fix_high</span>
          <span>Check</span>
        </button>
      )}
    </div>
  );
}

/* ─────────────── MAIN PAGE ─────────────── */
function TutorPageInner() {
  const token = useSelector((state: RootState) => state.auth.token);
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionIdFromUrl = searchParams.get("s");

  const [activeSession,       setActiveSession]       = useState<TutorSessionResponse | null>(null);
  const [messages,            setMessages]            = useState<TutorMessageResponse[]>([]);
  const [inputText,           setInputText]           = useState("");
  const [isAiStreaming,       setIsAiStreaming]        = useState(false);
  const [streamingText,       setStreamingText]       = useState("");
  const [wsStatus,            setWsStatus]            = useState("Disconnected");
  const [isRecording,         setIsRecording]         = useState(false);
  const [isTranscribing,      setIsTranscribing]      = useState(false);
  const [playingMsgId,        setPlayingMsgId]        = useState<string | null>(null);
  const [correctionTarget,    setCorrectionTarget]    = useState<{ id: string; text: string } | null>(null);
  const [translationMap,      setTranslationMap]      = useState<Record<string, string>>({});
  const [translatingId,       setTranslatingId]       = useState<string | null>(null);

  const wsRef          = useRef<WebSocket | null>(null);
  const chatBottomRef  = useRef<HTMLDivElement>(null);
  const heartbeatRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const streamRef      = useRef("");
  const mediaRecRef    = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef       = useRef<HTMLAudioElement | null>(null);
  const wsSttRef       = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const { data: sessions = [], refetch: refetchSessions } = useGetTutorSessionsQuery({ include_ended: true });
  const [createSession,  { isLoading: isCreatingSession }] = useCreateTutorSessionMutation();
  const [endSession,     { isLoading: isEndingSession   }] = useEndTutorSessionMutation();
  const [triggerGetMessages, { isFetching: isFetchingMessages }] = useLazyGetTutorMessagesQuery();
  const [translateText] = useTranslateTextMutation();

  useEffect(() => {
    if (!sessionIdFromUrl) { setActiveSession(null); return; }
    if (!sessions.length) return;
    const found = sessions.find((s) => s.id === sessionIdFromUrl);
    if (found && found.id !== activeSession?.id) setActiveSession(found);
  }, [sessionIdFromUrl, sessions]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, isAiStreaming]);

  useEffect(() => {
    if (!activeSession) { setMessages([]); cleanupWs(); return; }
    triggerGetMessages({ sessionId: activeSession.id })
      .unwrap()
      .then((data) => {
        setMessages([...data].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
        if (activeSession.is_active) connectWs(activeSession.id);
        else { cleanupWs(); setWsStatus("Session Ended"); }
      })
      .catch(console.error);
    return () => { cleanupWs(); };
  }, [activeSession?.id]);

  const connectWs = (sessId: string) => {
    cleanupWs();
    const wsDomain = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    setWsStatus("Connecting...");
    const ws = new WebSocket(`${wsDomain}/ws/tutor/${sessId}?token=${token}`);
    wsRef.current = ws;
    ws.onopen = () => {
      setWsStatus("Ready");
      heartbeatRef.current = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" })); }, 30000);
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "pong") return;
        if (msg.type === "chunk") { setIsAiStreaming(true); streamRef.current += msg.content; setStreamingText(streamRef.current); }
        else if (msg.type === "done") {
          const full = streamRef.current + (msg.content || "");
          setIsAiStreaming(false);
          setMessages((p) => [...p, { id: Math.random().toString(), session_id: sessId, role: "assistant", content: full, created_at: new Date().toISOString() }]);
          streamRef.current = ""; setStreamingText(""); refetchSessions();
        } else if (msg.type === "session_ended") {
          setWsStatus("Session Ended"); setActiveSession((p) => p ? { ...p, is_active: false } : p); cleanupWs(); refetchSessions();
        } else if (msg.type === "error") { setWsStatus(`Error: ${msg.content}`); }
      } catch { /* ignore */ }
    };
    ws.onclose = () => { setWsStatus("Disconnected"); if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
    ws.onerror = () => setWsStatus("Connection Error");
  };

  const cleanupWs = () => {
    wsRef.current?.close(); wsRef.current = null;
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = null;
    setIsAiStreaming(false); streamRef.current = ""; setStreamingText(""); setWsStatus("Disconnected");
  };

  const getAuthToken = () => token ?? (typeof window !== "undefined" ? localStorage.getItem("access_token") : null);

  /* ── Backend TTS ── */
  const handleReadAloud = async (msgId: string, text: string) => {
    if (playingMsgId === msgId) {
      audioRef.current?.pause();
      if (audioRef.current) { audioRef.current.src = ""; }
      setPlayingMsgId(null);
      return;
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    setPlayingMsgId(msgId);
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_BASE}/tutor/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) { const errText = await res.text(); throw new Error(`TTS ${res.status}: ${errText}`); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPlayingMsgId(null); URL.revokeObjectURL(url); };
      audio.onerror = (e) => { console.error("[TTS] Audio playback error:", e); setPlayingMsgId(null); URL.revokeObjectURL(url); };
      await audio.play().catch((e) => { console.error("[TTS] play() rejected:", e); setPlayingMsgId(null); });
    } catch (e) {
      console.error("[TTS] fetch error:", e);
      setPlayingMsgId(null);
    }
  };

  /* ── Translation ── */
  const handleTranslate = async (msgId: string, text: string) => {
    if (translationMap[msgId]) {
      setTranslationMap((prev) => { const n = { ...prev }; delete n[msgId]; return n; });
      return;
    }
    setTranslatingId(msgId);
    try {
      const data = await translateText({ text }).unwrap();
      setTranslationMap((prev) => ({ ...prev, [msgId]: data.translation }));
    } catch (e) {
      console.error("[Translate] error:", e);
    } finally {
      setTranslatingId(null);
    }
  };

  /* ── Backend STT (WebSocket streaming) ── */
  const closeSttWs = () => {
    if (wsSttRef.current) {
      try { wsSttRef.current.close(); } catch { /* ignore */ }
      wsSttRef.current = null;
    }
  };

  const teardownRecording = () => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    mediaRecRef.current = null;
    audioChunksRef.current = [];
  };

  const startRecording = async () => {
    if (isRecording || isTranscribing) return;
    const authToken = getAuthToken();
    if (!authToken) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      console.error("[STT] mic permission denied:", e);
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
        } else {
          setIsTranscribing(false);
        }
        setIsRecording(false);
        teardownRecording();
      };
      mr.onerror = (e) => { console.error("[STT] MediaRecorder error:", e); stopRecording(); };
      // 250ms timeslice so chunks stream live over the socket.
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
          if (text) { setInputText(text); setTimeout(adjustHeight, 0); }
          setIsTranscribing(false);
          closeSttWs();
        } else if (msg.type === "error") {
          console.error("[STT] server error:", msg.content);
          setIsTranscribing(false);
          closeSttWs();
        }
      } catch { /* ignore */ }
    };
    ws.onerror = () => { console.error("[STT] websocket error"); setIsRecording(false); setIsTranscribing(false); teardownRecording(); closeSttWs(); };
    ws.onclose = () => { setIsTranscribing(false); };
  };

  const stopRecording = () => {
    const mr = mediaRecRef.current;
    if (mr && mr.state !== "inactive") {
      try { mr.stop(); } catch { /* ignore */ }
    } else {
      setIsRecording(false);
      teardownRecording();
      closeSttWs();
    }
  };

  const adjustHeight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
  };

  const handleStartSession = async () => {
    try {
      const sess = await createSession({ title: "New Chat" }).unwrap();
      refetchSessions();
      router.push(`/tutor?s=${sess.id}` as any);
    } catch { /* ignore */ }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: "end_session" }));
      else { await endSession(activeSession.id).unwrap(); setActiveSession((p) => p ? { ...p, is_active: false } : p); refetchSessions(); }
    } catch { /* ignore */ }
  };

  const handleSendMessage = useCallback((textToSend = inputText) => {
    const trimmed = textToSend.trim();
    if (!trimmed || !activeSession || wsStatus !== "Ready") return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", content: trimmed }));
      setMessages((p) => [...p, { id: Math.random().toString(), session_id: activeSession.id, role: "user", content: trimmed, created_at: new Date().toISOString() }]);
      setInputText("");
      if (textareaRef.current) textareaRef.current.style.height = "44px";
    }
  }, [inputText, activeSession, wsStatus]);

  const statusDot = wsStatus === "Ready" ? "#3DD68C" : wsStatus === "Connecting..." ? "#E8B339" : "#555";
  const statusLabel = isAiStreaming ? "Responding…" : wsStatus === "Ready" ? "Online" : wsStatus === "Session Ended" ? "Ended" : "Offline";

  return (
    <>
      <style>{`
        .chat-scroll::-webkit-scrollbar{width:4px}.chat-scroll::-webkit-scrollbar-track{background:transparent}.chat-scroll::-webkit-scrollbar-thumb{background:#2A2A32;border-radius:9999px}
        .msg-group:hover .msg-actions{opacity:1;pointer-events:auto}
        .msg-actions{opacity:0;pointer-events:none;transition:opacity 0.15s ease}
        .action-btn{display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:8px;border:none;background:transparent;cursor:pointer;font-size:11px;color:rgba(255,255,255,0.3);transition:all 0.15s}
        .action-btn:hover{color:rgba(255,255,255,0.65);background:rgba(255,255,255,0.05)}
        .action-active{color:#6E5BFF!important;background:rgba(110,91,255,0.12)!important}
        .prose-chat{font-size:15px;line-height:1.8;color:rgba(255,255,255,0.82)}
      `}</style>

      {correctionTarget && (
        <CorrectionModal
          text={correctionTarget.text}
          onClose={() => setCorrectionTarget(null)}
          token={token}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-h-0" style={{ background: "#0D0D11" }}>
        {activeSession ? (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px", height: 54, borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(13,13,17,0.95)", backdropFilter: "blur(12px)", flexShrink: 0 }}>
              <AiAvatar size={30} pulse={isAiStreaming} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{AI_PERSONA.name}</span>
                  <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid rgba(110,91,255,0.25)", background: "rgba(110,91,255,0.08)", color: "rgba(110,91,255,0.75)", fontWeight: 500 }}>{AI_PERSONA.role}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: statusDot, display: "inline-block" }} />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{statusLabel}</span>
                </div>
              </div>
              {activeSession.is_active && (
                <button
                  onClick={handleEndSession}
                  disabled={isEndingSession}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#F87171", border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.07)", padding: "6px 12px", borderRadius: 9999, cursor: "pointer", transition: "all 0.15s" }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>call_end</span>
                  <span className="hidden sm:inline">End</span>
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 chat-scroll" style={{ overflowY: "auto", padding: "32px 0" }}>
              <div style={{ width: "100%", maxWidth: 720, margin: "0 auto", padding: "0 20px", display: "flex", flexDirection: "column", gap: 4 }}>
                {isFetchingMessages && !messages.length ? (
                  [1, 2].map((n) => (
                    <div key={n} className="animate-pulse" style={{ marginBottom: 24 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
                        <div style={{ width: 60, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)" }} />
                      </div>
                      <div style={{ height: 60, borderRadius: 12, background: "rgba(255,255,255,0.04)", marginLeft: 28 }} />
                    </div>
                  ))
                ) : (
                  <>
                    <AnimatePresence initial={false}>
                      {messages.map((m, idx) => {
                        const isAi = m.role === "assistant" || m.role === "system";
                        const prev = messages[idx - 1];
                        const grouped = prev && ((prev.role === "assistant" || prev.role === "system") === isAi);

                        return (
                          <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.18 }}
                            className="msg-group"
                            style={{ display: "flex", flexDirection: "column", alignItems: isAi ? "flex-start" : "flex-end", marginTop: grouped ? 2 : 24 }}
                          >
                            {!grouped && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexDirection: isAi ? "row" : "row-reverse" }}>
                                {isAi ? <AiAvatar size={20} /> : (
                                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>person</span>
                                  </div>
                                )}
                                <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.38)" }}>{isAi ? AI_PERSONA.name : "You"}</span>
                                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{formatTime(m.created_at)}</span>
                              </div>
                            )}

                            {isAi ? (
                              <div className="prose-chat" style={{ maxWidth: "90%", paddingLeft: 28 }}>
                                <ChatMarkdown content={m.content} />
                                {translationMap[m.id] && (
                                  <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.025)", borderLeft: "2px solid rgba(110,91,255,0.35)" }}>
                                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Translation</p>
                                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{translationMap[m.id]}</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <div style={{ maxWidth: "80%", fontSize: 15, lineHeight: 1.75, padding: "10px 16px", borderRadius: "18px 18px 4px 18px", color: "rgba(255,255,255,0.88)", background: "#1E1E2A", border: "1px solid rgba(255,255,255,0.07)" }}>
                                  {m.content}
                                </div>
                                {translationMap[m.id] && (
                                  <div style={{ maxWidth: "80%", marginTop: 6, padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,0.025)", borderLeft: "2px solid rgba(110,91,255,0.35)" }}>
                                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Translation</p>
                                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{translationMap[m.id]}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            <div style={{ paddingLeft: isAi ? 28 : 0 }}>
                              <MessageActionBar
                                isAi={isAi}
                                content={m.content}
                                onReadAloud={() => handleReadAloud(m.id, m.content)}
                                isPlaying={playingMsgId === m.id}
                                onCorrect={!isAi ? () => setCorrectionTarget({ id: m.id, text: m.content }) : undefined}
                                onTranslate={() => handleTranslate(m.id, m.content)}
                                isTranslating={translatingId === m.id}
                                hasTranslation={!!translationMap[m.id]}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {/* Streaming */}
                    {isAiStreaming && streamingText && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginTop: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <AiAvatar size={20} pulse />
                          <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.38)" }}>{AI_PERSONA.name}</span>
                        </div>
                        <div className="prose-chat" style={{ maxWidth: "90%", paddingLeft: 28 }}>
                          <ChatMarkdown content={streamingText} />
                          <span style={{ display: "inline-block", width: 2, height: 18, marginLeft: 2, background: "#6E5BFF", borderRadius: 2, verticalAlign: "text-bottom" }} className="animate-pulse" />
                        </div>
                      </motion.div>
                    )}

                    {isAiStreaming && !streamingText && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginTop: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <AiAvatar size={20} pulse />
                          <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.38)" }}>{AI_PERSONA.name}</span>
                        </div>
                        <div style={{ paddingLeft: 28, display: "flex", gap: 6, padding: "6px 0 6px 28px" }}>
                          {[0, 1, 2].map((i) => (
                            <motion.div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.25)" }}
                              animate={{ y: [0, -5, 0] }} transition={{ duration: 0.65, repeat: Infinity, delay: i * 0.13 }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={chatBottomRef} style={{ height: 8 }} />
              </div>
            </div>

            {/* Input */}
            {activeSession.is_active ? (
              <div style={{ flexShrink: 0, padding: "12px 20px 24px", background: "#0D0D11" }}>
                <div style={{ width: "100%", maxWidth: 720, margin: "0 auto" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: "#161621", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: 8, transition: "border-color 0.2s" }}
                    onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(110,91,255,0.4)"; }}
                    onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; }}>
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={(e) => { setInputText(e.target.value); adjustHeight(); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                      placeholder={`Message ${AI_PERSONA.name}…`}
                      disabled={wsStatus !== "Ready"}
                      rows={1}
                      style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "rgba(255,255,255,0.85)", fontSize: 14, resize: "none", minHeight: 44, maxHeight: 128, overflowY: "auto", padding: "10px 12px", lineHeight: 1.6 }}
                      className="placeholder:text-white/25 disabled:opacity-40"
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 4, paddingRight: 4, flexShrink: 0 }}>
                      <div style={{ position: "relative" }}>
                        {isRecording && <div className="absolute inset-0 rounded-xl bg-red-500 animate-ping opacity-20 pointer-events-none" style={{ borderRadius: 10 }} />}
                        <button
                          onMouseDown={startRecording}
                          onMouseUp={stopRecording}
                          onTouchStart={startRecording}
                          onTouchEnd={stopRecording}
                          disabled={wsStatus !== "Ready" || isTranscribing}
                          title={isTranscribing ? "Transcribing…" : "Hold to record voice (English)"}
                          style={{ position: "relative", width: 36, height: 36, borderRadius: 10, border: isRecording ? "none" : "1px solid rgba(255,255,255,0.08)", background: isRecording ? "#EF4444" : isTranscribing ? "rgba(110,91,255,0.15)" : "transparent", color: isRecording ? "#fff" : isTranscribing ? "#6E5BFF" : "rgba(255,255,255,0.35)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: isRecording ? "'FILL' 1" : "'FILL' 0" }}>
                            {isTranscribing ? "sync" : "mic"}
                          </span>
                        </button>
                      </div>
                      <button
                        onClick={() => handleSendMessage()}
                        disabled={!inputText.trim() || wsStatus !== "Ready"}
                        style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: "#6E5BFF", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: (!inputText.trim() || wsStatus !== "Ready") ? 0.25 : 1, transition: "all 0.15s", boxShadow: "0 0 12px rgba(110,91,255,0.35)" }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_upward</span>
                      </button>
                    </div>
                  </div>
                  <p style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.18)", marginTop: 8 }}>
                    Hold mic to record · <kbd style={{ fontFamily: "monospace", color: "rgba(255,255,255,0.22)" }}>Enter</kbd> send · <kbd style={{ fontFamily: "monospace", color: "rgba(255,255,255,0.22)" }}>Shift+Enter</kbd> new line
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ flexShrink: 0, padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>This session has ended.</span>
                  <button onClick={handleStartSession} disabled={isCreatingSession}
                    style={{ background: "#6E5BFF", color: "#fff", fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", opacity: isCreatingSession ? 0.6 : 1 }}>
                    New Chat
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty state */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", gap: 24, textAlign: "center" }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,rgba(110,91,255,0.15),rgba(139,124,255,0.06))", border: "1px solid rgba(110,91,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 34, fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
              </div>
              <div style={{ position: "absolute", bottom: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: "#3DD68C", border: "2px solid #0D0D11" }} />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{AI_PERSONA.name}</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{AI_PERSONA.role}</p>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", lineHeight: 1.6, marginTop: 12, maxWidth: 380 }}>
                Practice conversation, get instant grammar corrections, and improve fluency with your personal AI tutor.
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
              {[
                { icon: "volume_up",     label: "Backend TTS"    },
                { icon: "mic",           label: "Voice input"    },
                { icon: "auto_fix_high", label: "Grammar check"  },
                { icon: "markdown",      label: "Rich responses" },
              ].map((f) => (
                <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 9999, fontSize: 12, color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
                  {f.label}
                </div>
              ))}
            </div>
            <button onClick={handleStartSession} disabled={isCreatingSession}
              style={{ background: "#6E5BFF", color: "#fff", fontWeight: 600, padding: "12px 28px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", fontSize: 15, opacity: isCreatingSession ? 0.6 : 1, boxShadow: "0 0 24px rgba(110,91,255,0.25)" }}>
              {isCreatingSession ? "Starting…" : "Start New Chat"}
            </button>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Or select a session from the sidebar</p>
          </div>
        )}
      </div>
    </>
  );
}

export default function TutorPage() {
  return (
    <Suspense fallback={
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#0D0D11" }}>
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <TutorPageInner />
    </Suspense>
  );
}

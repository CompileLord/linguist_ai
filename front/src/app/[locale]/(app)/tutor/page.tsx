"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import {
  useGetTutorSessionsQuery,
  useCreateTutorSessionMutation,
  useEndTutorSessionMutation,
  useLazyGetTutorMessagesQuery,
  TutorSessionResponse,
  TutorMessageResponse,
} from "@/services/tutorApi";

const AI_PERSONA = { name: "Elena", role: "Conversational Tutor" };


function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const diffSec = (new Date().getTime() - d.getTime()) / 1000;
  if (diffSec < 60)    return "just now";
  if (diffSec < 3600)  return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  const days = Math.floor(diffSec / 86400);
  if (days === 1) return "yesterday";
  if (days < 7)   return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function AiAvatar({ size = 28, pulse = false }: { size?: number; pulse?: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {pulse && (
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{ backgroundColor: "#6E5BFF", opacity: 0.3 }}
        />
      )}
      <div
        className="relative w-full h-full rounded-full flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #6E5BFF 0%, #8B7CFF 100%)",
          boxShadow: pulse ? "0 0 14px rgba(110,91,255,0.45)" : "none",
        }}
      >
        <span
          className="material-symbols-outlined text-white"
          style={{ fontSize: size * 0.52, fontVariationSettings: "'FILL' 1" }}
        >
          smart_toy
        </span>
      </div>
    </div>
  );
}

export default function TutorPage() {
  const token = useSelector((state: RootState) => state.auth.token);

  const [activeSession,  setActiveSession]  = useState<TutorSessionResponse | null>(null);
  const [messages,       setMessages]       = useState<TutorMessageResponse[]>([]);
  const [inputText,      setInputText]      = useState("");
  const [isAiStreaming,  setIsAiStreaming]   = useState(false);
  const [streamingText,  setStreamingText]  = useState("");
  const [wsStatus,       setWsStatus]       = useState("Disconnected");
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [isVoiceActive,  setIsVoiceActive]  = useState(false);
  const [microFeedback,  setMicroFeedback]  = useState<string | null>(null);

  const wsRef         = useRef<WebSocket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const heartbeatRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const streamRef     = useRef("");

  const { data: sessions = [], isLoading: isLoadingSessions, refetch: refetchSessions } =
    useGetTutorSessionsQuery({ include_ended: true });
  const [createSession, { isLoading: isCreatingSession }] = useCreateTutorSessionMutation();
  const [endSession,    { isLoading: isEndingSession    }] = useEndTutorSessionMutation();
  const [triggerGetMessages, { isFetching: isFetchingMessages }] = useLazyGetTutorMessagesQuery();

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, isAiStreaming]);

  useEffect(() => {
    if (activeSession) {
      triggerGetMessages({ sessionId: activeSession.id })
        .unwrap()
        .then((data) => {
          const sorted = [...data].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          setMessages(sorted);
          if (activeSession.is_active) connectWebSocket(activeSession.id);
          else { cleanupWebSocket(); setWsStatus("Session Ended"); }
        })
        .catch((err) => console.error("Failed to load messages:", err));
    } else {
      setMessages([]);
      cleanupWebSocket();
    }
    return () => { cleanupWebSocket(); };
  }, [activeSession]);

  const connectWebSocket = (sessId: string) => {
    cleanupWebSocket();
    const wsDomain = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    setWsStatus("Connecting...");
    const ws = new WebSocket(`${wsDomain}/ws/tutor/${sessId}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("Ready");
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "pong") return;
        if (msg.type === "chunk") {
          setIsAiStreaming(true);
          streamRef.current += msg.content;
          setStreamingText(streamRef.current);
        } else if (msg.type === "done") {
          const fullText = streamRef.current + (msg.content || "");
          setIsAiStreaming(false);
          setMessages((prev) => [
            ...prev,
            { id: Math.random().toString(), session_id: sessId, role: "assistant", content: fullText, created_at: new Date().toISOString() },
          ]);
          streamRef.current = "";
          setStreamingText("");
          refetchSessions();
        } else if (msg.type === "session_ended") {
          setWsStatus("Session Ended");
          setActiveSession((prev) => prev ? { ...prev, is_active: false } : prev);
          cleanupWebSocket();
          refetchSessions();
        } else if (msg.type === "error") {
          setWsStatus(`Error: ${msg.content}`);
        }
      } catch (err) {
        console.error("Error parsing WS packet:", err);
      }
    };

    ws.onclose = () => {
      setWsStatus("Disconnected");
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
    ws.onerror = () => setWsStatus("Connection Error");
  };

  const cleanupWebSocket = () => {
    wsRef.current?.close();
    wsRef.current = null;
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = null;
    setIsAiStreaming(false);
    streamRef.current = "";
    setStreamingText("");
    setWsStatus("Disconnected");
  };

  const adjustHeight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
  };

  const startVoiceInput = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.onresult = (e: any) => {
      setInputText(e.results[0][0].transcript);
      setTimeout(adjustHeight, 0);
    };
    recognition.onend  = () => setIsVoiceActive(false);
    recognition.onerror = () => setIsVoiceActive(false);
    recognition.start();
    setIsVoiceActive(true);
  };

  const handleStartSession = async () => {
    try {
      const response = await createSession({ title: "New Chat" }).unwrap();
      setActiveSession(response);
      setSidebarOpen(false);
      refetchSessions();
    } catch (err) {
      console.error("Failed to start tutor session:", err);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "end_session" }));
      } else {
        await endSession(activeSession.id).unwrap();
        setActiveSession({ ...activeSession, is_active: false });
        refetchSessions();
      }
    } catch (err) {
      console.error("Failed to end session:", err);
    }
  };

  const handleSendMessage = useCallback((textToSend = inputText) => {
    const trimmed = textToSend.trim();
    if (!trimmed || !activeSession || wsStatus !== "Ready") return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", content: trimmed }));
      setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(), session_id: activeSession.id, role: "user", content: trimmed, created_at: new Date().toISOString() },
      ]);
      setInputText("");
      if (textareaRef.current) textareaRef.current.style.height = "44px";
      setMicroFeedback("Analyzing your response…");
      setTimeout(() => setMicroFeedback(null), 1800);
    }
  }, [inputText, activeSession, wsStatus]);

  const activeChatList      = sessions.filter((s) => s.is_active);
  const filteredPastSessions = sessions
    .filter((s) => !s.is_active)
    .filter((s) => !searchQuery || (s.title || "").toLowerCase().includes(searchQuery.toLowerCase()));

  const statusConfig: Record<string, { dot: string; label: string }> = {
    "Ready":           { dot: "#3DD68C", label: "Online"      },
    "Connecting...":   { dot: "#E8B339", label: "Connecting"  },
    "Session Ended":   { dot: "#9A9AA5", label: "Ended"       },
    "Disconnected":    { dot: "#9A9AA5", label: "Offline"     },
  };
  const status = statusConfig[wsStatus] ?? { dot: "#E8B339", label: wsStatus };

  return (
    <>
      <style>{`
        @keyframes pulse-line {
          0%   { background-position: 0%   50%; opacity: 0.5; }
          50%  { background-position: 100% 50%; opacity: 1;   filter: drop-shadow(0 0 6px rgba(139,124,255,0.5)); }
          100% { background-position: 0%   50%; opacity: 0.5; }
        }
        .living-line {
          background: linear-gradient(90deg, #6E5BFF, #B0A3FF, #6E5BFF);
          background-size: 200% 100%;
          animation: pulse-line 2.5s ease-in-out infinite;
        }
        .chat-scroll::-webkit-scrollbar       { width: 4px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: #2A2A32; border-radius: 9999px; }
        .tutor-bg {
          background-image:
            radial-gradient(ellipse at 12% 20%, rgba(110,91,255,0.045) 0%, transparent 52%),
            radial-gradient(ellipse at 88% 82%, rgba(139,124,255,0.03) 0%, transparent 52%);
        }
      `}</style>

      <div className="flex-1 relative flex overflow-hidden bg-[#0A0A0C] animate-fade-in min-h-0">

        {/* Mobile backdrop */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-30 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* ── Sidebar ── */}
        <aside
          className={`absolute md:relative z-40 md:z-auto h-full w-72 md:w-64 shrink-0 border-r border-[#2A2A32] bg-[#15151A] flex flex-col transition-transform duration-300 ease-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          {/* Sidebar top */}
          <div className="p-3 space-y-2.5 border-b border-[#2A2A32]">
            <button
              onClick={handleStartSession}
              disabled={isCreatingSession}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-xl active:scale-[0.97] transition-all shadow-[0_0_16px_rgba(110,91,255,0.25)] border border-[#8B7CFF]/30"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              {isCreatingSession ? "Starting…" : "New Chat"}
            </button>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[15px] text-on-surface-variant/50 pointer-events-none">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sessions…"
                className="w-full bg-[#1C1C24] border border-[#2A2A32] rounded-lg pl-8 pr-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/45 focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
            {/* Active sessions */}
            {activeChatList.length > 0 && (
              <div className="space-y-0.5">
                <span className="px-2 text-[10px] font-bold uppercase tracking-widest text-primary/80 block mb-1.5">Live</span>
                {activeChatList.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setActiveSession(s); setSidebarOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${
                      activeSession?.id === s.id
                        ? "bg-primary/12 border border-primary/30"
                        : "hover:bg-[#1E1E24] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <AiAvatar size={26} pulse={activeSession?.id === s.id} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3DD68C] shrink-0" />
                          <span className={`text-sm truncate font-medium ${activeSession?.id === s.id ? "text-primary" : "text-on-surface"}`}>
                            {s.title || "AI Tutor Session"}
                          </span>
                        </div>
                        <span className="text-[10px] text-on-surface-variant/55 mt-0.5 block">{s.message_count} messages</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* History */}
            <div className="space-y-0.5">
              <span className="px-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/55 block mb-1.5">History</span>
              {isLoadingSessions ? (
                <div className="space-y-1.5 px-1">
                  {[1, 2, 3].map((n) => <div key={n} className="h-12 bg-[#1E1E24] rounded-xl animate-pulse" />)}
                </div>
              ) : filteredPastSessions.length === 0 ? (
                <p className="px-2 text-[11px] text-on-surface-variant/50 italic">
                  {searchQuery ? "No matching sessions." : "No past sessions yet."}
                </p>
              ) : (
                filteredPastSessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setActiveSession(s); setSidebarOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${
                      activeSession?.id === s.id
                        ? "bg-primary/10 border border-primary/25"
                        : "hover:bg-[#1E1E24] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#2A2A32] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[13px] text-on-surface-variant/45">chat_bubble</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`text-sm truncate block leading-snug ${activeSession?.id === s.id ? "text-primary font-medium" : "text-on-surface-variant"}`}>
                          {s.title || "Past Session"}
                        </span>
                        <span className="text-[10px] text-on-surface-variant/40">{formatTimestamp(s.started_at)}</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* ── Main area ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeSession ? (
            <>
              {/* Header */}
              <div className="shrink-0 flex items-center gap-3 px-4 md:px-5 h-14 border-b border-[#2A2A32] bg-[#15151A]/90 backdrop-blur-md">
                <button
                  className="md:hidden text-on-surface-variant hover:text-on-surface p-1.5 rounded-lg transition-colors"
                  onClick={() => setSidebarOpen(true)}
                >
                  <span className="material-symbols-outlined text-[20px]">menu</span>
                </button>

                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <AiAvatar size={34} pulse={isAiStreaming} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-on-surface">{AI_PERSONA.name}</span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary/80 leading-none">
                        {AI_PERSONA.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: status.dot }} />
                      <span className="text-[10px] text-on-surface-variant">
                        {isAiStreaming ? "Responding…" : status.label}
                      </span>
                    </div>
                  </div>
                </div>

                {activeSession.is_active && (
                  <button
                    onClick={handleEndSession}
                    disabled={isEndingSession}
                    className="shrink-0 flex items-center gap-1.5 text-xs text-error hover:bg-error/10 border border-error/25 hover:border-error/50 px-3 py-1.5 rounded-full transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[14px]">call_end</span>
                    <span className="hidden sm:inline">End Chat</span>
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto chat-scroll py-8 flex flex-col tutor-bg bg-[#0A0A0C]">
                <div className="w-full max-w-2xl mx-auto px-4 md:px-6 flex flex-col gap-6">
                {isFetchingMessages && messages.length === 0 ? (
                  <div className="space-y-8">
                    {[1, 2].map((n) => (
                      <div key={n} className="animate-pulse flex gap-3 max-w-[85%]">
                        <div className="w-8 h-8 rounded-full bg-[#1E1E24] shrink-0" />
                        <div className="flex-1 space-y-2.5">
                          <div className="h-3 w-20 rounded bg-[#1E1E24]" />
                          <div className="h-20 rounded-2xl bg-[#1E1E24]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <AnimatePresence initial={false}>
                      {messages.map((m) => {
                        const isAi = m.role === "assistant" || m.role === "system";
                        return (
                          <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className={isAi
                              ? "flex items-start gap-3"
                              : "flex flex-col items-end self-end max-w-[82%]"
                            }
                          >
                            {isAi ? (
                              <>
                                <AiAvatar size={30} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <span className="text-[11px] font-semibold text-on-surface-variant">{AI_PERSONA.name}</span>
                                    <span className="text-[10px] text-on-surface-variant/30">{formatTimestamp(m.created_at)}</span>
                                  </div>
                                  <div className="text-[15px] text-on-surface leading-[1.7]">
                                    {m.content}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center gap-1.5 mb-2 self-end">
                                  <span className="text-[10px] text-on-surface-variant/30">{formatTimestamp(m.created_at)}</span>
                                  <span className="text-[11px] font-semibold text-on-surface-variant">You</span>
                                </div>
                                <div
                                  className="text-[15px] leading-[1.7] px-5 py-3 rounded-2xl rounded-tr-sm text-on-surface"
                                  style={{ backgroundColor: "#1E1E24", border: "1px solid #2A2A32" }}
                                >
                                  {m.content}
                                </div>
                              </>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {/* Streaming text */}
                    {isAiStreaming && streamingText && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3"
                      >
                        <AiAvatar size={30} pulse />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-[11px] font-semibold text-on-surface-variant">{AI_PERSONA.name}</span>
                          </div>
                          <div className="text-[15px] text-on-surface leading-[1.7]">
                            {streamingText}
                            <span className="inline-block w-0.5 h-[18px] ml-0.5 bg-primary animate-pulse rounded-sm align-text-bottom" />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Typing dots */}
                    {isAiStreaming && !streamingText && (
                      <div className="flex items-start gap-3">
                        <AiAvatar size={30} pulse />
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-[11px] font-semibold text-on-surface-variant">{AI_PERSONA.name}</span>
                          </div>
                          <div className="flex gap-1.5 py-2 px-0"
                          >
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-primary/60"
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.14, ease: "easeInOut" }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={chatBottomRef} className="h-2" />
                </div>
              </div>

              {/* Input area */}
              {activeSession.is_active ? (
                <div className="shrink-0 border-t border-[#2A2A32] bg-[#0A0A0C]/95 backdrop-blur-md pt-3 pb-4">
                  <div className="w-full max-w-2xl mx-auto px-4 md:px-6 space-y-2.5">
                  {/* Micro-feedback */}
                  <AnimatePresence>
                    {microFeedback && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5 text-[11px] text-primary/65"
                      >
                        <span className="material-symbols-outlined text-[13px] animate-pulse">psychology</span>
                        {microFeedback}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Input row */}
                  <div className="flex items-end gap-2">
                    {/* Textarea container */}
                    <div className="flex-1 bg-[#1C1C24] border border-[#2A2A32] rounded-2xl flex items-end p-2 transition-all duration-200 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
                      <textarea
                        ref={textareaRef}
                        value={inputText}
                        onChange={(e) => { setInputText(e.target.value); adjustHeight(); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder={`Message ${AI_PERSONA.name}…`}
                        disabled={wsStatus !== "Ready"}
                        rows={1}
                        className="flex-1 bg-transparent border-none text-on-surface text-sm placeholder:text-on-surface-variant/45 focus:outline-none focus:ring-0 resize-none py-2 px-2 leading-relaxed disabled:opacity-50"
                        style={{ minHeight: "44px", maxHeight: "128px", overflowY: "auto" }}
                      />
                      <div className="flex items-center gap-1 px-1 pb-1 shrink-0">
                        {inputText.length > 60 && (
                          <span className="text-[10px] text-on-surface-variant/35 tabular-nums mr-1">{inputText.length}</span>
                        )}
                        <button
                          type="button"
                          title="Attach file"
                          className="text-on-surface-variant/45 hover:text-on-surface-variant p-1.5 rounded-lg active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">attach_file</span>
                        </button>
                        <button
                          onClick={() => handleSendMessage()}
                          disabled={!inputText.trim() || wsStatus !== "Ready"}
                          className="bg-primary text-white p-2 rounded-xl hover:bg-primary/90 disabled:opacity-35 active:scale-[0.95] transition-all shadow-[0_0_10px_rgba(110,91,255,0.3)]"
                        >
                          <span className="material-symbols-outlined text-[18px]">send</span>
                        </button>
                      </div>
                    </div>

                    {/* Voice button */}
                    <div className="relative shrink-0">
                      {isVoiceActive && (
                        <div className="absolute inset-0 rounded-xl bg-error animate-ping opacity-30 pointer-events-none" />
                      )}
                      <button
                        onClick={startVoiceInput}
                        disabled={isVoiceActive || wsStatus !== "Ready"}
                        title={isVoiceActive ? "Listening…" : "Voice input"}
                        className={`relative w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-200 ${
                          isVoiceActive
                            ? "bg-error border-error/50 text-white shadow-[0_0_14px_rgba(255,92,108,0.45)]"
                            : "bg-[#1C1C24] border-[#2A2A32] text-on-surface-variant hover:border-primary/50 hover:text-primary active:scale-90"
                        }`}
                      >
                        <span
                          className="material-symbols-outlined text-[20px]"
                          style={{ fontVariationSettings: isVoiceActive ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          mic
                        </span>
                      </button>
                    </div>
                  </div>

                  <p className="text-center text-[10px] text-on-surface-variant/35">
                    AI Tutor can make mistakes. Verify important information.
                  </p>
                  </div>
                </div>
              ) : (
                <div className="shrink-0 border-t border-[#2A2A32] bg-[#0A0A0C]/95 px-6 py-4">
                  <div className="w-full max-w-2xl mx-auto flex items-center justify-between">
                    <span className="text-sm text-on-surface-variant">This session has ended.</span>
                    <button
                      onClick={handleStartSession}
                      disabled={isCreatingSession}
                      className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/90 disabled:opacity-60 active:scale-95 transition-all"
                    >
                      Start New Chat
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ── Empty state ── */
            <div className="relative flex-1 flex flex-col items-center justify-center text-center px-8 gap-5">
              <button
                className="absolute top-4 left-4 md:hidden text-on-surface-variant hover:text-on-surface p-1.5 rounded-lg"
                onClick={() => setSidebarOpen(true)}
              >
                <span className="material-symbols-outlined text-[20px]">menu</span>
              </button>

              <div className="relative">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(110,91,255,0.14) 0%, rgba(139,124,255,0.07) 100%)",
                    border: "1px solid rgba(110,91,255,0.22)",
                    boxShadow: "0 0 40px rgba(110,91,255,0.08)",
                  }}
                >
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontSize: 40, fontVariationSettings: "'FILL' 1" }}
                  >
                    smart_toy
                  </span>
                </div>
                <div
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0A0A0C] flex items-center justify-center"
                  style={{ backgroundColor: "#3DD68C" }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>

              <div>
                <h2 className="font-headline-md text-xl font-bold text-on-surface">
                  {AI_PERSONA.name} &mdash; {AI_PERSONA.role}
                </h2>
                <p className="text-on-surface-variant text-sm leading-relaxed mt-2" style={{ maxWidth: "26rem", wordBreak: "normal" }}>
                  Ask grammar questions, get instant explanations, practice translations, or dive deep into any language topic — your tutor is always ready.
                </p>
              </div>

              <button
                onClick={handleStartSession}
                disabled={isCreatingSession}
                className="bg-primary text-white font-semibold px-7 py-3 rounded-xl hover:bg-primary/90 disabled:opacity-60 active:scale-95 transition-all shadow-[0_0_20px_rgba(110,91,255,0.3)] border border-[#8B7CFF]/30"
              >
                {isCreatingSession ? "Starting…" : "Start a New Chat"}
              </button>

              {filteredPastSessions.length > 0 && (
                <p className="text-[12px] text-on-surface-variant/55">
                  Or select a previous session from the sidebar
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

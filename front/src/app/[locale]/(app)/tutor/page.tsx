"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function TutorPage() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations("Lessons"); // Reusing translations
  const token = useSelector((state: RootState) => state.auth.token);

  // States
  const [activeSession, setActiveSession] = useState<TutorSessionResponse | null>(null);
  const [messages, setMessages] = useState<TutorMessageResponse[]>([]);
  const [inputText, setInputText] = useState("");
  const [isAiStreaming, setIsAiStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [wsStatus, setWsStatus] = useState("Disconnected");

  // WebSocket and UI refs
  const wsRef = useRef<WebSocket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const heartbeatIntervalRef = useRef<any>(null);

  // Queries & Mutations
  const { data: sessions = [], isLoading: isLoadingSessions, refetch: refetchSessions } =
    useGetTutorSessionsQuery({ include_ended: true });
  
  const [createSession, { isLoading: isCreatingSession }] = useCreateTutorSessionMutation();
  const [endSession, { isLoading: isEndingSession }] = useEndTutorSessionMutation();
  const [triggerGetMessages, { isFetching: isFetchingMessages }] = useLazyGetTutorMessagesQuery();

  // Scroll to bottom helper
  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, isAiStreaming]);

  // Load message logs when active session changes
  useEffect(() => {
    if (activeSession) {
      triggerGetMessages({ sessionId: activeSession.id })
        .unwrap()
        .then((data) => {
          // Sort messages ascending by created_at time
          const sorted = [...data].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          setMessages(sorted);
          if (activeSession.is_active) {
            connectWebSocket(activeSession.id);
          } else {
            cleanupWebSocket();
            setWsStatus("Session Ended");
          }
        })
        .catch((err) => console.error("Failed to load session messages:", err));
    } else {
      setMessages([]);
      cleanupWebSocket();
    }

    return () => {
      cleanupWebSocket();
    };
  }, [activeSession]);

  // WebSocket connection handler
  const connectWebSocket = (sessId: string) => {
    cleanupWebSocket();

    const wsDomain = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    const wsUrl = `${wsDomain}/ws/tutor/${sessId}?token=${token}`;
    
    setWsStatus("Connecting...");
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("Ready");
      // Setup heartbeat ping every 30 seconds
      heartbeatIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "pong") {
          // Heartbeat answer
          return;
        }

        if (msg.type === "chunk") {
          setIsAiStreaming(true);
          setStreamingText((prev) => prev + msg.content);
        } else if (msg.type === "done") {
          setIsAiStreaming(false);
          // Append streaming response to standard chat list
          setMessages((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              session_id: sessId,
              role: "assistant",
              content: streamingText + (msg.content || ""),
              created_at: new Date().toISOString(),
            },
          ]);
          setStreamingText("");
          refetchSessions();
        } else if (msg.type === "session_ended") {
          setWsStatus("Session Ended");
          if (activeSession) {
            setActiveSession({ ...activeSession, is_active: false });
          }
          cleanupWebSocket();
          refetchSessions();
        } else if (msg.type === "error") {
          console.error("WS message error:", msg.content);
          setWsStatus(`Error: ${msg.content}`);
        }
      } catch (err) {
        console.error("Error parsing WebSocket packet:", err);
      }
    };

    ws.onclose = () => {
      setWsStatus("Disconnected");
      clearInterval(heartbeatIntervalRef.current);
    };

    ws.onerror = (err) => {
      console.error("WS error details:", err);
      setWsStatus("Connection Error");
    };
  };

  const cleanupWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    setIsAiStreaming(false);
    setStreamingText("");
    setWsStatus("Disconnected");
  };

  const handleStartSession = async () => {
    try {
      const response = await createSession({}).unwrap();
      setActiveSession(response);
      refetchSessions();
    } catch (err) {
      console.error("Failed to start new tutor session:", err);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "end_session" }));
      } else {
        await endSession(activeSession.id).unwrap();
        setActiveSession({ ...activeSession, is_active: false });
        refetchSessions();
      }
    } catch (err) {
      console.error("Failed to end active session:", err);
    }
  };

  const handleSendMessage = (textToSend = inputText) => {
    const trimmed = textToSend.trim();
    if (!trimmed || !activeSession || wsStatus !== "Ready") return;

    // Send via socket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", content: trimmed }));
      
      // Append local message bubble immediately
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          session_id: activeSession.id,
          role: "user",
          content: trimmed,
          created_at: new Date().toISOString(),
        },
      ]);
      setInputText("");
    }
  };

  const activeChatList = sessions.filter((s) => s.is_active);
  const pastChatList = sessions.filter((s) => !s.is_active);

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-[#0A0A0C] border border-[#2A2A32] rounded-xl overflow-hidden animate-fade-in">
      {/* Sidebar - Sessions List */}
      <aside className="w-64 border-r border-[#2A2A32] bg-[#15151A] flex flex-col justify-between">
        <div className="p-sm flex flex-col gap-sm overflow-y-auto flex-1 custom-scrollbar">
          <Button
            onClick={handleStartSession}
            disabled={isCreatingSession}
            className="w-full flex items-center justify-center gap-xs"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Chat
          </Button>

          {/* Active Chats list */}
          {activeChatList.length > 0 && (
            <div className="space-y-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Active Session
              </span>
              {activeChatList.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSession(s)}
                  className={`w-full text-left px-sm py-2 rounded-lg text-body-sm transition-all active:scale-[0.96] border flex items-center gap-sm ${
                    activeSession?.id === s.id
                      ? "bg-primary/10 border-primary text-primary font-semibold"
                      : "bg-[#1E1E24] border-[#2A2A32] text-on-surface hover:border-primary/50"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm animate-pulse text-primary">
                    forum
                  </span>
                  <span className="truncate flex-1">{s.title || "AI Tutor Session"}</span>
                </button>
              ))}
            </div>
          )}

          {/* History Chats list */}
          <div className="space-y-xs pt-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              History Chats
            </span>
            {isLoadingSessions ? (
              <div className="space-y-xs">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-9 bg-[#1E1E24] rounded animate-pulse w-full"></div>
                ))}
              </div>
            ) : pastChatList.length === 0 && activeChatList.length === 0 ? (
              <p className="text-[11px] text-on-surface-variant italic">No chat sessions found.</p>
            ) : (
              pastChatList.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSession(s)}
                  className={`w-full text-left px-sm py-2 rounded-lg text-body-sm transition-all active:scale-[0.96] border flex items-center gap-sm ${
                    activeSession?.id === s.id
                      ? "bg-primary/10 border-primary text-primary font-semibold"
                      : "bg-[#1E1E24]/40 border-transparent text-on-surface-variant hover:text-on-surface hover:border-[#2A2A32]"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm opacity-50">chat_bubble</span>
                  <span className="truncate flex-1">{s.title || "Archived Chat"}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Primary Workspace Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0A0A0C]">
        {activeSession ? (
          <>
            {/* Header info bar */}
            <div className="px-md py-sm border-b border-[#2A2A32] bg-[#15151A] flex justify-between items-center">
              <div>
                <h2 className="font-headline-md text-sm font-bold text-on-surface">
                  {activeSession.title || "AI Tutor Session"}
                </h2>
                <div className="flex items-center gap-xs mt-0.5">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      wsStatus === "Ready" ? "bg-success" : "bg-warning animate-pulse"
                    }`}
                  ></span>
                  <span className="text-[10px] text-on-surface-variant uppercase font-mono">
                    {wsStatus}
                  </span>
                </div>
              </div>

              {activeSession.is_active && (
                <Button
                  onClick={handleEndSession}
                  disabled={isEndingSession}
                  variant="outline"
                  className="text-xs py-1 px-3 border-error/30 hover:bg-error/10 hover:text-error"
                >
                  End Chat
                </Button>
              )}
            </div>

            {/* Messages Thread Container */}
            <div className="flex-1 overflow-y-auto p-md space-y-md chat-scroll bg-gradient-to-b from-[#0A0A0C] to-[#15151A]/10">
              {isFetchingMessages && messages.length === 0 ? (
                <div className="space-y-sm">
                  {[1, 2].map((n) => (
                    <div key={n} className="flex gap-sm animate-pulse max-w-sm">
                      <div className="w-8 h-8 rounded-full bg-[#1E1E24]"></div>
                      <div className="flex-1 space-y-xs">
                        <div className="h-4 bg-[#1E1E24] rounded w-1/3"></div>
                        <div className="h-12 bg-[#1E1E24] rounded w-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {messages.map((m) => {
                    const isAi = m.role === "assistant" || m.role === "system";
                    return (
                      <div
                        key={m.id}
                        className={`flex gap-sm max-w-[85%] ${isAi ? "items-start" : "items-end ml-auto flex-row-reverse"}`}
                      >
                        {isAi ? (
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-primary text-sm font-bold">
                              smart_toy
                            </span>
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-on-surface-variant text-sm">
                              person
                            </span>
                          </div>
                        )}
                        <div className="space-y-xs">
                          <span className="text-[10px] text-on-surface-variant font-mono">
                            {isAi ? "AI Tutor" : "You"}
                          </span>
                          <div
                            className={`p-sm rounded-xl text-body-sm leading-relaxed whitespace-pre-wrap ${
                              isAi
                                ? "bg-[#1E1E24]/60 border border-[#2A2A32] text-on-surface"
                                : "bg-primary text-white"
                            }`}
                          >
                            {m.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Streaming Block */}
                  {isAiStreaming && streamingText && (
                    <div className="flex gap-sm max-w-[85%] items-start">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-sm font-bold animate-pulse">
                          smart_toy
                        </span>
                      </div>
                      <div className="space-y-xs">
                        <span className="text-[10px] text-on-surface-variant font-mono">AI Tutor</span>
                        <div className="p-sm rounded-xl text-body-sm leading-relaxed bg-[#1E1E24]/60 border border-[#2A2A32] text-on-surface whitespace-pre-wrap">
                          {streamingText}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Suggestion Chips and Input Form */}
            {activeSession.is_active && (
              <div className="p-sm border-t border-[#2A2A32] bg-[#15151A]/60 flex flex-col gap-xs">
                {/* Suggestions List */}
                <div className="flex items-center gap-xs overflow-x-auto no-scrollbar pb-xs">
                  {[
                    "Explain present perfect grammar rules",
                    "Give me a translation exercise",
                    "Provide a conversational example",
                  ].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleSendMessage(chip)}
                      disabled={wsStatus !== "Ready"}
                      className="whitespace-nowrap bg-[#1E1E24] border border-[#2A2A32] hover:border-primary text-on-surface-variant hover:text-on-surface px-sm py-1.5 rounded-full text-xs font-semibold active:scale-[0.96] transition-all disabled:opacity-40"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Input box */}
                <div className="flex gap-sm items-center mt-xs">
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Type message to AI Tutor..."
                    disabled={wsStatus !== "Ready"}
                    className="flex-grow bg-[#1E1E24] border-[#2A2A32] text-body-sm"
                  />
                  <Button
                    onClick={() => handleSendMessage()}
                    disabled={!inputText.trim() || wsStatus !== "Ready"}
                    className="shrink-0"
                  >
                    Send
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-xl gap-sm">
            <span className="material-symbols-outlined text-on-surface-variant text-5xl">
              smart_toy
            </span>
            <h2 className="text-headline-md font-bold text-on-surface">Start Tutoring</h2>
            <p className="text-on-surface-variant max-w-sm">
              Open an active chat thread or select a past conversation from the sidebar list to practice spelling, grammar explanations, and rules.
            </p>
            <Button onClick={handleStartSession} disabled={isCreatingSession}>
              Create Session
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

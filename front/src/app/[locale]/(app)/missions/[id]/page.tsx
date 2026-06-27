"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Link, useRouter as useIntlRouter } from "@/i18n/navigation";
import { useStartMissionMutation, useCompleteMissionMutation } from "@/services/missionsApi";

interface Message { role: "ai" | "user"; text: string; }

const MISSION_META: Record<string, { title: string; icon: string; initial: string }> = {
  "restaurant": { title: "Waiter Roleplay", icon: "restaurant", initial: "Hello! Welcome to our restaurant. Would you like to see the menu, or are you ready to order?" },
  "job-interview": { title: "Job Interview", icon: "work", initial: "Thank you for coming in today. Can you tell me a bit about yourself?" },
  "train-tickets": { title: "Buy Train Tickets", icon: "confirmation_number", initial: "Hello! How can I help you today? Where would you like to travel?" },
  "hotel": { title: "Hotel Check-in", icon: "hotel", initial: "Good evening! Welcome to the Grand Hotel. Do you have a reservation?" },
  "meet-someone": { title: "Meet Someone New", icon: "chat_bubble", initial: "Hi there! I don't think we've met before. I'm Alex. What's your name?" },
};

const SUGGESTIONS: Record<string, string[]> = {
  "restaurant": ["Ask for the bill", "Order a drink", "Ask about ingredients"],
  "job-interview": ["Ask about the role", "Discuss salary", "Ask about team"],
  default: ["Continue the conversation", "Ask a question", "Respond politely"],
};

export default function ActiveMissionPage() {
  const params = useParams();
  const intlRouter = useIntlRouter();
  const missionId = params.id as string;
  const meta = MISSION_META[missionId] ?? { title: "Mission", icon: "explore", initial: "Let's begin the scenario. How would you like to start?" };

  const [messages, setMessages] = useState<Message[]>([{ role: "ai", text: meta.initial }]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [startMission] = useStartMissionMutation();
  const [completeMission] = useCompleteMissionMutation();
  const attemptIdRef = useRef<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    startMission(missionId).unwrap()
      .then((session) => {
        attemptIdRef.current = session.attempt_id;
        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000"}/ws/tutor/${session.session_id}${token ? `?token=${token}` : ""}`;
        const ws = new WebSocket(wsUrl);
        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.text) {
              setMessages((prev) => [...prev, { role: "ai", text: data.text }]);
              setIsGenerating(false);
            }
          } catch { /* ignore non-JSON frames */ }
        };
        ws.onerror = () => ws.close();
        wsRef.current = ws;
      })
      .catch(() => {/* use fallback static mode */});

    return () => wsRef.current?.close();
  }, [missionId, startMission]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isGenerating) return;
    const userMsg = text.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setIsGenerating(true);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ text: userMsg }));
    } else {
      // Fallback: echo a simple AI response for demo
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: "ai", text: "I understand. Let me respond to that..." }]);
        setIsGenerating(false);
      }, 1200);
    }
  }, [isGenerating]);

  const handleEnd = async () => {
    wsRef.current?.close();
    if (attemptIdRef.current) {
      try {
        const feedback = await completeMission({ id: missionId, attempt_id: attemptIdRef.current }).unwrap();
        sessionStorage.setItem(`mission_feedback_${missionId}`, JSON.stringify(feedback));
      } catch {/* use empty state on results page */}
    }
    intlRouter.push(`/missions/${missionId}/feedback`);
  };

  const suggestions = SUGGESTIONS[missionId] ?? SUGGESTIONS.default;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -mx-xl -my-xl overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-gutter h-14 border-b border-outline bg-surface/80 backdrop-blur-md shrink-0">
        <Link href="/missions" className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface text-sm font-label-md transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back
        </Link>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">{meta.icon}</span>
          <span className="font-headline-md font-bold text-on-surface tracking-tight">{meta.title}</span>
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B7CFF] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
        </div>
        <button
          onClick={handleEnd}
          className="bg-error/10 text-error hover:bg-error/20 font-medium py-1 px-3 rounded-lg text-sm active:scale-95 transition-all"
        >
          End Mission
        </button>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-gutter py-lg space-y-lg">
        {messages.map((msg, i) => (
          msg.role === "ai" ? (
            <div key={i} className="flex flex-col items-start pr-12">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-[20px]">{meta.icon}</span>
                <span className="font-label-md text-sm text-on-surface-variant">AI Partner</span>
              </div>
              <p className="text-body-md text-on-surface leading-relaxed max-w-[90%]">{msg.text}</p>
            </div>
          ) : (
            <div key={i} className="flex flex-col items-end pl-12">
              <div className="bg-surface-bright px-5 py-4 rounded-xl border border-outline max-w-[85%] text-body-md text-on-surface shadow-sm">
                {msg.text}
              </div>
            </div>
          )
        ))}
        {isGenerating && (
          <div className="flex flex-col items-start pr-12">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-[20px]">{meta.icon}</span>
              <span className="font-label-md text-sm text-on-surface-variant">AI Partner</span>
            </div>
            <div className="w-32 h-[2px] rounded-full bg-gradient-to-r from-primary to-[#8B7CFF] animate-pulse" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 bg-gradient-to-t from-background via-background to-transparent pt-lg pb-md px-gutter space-y-3">
        <div className="flex flex-wrap gap-2 justify-center">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="bg-surface font-label-md text-sm text-on-surface px-4 py-2 rounded-full hover:bg-surface-bright border border-outline active:scale-[0.96] transition-all"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-[800px] mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Type your response..."
            className="w-full bg-surface-bright border border-outline rounded-xl py-4 pl-4 pr-14 text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant"
          />
          <button
            onClick={() => sendMessage(input)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-primary rounded-lg hover:bg-surface active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}

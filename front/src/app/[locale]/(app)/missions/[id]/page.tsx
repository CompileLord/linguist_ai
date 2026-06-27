"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { Link, useRouter as useIntlRouter } from "@/i18n/navigation";
import { useStartMissionMutation, useCompleteMissionMutation } from "@/services/missionsApi";

interface Message { role: "ai" | "user"; text: string; }

const MISSION_META: Record<string, {
  title: string;
  icon: string;
  initial: string;
  partner: string;
  role: string;
  steps: string[];
  accentHex: string;
}> = {
  "restaurant": {
    title: "Waiter Roleplay", icon: "restaurant",
    initial: "Hello! Welcome to our restaurant. Would you like to see the menu, or are you ready to order?",
    partner: "Marco", role: "Italian Waiter",
    steps: ["Greeting", "Ordering", "Payment"],
    accentHex: "#22c55e",
  },
  "job-interview": {
    title: "Job Interview", icon: "work",
    initial: "Thank you for coming in today. Can you tell me a bit about yourself?",
    partner: "Sarah", role: "HR Manager",
    steps: ["Introduction", "Experience", "Q & A"],
    accentHex: "#3b82f6",
  },
  "train-tickets": {
    title: "Buy Train Tickets", icon: "confirmation_number",
    initial: "Hello! How can I help you today? Where would you like to travel?",
    partner: "David", role: "Ticket Agent",
    steps: ["Inquiry", "Booking", "Confirmation"],
    accentHex: "#14b8a6",
  },
  "hotel": {
    title: "Hotel Check-in", icon: "hotel",
    initial: "Good evening! Welcome to the Grand Hotel. Do you have a reservation?",
    partner: "Elena", role: "Receptionist",
    steps: ["Check-in", "Room info", "Amenities"],
    accentHex: "#f97316",
  },
  "meet-someone": {
    title: "Meet Someone New", icon: "chat_bubble",
    initial: "Hi there! I don't think we've met before. I'm Alex. What's your name?",
    partner: "Alex", role: "New Acquaintance",
    steps: ["Introductions", "Small talk", "Exchange info"],
    accentHex: "#8B7CFF",
  },
};

const SUGGESTIONS: Record<string, string[]> = {
  "restaurant":    ["Ask for the bill", "Order a drink", "Ask about ingredients"],
  "job-interview": ["Ask about the role", "Discuss salary", "Ask about the team"],
  "train-tickets": ["Ask about the platform", "Request a return ticket", "Ask about delays"],
  "hotel":         ["Ask about Wi-Fi", "Request extra towels", "Ask about checkout"],
  default:         ["Continue the conversation", "Ask a question", "Respond politely"],
};

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-on-surface-variant"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.14, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function AiAvatar({ accentHex, size = 32, pulse = false }: { accentHex: string; size?: number; pulse?: boolean }) {
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
          style={{ fontSize: size * 0.48, color: accentHex, fontVariationSettings: "'FILL' 1" }}
        >
          smart_toy
        </span>
      </div>
    </div>
  );
}

export default function ActiveMissionPage() {
  const params = useParams();
  const intlRouter = useIntlRouter();
  const missionId = params.id as string;
  const meta = MISSION_META[missionId] ?? {
    title: "Mission", icon: "explore",
    initial: "Let's begin the scenario. How would you like to start?",
    partner: "AI Partner", role: "Conversational AI",
    steps: ["Start", "Practice", "Complete"],
    accentHex: "#6E5BFF",
  };

  const [messages, setMessages] = useState<Message[]>([{ role: "ai", text: meta.initial }]);
  const [streamingText, setStreamingText] = useState("");
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const [startMission] = useStartMissionMutation();
  const [completeMission] = useCompleteMissionMutation();
  const attemptIdRef = useRef<string | null>(null);

  // Advance progress steps as the conversation grows
  useEffect(() => {
    const aiCount = messages.filter((m) => m.role === "ai").length;
    if (aiCount >= 3 && currentStep < 1) setCurrentStep(1);
    if (aiCount >= 5 && currentStep < 2) setCurrentStep(2);
  }, [messages, currentStep]);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    startMission(missionId).unwrap()
      .then((session) => {
        attemptIdRef.current = session.attempt_id;
        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000"}/ws/tutor/${session.session_id}${token ? `?token=${token}` : ""}`;
        const ws = new WebSocket(wsUrl);
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === "chunk") {
              streamRef.current += (msg.content || "");
              setStreamingText(streamRef.current);
            } else if (msg.type === "done") {
              const fullText = streamRef.current + (msg.content || "");
              streamRef.current = "";
              setStreamingText("");
              if (fullText.trim()) {
                setMessages((prev) => [...prev, { role: "ai", text: fullText.trim() }]);
              }
              setIsGenerating(false);
            } else if (msg.type === "error") {
              streamRef.current = "";
              setStreamingText("");
              setIsGenerating(false);
            }
          } catch { /* ignore non-JSON frames */ }
        };
        ws.onerror = () => ws.close();
        wsRef.current = ws;
      })
      .catch(() => {/* fallback static mode */});

    return () => wsRef.current?.close();
  }, [missionId, startMission]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isGenerating) return;
    const userMsg = text.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setIsGenerating(true);
    streamRef.current = "";

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ content: userMsg }));
    } else {
      // WS not connected — try to reconnect or show error
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: "ai", text: "Connection lost. Please refresh and try again." }]);
        setIsGenerating(false);
      }, 800);
    }
  }, [isGenerating]);

  const handleEnd = async () => {
    wsRef.current?.close();
    if (attemptIdRef.current) {
      try {
        const feedback = await completeMission({ id: missionId, attempt_id: attemptIdRef.current }).unwrap();
        sessionStorage.setItem(`mission_feedback_${missionId}`, JSON.stringify(feedback));
      } catch {/* empty state on results page */}
    }
    intlRouter.push(`/missions/${missionId}/feedback`);
  };

  const suggestions = SUGGESTIONS[missionId] ?? SUGGESTIONS.default;

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#0A0A0C]">

      {/* ── Top bar ── */}
      <div className="shrink-0 border-b border-[#2A2A32] bg-[#15151A]/95 backdrop-blur-md">
        {/* Main row */}
        <div className="flex items-center gap-3 px-4 md:px-6 h-14">
          <Link
            href="/missions"
            className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface text-sm transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span className="hidden sm:inline text-sm">Back</span>
          </Link>

          {/* Center: avatar + partner info */}
          <div className="flex-1 flex items-center justify-center gap-3">
            <AiAvatar accentHex={meta.accentHex} size={36} pulse={isGenerating} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-on-surface">{meta.partner}</span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded border font-semibold leading-none"
                  style={{
                    color: meta.accentHex,
                    borderColor: `${meta.accentHex}40`,
                    backgroundColor: `${meta.accentHex}12`,
                  }}
                >
                  {meta.role}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: isGenerating ? "#f97316" : "#22c55e" }}
                />
                <span className="text-[10px] text-on-surface-variant">
                  {isGenerating ? "Responding…" : "Active session"}
                </span>
              </div>
            </div>
          </div>

          {/* End button */}
          <button
            onClick={handleEnd}
            className="shrink-0 flex items-center gap-1.5 bg-error/10 text-error hover:bg-error/20 font-medium py-1.5 px-3 rounded-lg text-xs active:scale-95 transition-all border border-error/20"
          >
            <span className="material-symbols-outlined text-[15px]">call_end</span>
            <span className="hidden sm:inline">End</span>
          </button>
        </div>

        {/* Progress steps row */}
        <div className="flex items-center px-4 md:px-6 pb-3 pt-0.5 gap-0">
          {meta.steps.map((step, i) => (
            <div key={step} className="flex items-center">
              {i > 0 && (
                <div
                  className="h-px w-8 md:w-14 transition-all duration-500"
                  style={{ backgroundColor: i <= currentStep ? meta.accentHex : "#2A2A32" }}
                />
              )}
              <div className="flex items-center gap-1.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-400 text-[10px] font-bold"
                  style={{
                    backgroundColor: i < currentStep ? meta.accentHex : i === currentStep ? `${meta.accentHex}22` : "transparent",
                    borderColor: i <= currentStep ? meta.accentHex : "#2A2A32",
                    color: i < currentStep ? "#fff" : i === currentStep ? meta.accentHex : "#9A9AA5",
                  }}
                >
                  {i < currentStep
                    ? <span className="material-symbols-outlined text-[10px]">check</span>
                    : i + 1
                  }
                </div>
                <span
                  className="text-[10px] font-medium hidden sm:inline transition-colors duration-300"
                  style={{ color: i <= currentStep ? meta.accentHex : "#9A9AA5" }}
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
        <AnimatePresence initial={false}>
          {messages.map((msg, i) =>
            msg.role === "ai" ? (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex items-start gap-3 pr-8 md:pr-20"
              >
                <AiAvatar accentHex={meta.accentHex} size={32} />
                <div>
                  <span className="text-[10px] font-medium text-on-surface-variant mb-1.5 block">{meta.partner}</span>
                  <div
                    className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-on-surface leading-relaxed border max-w-prose"
                    style={{ backgroundColor: "#15151A", borderColor: "#2A2A32" }}
                  >
                    {msg.text}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex flex-col items-end pl-8 md:pl-20"
              >
                <span className="text-[10px] font-medium text-on-surface-variant mb-1.5">You</span>
                <div
                  className="px-4 py-3 rounded-2xl rounded-tr-sm text-sm text-white leading-relaxed max-w-prose"
                  style={{ background: "linear-gradient(135deg, #6E5BFF 0%, #8B7CFF 100%)" }}
                >
                  {msg.text}
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>

        {/* Streaming text or typing dots */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 pr-8 md:pr-20"
          >
            <AiAvatar accentHex={meta.accentHex} size={32} pulse />
            <div>
              <span className="text-[10px] font-medium text-on-surface-variant mb-1.5 block">{meta.partner}</span>
              {streamingText ? (
                <div
                  className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-on-surface leading-relaxed border max-w-prose"
                  style={{ backgroundColor: "#15151A", borderColor: "#2A2A32" }}
                >
                  {streamingText}
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
        {/* Suggestion chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full bg-[#15151A] border border-[#2A2A32] text-on-surface-variant hover:text-on-surface hover:border-primary/40 active:scale-95 transition-all duration-150"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div className="flex items-center gap-2 max-w-[820px] mx-auto">
          <div className="relative flex-1">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              placeholder="Type your response…"
              className="w-full bg-[#15151A] border border-[#2A2A32] rounded-xl py-3.5 pl-4 pr-12 text-sm text-on-surface focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-[#9A9AA5]"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isGenerating}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 disabled:opacity-25 active:scale-90 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>

          {/* Mic button */}
          <button
            className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center bg-[#15151A] border border-[#2A2A32] text-on-surface-variant hover:text-primary hover:border-primary/40 active:scale-90 transition-all"
            title="Voice input"
          >
            <span className="material-symbols-outlined text-[20px]">mic</span>
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { useGetWritingPromptQuery, useSubmitWritingExamMutation } from "@/services/examsApi";

export default function WritingExamPage() {
  const router = useRouter();
  const { data: prompt, isLoading } = useGetWritingPromptQuery();
  const [submitExam, { isLoading: isSubmitting }] = useSubmitWritingExamMutation();
  const [essay, setEssay] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState((prompt?.time_limit_minutes ?? 45) * 60);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (prompt) setTimeLeft(prompt.time_limit_minutes * 60);
  }, [prompt]);

  useEffect(() => {
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");
  const isLowTime = timeLeft < 300;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEssay(val);
    setWordCount(val.trim() ? val.trim().split(/\s+/).length : 0);
    // auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  };

  const handleSubmit = async () => {
    if (!prompt || !essay.trim() || isSubmitting) return;
    try {
      const result = await submitExam({
        exam_id: prompt.id,
        submitted_text: essay,
      }).unwrap();
      sessionStorage.setItem("writing_result", JSON.stringify(result));
      router.push("/exams/writing/results");
    } catch (err) {
      console.error("Submission failed:", err);
    }
  };

  return (
    <div className="animate-fade-in flex flex-col min-h-[calc(100vh-8rem)] pb-20">
      {/* Timer bar */}
      <div className="flex items-center justify-end mb-lg gap-md">
        <div className={`flex items-center gap-xs px-3.5 py-1.5 rounded-full border ${isLowTime ? "border-error bg-error/10 text-error" : "border-outline bg-surface-bright text-on-surface-variant"} font-label-md tabular-nums`}>
          <span className="material-symbols-outlined text-[18px]">timer</span>
          <span className="font-semibold">{mins}:{secs}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 mb-xl">
          <div className="h-8 w-2/3 bg-surface rounded-lg animate-pulse" />
          <div className="h-20 w-full bg-surface rounded-lg animate-pulse" />
        </div>
      ) : (
        <section className="mb-xl">
          <h2 className="font-headline-lg text-2xl font-bold text-on-surface mb-3 tracking-tight">
            {prompt?.title ?? "The Future of Automation"}
          </h2>
          <p className="text-body-lg text-on-surface-variant leading-relaxed">
            {prompt?.prompt ?? "Discuss the ethical implications of fully autonomous systems in critical infrastructure. Consider both the potential benefits in efficiency and the risks associated with removing human oversight. Your response should be well-structured and provide specific examples."}
          </p>
        </section>
      )}

      {/* Writing area */}
      <section className="flex-grow relative group">
        <div className="absolute -left-4 top-0 bottom-0 w-0.5 bg-primary opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 rounded-full" />
        <textarea
          ref={textareaRef}
          value={essay}
          onChange={handleChange}
          placeholder="Begin your response here..."
          spellCheck={false}
          className="w-full min-h-[50vh] bg-transparent text-on-surface placeholder:text-on-surface-variant/40 resize-none focus:outline-none leading-[1.75] text-[1.125rem] font-serif pb-xl"
          style={{ fontFamily: "'Lora', 'Georgia', serif" }}
        />
      </section>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 flex justify-between items-center py-md border-t border-outline bg-background/95 backdrop-blur-sm z-20 px-xl">
        <span className="text-on-surface-variant font-label-md text-sm flex items-center gap-xs">
          <span className="font-bold text-on-surface tabular-nums">{wordCount}</span> words
        </span>
        <button
          onClick={handleSubmit}
          disabled={wordCount < 10 || isSubmitting}
          className="bg-primary hover:bg-primary/95 text-white font-medium py-2.5 px-6 rounded-lg active:scale-[0.96] transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(110,91,255,0.25)] border border-[#8B7CFF]/30 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
        >
          {isSubmitting ? "Submitting…" : "Submit for evaluation"}
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </div>
    </div>
  );
}

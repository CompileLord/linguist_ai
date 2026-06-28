"use client";

import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetLessonByIdQuery,
  useSubmitReadingFeedbackMutation,
  QuestionFeedback,
} from "@/services/lessonApi";
import { MarkdownContent } from "@/components/MarkdownContent";
import { Button } from "@/components/ui/Button";

const slide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -12 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
} as const;

export default function ReadingPage() {
  const params   = useParams();
  const router   = useRouter();
  const lessonId = params.lesson_id as string;

  const { data: lesson, isLoading, error } = useGetLessonByIdQuery(lessonId);
  const [submitFeedback, { isLoading: isLoadingFeedback }] = useSubmitReadingFeedbackMutation();

  const [answers,   setAnswers]   = useState<string[]>([]);
  const [feedback,  setFeedback]  = useState<QuestionFeedback[] | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (lesson?.content?.reading_text?.comprehension_questions) {
      setAnswers(lesson.content.reading_text.comprehension_questions.map(() => ""));
    }
  }, [lesson]);

  if (isLoading) return <PageLoader />;
  if (error || !lesson) return <PageError router={router} />;

  const { content } = lesson;
  const rt = content.reading_text;

  if (!rt) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-md py-20">
        <p className="text-on-surface-variant">No reading passage for this lesson.</p>
        <div className="flex gap-sm">
          <Button variant="outline" onClick={() => router.push(`/lessons/${lessonId}/vocabulary` as any)}>Back</Button>
          <Button onClick={() => router.push(`/lessons/${lessonId}/listening` as any)}>Next</Button>
        </div>
      </div>
    );
  }

  const questions  = rt.comprehension_questions ?? [];
  const hasPanel   = questions.length > 0;
  const wordCount  = (rt.content || "").split(/\s+/).length;
  const readMin    = Math.max(1, Math.ceil(wordCount / 200));
  const answeredN  = answers.filter((a) => a.trim()).length;
  const correctN   = feedback?.filter((f) => f.is_correct).length ?? 0;

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      const res = await submitFeedback({
        lessonId,
        body: {
          reading_title:            rt.title,
          reading_text:             rt.content,
          comprehension_questions:  questions,
          user_answers:             answers,
          user_level:               lesson.cefr_level,
        },
      }).unwrap();
      setFeedback(res.feedback);
      setSubmitted(true);
      setShowResults(true);
    } catch (e: any) {
      // RTK Query errors are { status, data } objects — extract a readable message
      // instead of letting an empty {} reach the console / error overlay.
      const message =
        e?.data?.detail ||
        e?.data?.message ||
        (typeof e?.error === "string" ? e.error : null) ||
        (e?.status === "FETCH_ERROR"
          ? "Couldn't reach the server. Check your connection and try again."
          : "We couldn't analyse your answers right now. Please try again.");
      console.warn("Reading feedback failed:", JSON.stringify(e));
      setSubmitError(message);
    }
  };

  return (
    <motion.div
      {...slide}
      className="flex flex-col shrink-0 w-full bg-[#070709] overflow-hidden h-[calc(100dvh-169px)] md:h-[calc(100dvh-106px)]"
    >

      {/* ════════════════════════ Split canvas ════════════════════════ */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">

        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-40 left-1/4 w-[600px] h-[460px] rounded-full bg-primary/[0.06] blur-[140px] z-0" />

        {/* ─────────────── LEFT · Reading passage (on canvas) ─────────────── */}
        <div className={`relative z-10 min-h-0 ${hasPanel ? "w-1/2" : "w-full max-w-4xl mx-auto"} overflow-y-auto overscroll-contain custom-scrollbar`}>
          <div className="px-8 sm:px-12 md:px-16 lg:px-24 pt-12 md:pt-16 pb-28">
            <div className="max-w-[680px] select-text cursor-text">

              {/* Kicker */}
              <div className="flex items-center gap-2.5 mb-6">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">
                  Reading Passage
                </span>
                <span className="w-1 h-1 rounded-full bg-on-surface-variant/25" />
                <span className="text-[10px] font-mono text-on-surface-variant/40">{lesson.cefr_level}</span>
              </div>

              {/* Title */}
              <h1 className="text-[34px] md:text-[44px] font-bold text-[#F3F1FF] leading-[1.08] tracking-[-0.025em] mb-5">
                {rt.title}
              </h1>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-on-surface-variant/45 pb-9 mb-11 border-b border-white/[0.06]">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>schedule</span>
                  {readMin} min read
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>notes</span>
                  {wordCount.toLocaleString()} words
                </span>
                {hasPanel && (
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>help</span>
                    {questions.length} questions
                  </span>
                )}
              </div>

              {/* Body — premium typography, no card */}
              <div className="
                [&_p]:text-[19.5px]
                [&_p]:leading-[1.95]
                [&_p]:text-[#C9C4E0]
                [&_p]:mb-[1.55em]
                [&_p]:tracking-[0.006em]
                [&_p:first-of-type]:first-letter:text-[3.4em]
                [&_p:first-of-type]:first-letter:font-bold
                [&_p:first-of-type]:first-letter:text-[#EEEBFF]
                [&_p:first-of-type]:first-letter:float-left
                [&_p:first-of-type]:first-letter:leading-[0.82]
                [&_p:first-of-type]:first-letter:mr-3
                [&_p:first-of-type]:first-letter:mt-1.5
                [&_h1]:text-[28px]
                [&_h1]:font-bold
                [&_h1]:text-[#EFECFF]
                [&_h1]:mb-6
                [&_h1]:leading-tight
                [&_h1]:tracking-tight
                [&_h2]:text-[23px]
                [&_h2]:font-semibold
                [&_h2]:text-[#E5E1F6]
                [&_h2]:mb-4
                [&_h2]:mt-12
                [&_h2]:leading-snug
                [&_h3]:text-[19px]
                [&_h3]:font-semibold
                [&_h3]:text-[#D7D2F1]
                [&_h3]:mb-3
                [&_h3]:mt-8
                [&_strong]:text-[#E7E2FF]
                [&_strong]:font-semibold
                [&_em]:text-[#B1ACCC]
                [&_em]:italic
                [&_a]:text-secondary
                [&_a]:underline
                [&_a]:underline-offset-2
                [&_a]:decoration-secondary/30
                [&_li]:text-[18.5px]
                [&_li]:leading-[1.9]
                [&_li]:text-[#C9C4E0]
                [&_li]:mb-2.5
                [&_ul]:mb-7
                [&_ul]:pl-5
                [&_ol]:mb-7
                [&_ol]:pl-5
                [&_blockquote]:border-l-2
                [&_blockquote]:border-primary/40
                [&_blockquote]:pl-6
                [&_blockquote]:italic
                [&_blockquote]:text-[#A39FC2]
                [&_blockquote]:my-9
                [&_blockquote]:py-1
                [&_code]:bg-white/[0.04]
                [&_code]:border
                [&_code]:border-white/[0.07]
                [&_code]:rounded-md
                [&_code]:px-1.5
                [&_code]:py-0.5
                [&_code]:text-[0.84em]
                [&_code]:text-secondary
                [&_code]:font-mono
                [&_hr]:border-white/[0.06]
                [&_hr]:my-10
              ">
                <MarkdownContent content={rt.content} />
              </div>

              {/* End marker */}
              <div className="flex items-center gap-3 mt-14">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                <span className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────── Divider ─────────────── */}
        {hasPanel && (
          <div className="relative z-10 w-px shrink-0 bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />
        )}

        {/* ─────────────── RIGHT · Answer sheet ─────────────── */}
        {hasPanel && (
          <div className="relative z-10 w-1/2 min-h-0 flex flex-col bg-[#08080D]/40">

            {/* Header */}
            <div className="shrink-0 px-6 lg:px-8 pt-3 pb-3 border-b border-white/[0.05]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary/25 to-secondary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontSize: "14px", fontVariationSettings: "'FILL' 1" }}
                  >
                    {submitted ? "fact_check" : "edit_note"}
                  </span>
                </div>
                <div>
                  <h2 className="text-[14px] font-bold text-on-surface leading-none">
                    {submitted ? "Your Results" : "Answer Sheet"}
                  </h2>
                  <p className="text-[11px] text-on-surface-variant/45 mt-1 leading-none">
                    {submitted
                      ? `${correctN} of ${feedback!.length} correct`
                      : `${questions.length} comprehension questions`}
                  </p>
                </div>
              </div>

              {/* Progress / score meter */}
              {submitted && feedback ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant/35 tracking-wider">Score</span>
                    <span className="text-[12.5px] font-bold text-on-surface tabular-nums">
                      {Math.round((correctN / feedback.length) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(correctN / feedback.length) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-primary to-success rounded-full"
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: `${(answeredN / questions.length) * 100}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                    />
                  </div>
                  <span className="text-[11px] text-on-surface-variant/45 tabular-nums shrink-0">
                    {answeredN}/{questions.length}
                  </span>
                </div>
              )}
            </div>

            {/* Scrollable questions — own scroll, independent of the reading column */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar px-6 lg:px-8 py-6 flex flex-col gap-4">
              {questions.map((q, i) => {
                const filled = !!(answers[i]?.trim());
                const fb = submitted && feedback ? feedback[i] : null;
                const cardTone = fb
                  ? fb.is_correct
                    ? "border-success/30 bg-success/[0.05]"
                    : "border-error/30 bg-error/[0.05]"
                  : filled
                  ? "border-primary/25 bg-primary/[0.05]"
                  : "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.1]";
                const badgeTone = fb
                  ? fb.is_correct
                    ? "border-success/50 bg-success/20 text-success"
                    : "border-error/50 bg-error/20 text-error"
                  : filled
                  ? "border-primary/50 bg-primary/20 text-primary"
                  : "border-white/[0.1] text-on-surface-variant/40";
                return (
                  <div
                    key={i}
                    className={`rounded-2xl border p-4 transition-all duration-200 ${cardTone}`}
                  >
                    <div className="flex items-start gap-3 mb-3.5">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold border transition-all duration-200 ${badgeTone}`}>
                        {fb ? (
                          <span className="material-symbols-outlined" style={{ fontSize: "13px", fontVariationSettings: "'FILL' 1" }}>
                            {fb.is_correct ? "check" : "close"}
                          </span>
                        ) : (
                          i + 1
                        )}
                      </span>
                      <p className="text-[13.5px] text-on-surface/80 leading-relaxed flex-1 pt-0.5">{q}</p>
                    </div>
                    <textarea
                      rows={3}
                      readOnly={submitted}
                      value={answers[i] || ""}
                      onChange={(e) => {
                        const updated = [...answers];
                        updated[i] = e.target.value;
                        setAnswers(updated);
                      }}
                      placeholder="Write your answer…"
                      className={`w-full bg-[#060609] border border-white/[0.06] rounded-xl px-3.5 py-3 text-[13.5px] text-on-surface/90 placeholder:text-on-surface-variant/25 resize-none transition-all leading-relaxed outline-none ${
                        submitted
                          ? "cursor-default opacity-80"
                          : "hover:border-white/[0.1] focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Footer action */}
            <div className="shrink-0 px-6 lg:px-8 py-2.5 border-t border-white/[0.05]">
              {submitError && !submitted && (
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-error/25 bg-error/[0.06] px-3 py-2.5">
                  <span className="material-symbols-outlined text-error shrink-0" style={{ fontSize: "15px" }}>error</span>
                  <p className="text-[11.5px] text-error/90 leading-relaxed">{submitError}</p>
                </div>
              )}
              {!submitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={isLoadingFeedback || answeredN === 0}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-[#8B7CFF] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100 text-white text-[13.5px] font-bold flex items-center justify-center gap-2 transition-all shadow-[0_4px_24px_-6px_rgba(110,91,255,0.55)] active:scale-[0.98]"
                >
                  {isLoadingFeedback ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Analysing…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>auto_awesome</span>
                      Submit Answers
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setShowResults(true)}
                  className="w-full py-3 rounded-xl bg-primary/12 hover:bg-primary/18 border border-primary/30 text-primary text-[13.5px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>fact_check</span>
                  View Results
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════ Footer nav ════════════════════════ */}
      <div className="shrink-0 h-10 px-4 md:px-7 flex items-center gap-3 bg-[#0A0A12]/80 backdrop-blur-xl border-t border-white/[0.05]">
        <Button
          variant="outline"
          onClick={() => router.push(`/lessons/${lessonId}/vocabulary` as any)}
          className="flex items-center justify-center gap-1.5 py-2 px-4 text-[13px]"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_back</span>
          Back
        </Button>

        {(submitted || !hasPanel) && (
          <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="ml-auto">
            <Button
              onClick={() => router.push(`/lessons/${lessonId}/listening` as any)}
              className="flex items-center justify-center gap-1.5 py-2 px-5 text-[13px]"
            >
              Continue to Listening
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_forward</span>
            </Button>
          </motion.div>
        )}
      </div>

      {/* ════════════════════════ Results modal ════════════════════════ */}
      <AnimatePresence>
        {showResults && submitted && feedback && (
          <ResultsModal
            feedback={feedback}
            onClose={() => setShowResults(false)}
            onContinue={() => router.push(`/lessons/${lessonId}/listening` as any)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ResultsModal({
  feedback,
  onClose,
  onContinue,
}: {
  feedback: QuestionFeedback[];
  onClose: () => void;
  onContinue: () => void;
}) {
  const correctN = feedback.filter((f) => f.is_correct).length;
  const total    = feedback.length;
  const pct      = total > 0 ? Math.round((correctN / total) * 100) : 0;
  const tone     = pct >= 80 ? "success" : pct >= 50 ? "primary" : "error";
  const headline = pct >= 80 ? "Excellent work!" : pct >= 50 ? "Good effort!" : "Keep practising";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[86vh] flex flex-col rounded-[24px] border border-white/[0.08] bg-[#0C0C14] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] overflow-hidden"
      >
        {/* Glow */}
        <div className={`pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-[460px] h-[320px] rounded-full blur-[120px] ${
          tone === "success" ? "bg-success/15" : tone === "error" ? "bg-error/12" : "bg-primary/15"
        }`} />

        {/* Header */}
        <div className="relative shrink-0 px-7 pt-7 pb-6 border-b border-white/[0.06]">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant/40 hover:text-on-surface hover:bg-white/[0.06] transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
          </button>

          <div className="flex items-center gap-5">
            {/* Score ring */}
            <div className="relative w-[88px] h-[88px] shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
                <motion.circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={tone === "success" ? "#3DD68C" : tone === "error" ? "#FF5C6C" : "#6E5BFF"}
                  strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42}
                  initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - pct / 100) }}
                  transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[22px] font-bold text-on-surface leading-none tabular-nums">{pct}%</span>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/40 mb-1.5">
                Reading Results
              </p>
              <h2 className="text-[22px] font-bold text-on-surface leading-tight mb-1.5">{headline}</h2>
              <p className="text-[13px] text-on-surface-variant/55">
                You answered{" "}
                <span className={`font-semibold ${tone === "success" ? "text-success" : tone === "error" ? "text-error" : "text-primary"}`}>
                  {correctN} of {total}
                </span>{" "}
                questions correctly.
              </p>
            </div>
          </div>
        </div>

        {/* Per-question feedback (own scroll) */}
        <div className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar px-7 py-6 flex flex-col gap-3.5">
          {feedback.length === 0 ? (
            <p className="text-[13px] text-on-surface-variant/60 leading-relaxed text-center py-8">
              No feedback was returned for your answers. Please try submitting again.
            </p>
          ) : feedback.map((fb, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.25 }}
              className={`rounded-2xl border overflow-hidden ${
                fb.is_correct ? "border-success/20 bg-success/[0.04]" : "border-error/20 bg-error/[0.04]"
              }`}
            >
              <div className={`flex items-start gap-3 px-4 py-3.5 border-b ${fb.is_correct ? "border-success/12" : "border-error/12"}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-px ${fb.is_correct ? "bg-success/20" : "bg-error/20"}`}>
                  <span className={`material-symbols-outlined ${fb.is_correct ? "text-success" : "text-error"}`} style={{ fontSize: "12px", fontVariationSettings: "'FILL' 1" }}>
                    {fb.is_correct ? "check" : "close"}
                  </span>
                </div>
                <p className="text-[13.5px] font-medium text-on-surface/85 leading-relaxed flex-1">
                  <span className="text-on-surface-variant/40 mr-1.5">{i + 1}.</span>
                  {fb.question}
                </p>
              </div>
              <div className="px-4 py-3.5 space-y-3">
                {fb.user_answer && (
                  <div>
                    <p className="text-[9.5px] uppercase font-bold text-on-surface-variant/35 mb-1 tracking-wider">Your answer</p>
                    <p className="text-[13px] text-on-surface-variant/65 italic leading-relaxed">"{fb.user_answer}"</p>
                  </div>
                )}
                <div>
                  <p className="text-[9.5px] uppercase font-bold text-on-surface-variant/35 mb-1 tracking-wider">Feedback</p>
                  <div className={`text-[13px] leading-relaxed [&_p]:m-0 [&_p]:leading-relaxed ${fb.is_correct ? "text-success/80" : "text-on-surface-variant/75"}`}>
                    {fb.feedback_text?.trim() ? (
                      <MarkdownContent content={fb.feedback_text} />
                    ) : (
                      <span className="italic text-on-surface-variant/40">
                        {fb.is_correct ? "Correct — nice work!" : "Review the passage and try again."}
                      </span>
                    )}
                  </div>
                </div>
                {!fb.is_correct && fb.correct_example?.trim() && (
                  <div className="pt-2.5 border-t border-white/[0.06]">
                    <p className="text-[9.5px] uppercase font-bold text-primary/45 mb-1 tracking-wider">Model answer</p>
                    <div className="text-[13px] text-primary/85 leading-relaxed [&_p]:m-0 [&_p]:leading-relaxed">
                      <MarkdownContent content={fb.correct_example} />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="relative shrink-0 px-7 py-5 border-t border-white/[0.06] flex items-center gap-3">
          <button
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl border border-white/[0.08] text-on-surface-variant/70 text-[13px] font-semibold hover:text-on-surface hover:border-white/[0.15] transition-all"
          >
            Review answers
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-[#8B7CFF] hover:brightness-110 text-white text-[13.5px] font-bold flex items-center justify-center gap-2 transition-all shadow-[0_4px_24px_-6px_rgba(110,91,255,0.55)] active:scale-[0.98]"
          >
            Continue to Listening
            <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>arrow_forward</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PageLoader() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-md py-20">
      <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function PageError({ router }: { router: any }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-md py-20 text-center">
      <span className="material-symbols-outlined text-error text-5xl">error</span>
      <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
    </div>
  );
}

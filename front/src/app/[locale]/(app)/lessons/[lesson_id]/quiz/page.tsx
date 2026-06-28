"use client";

import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetLessonByIdQuery,
  useCompleteLessonMutation,
  LessonTestQuestion,
} from "@/services/lessonApi";
import { useLessonContext } from "../LessonContext";

const slide = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.25 },
} as const;

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.lesson_id as string;

  const { data: lesson, isLoading, error } = useGetLessonByIdQuery(lessonId);
  const [completeLesson, { isLoading: isSubmitting }] =
    useCompleteLessonMutation();
  const { exAnswers, timeStartedRef, setCompletionData } = useLessonContext();

  const [quizIdx, setQuizIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);

  if (isLoading) return <PageLoader />;
  if (error || !lesson) return <PageError router={router} />;

  const quiz = lesson.content.test || [];
  const current: LessonTestQuestion | undefined = quiz[quizIdx];

  if (!current) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
          <span
            className="material-symbols-outlined text-primary text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            quiz
          </span>
        </div>
        <p className="text-on-surface-variant text-sm">
          No quiz questions for this lesson.
        </p>
        <button
          onClick={() => router.push(`/lessons/${lessonId}/complete` as any)}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-[#8B7CFF] text-white text-sm font-bold shadow-[0_4px_16px_-4px_rgba(110,91,255,0.5)]"
        >
          See Results
        </button>
      </div>
    );
  }

  const isCorrect = selected === current.correct_index;

  const checkQuiz = () => {
    if (selected === null) return;
    setChecked(true);
  };

  const nextQuiz = async () => {
    if (selected === null) return;
    const updatedAnswers = [...quizAnswers, selected];
    setQuizAnswers(updatedAnswers);

    if (quizIdx + 1 < quiz.length) {
      setQuizIdx((p) => p + 1);
      setSelected(null);
      setChecked(false);
    } else {
      const timeSpent = Math.round(
        (Date.now() - timeStartedRef.current) / 1000,
      );
      try {
        const result = await completeLesson({
          lessonId,
          body: {
            exercise_answers: exAnswers,
            test_answers: updatedAnswers,
            time_spent_seconds: timeSpent,
          },
        }).unwrap();
        setCompletionData(result);
        router.push(`/lessons/${lessonId}/complete` as any);
      } catch (err) {
        console.error("Failed to complete lesson:", err);
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <AnimatePresence mode="wait">
        <motion.div
          key={`q-${quizIdx}`}
          {...slide}
          className="max-w-[600px] mx-auto w-full px-6 md:px-10 py-8 flex flex-col gap-5"
        >
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70 flex items-center gap-1.5">
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: "13px",
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  quiz
                </span>
                Quiz {quizIdx + 1} of {quiz.length}
              </span>
              <span className="text-[11px] text-on-surface-variant/45 tabular-nums font-mono">
                {quizIdx + 1} / {quiz.length}
              </span>
            </div>
            <div className="h-1 bg-[#1A1A22] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-[#9B8CFF] rounded-full"
                animate={{ width: `${((quizIdx + 1) / quiz.length) * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Question card */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0E0E16] p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{
                    fontSize: "16px",
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  help
                </span>
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant/35 mb-1.5">
                  Question
                </p>
                <p className="text-[15.5px] text-on-surface leading-relaxed font-medium">
                  {current.question}
                </p>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-2.5">
            {current.options.map((opt, i) => {
              const isSelected = selected === i;
              const isCorrectOpt = i === current.correct_index;

              let card =
                "w-full rounded-xl p-3.5 flex items-center gap-3 text-left text-[14px] transition-all duration-200 border focus:outline-none ";
              if (checked) {
                if (isCorrectOpt)
                  card +=
                    "border-emerald-500/15 bg-emerald-500/[0.06] text-on-surface";
                else if (isSelected)
                  card += "bg-error/[0.08] border-error/40 text-on-surface";
                else
                  card +=
                    "bg-[#0E0E16] border-white/[0.04] text-on-surface-variant/35";
              } else if (isSelected)
                card += "bg-primary/[0.08] border-primary/40 text-on-surface";
              else
                card +=
                  "bg-[#0E0E16] border-white/[0.06] text-on-surface hover:border-primary/30 hover:bg-primary/[0.03] cursor-pointer";

              const badge = checked
                ? isCorrectOpt
                  ? "border-emerald-500/15 bg-emerald-500/[0.06] text-emerald-600"
                  : isSelected
                    ? "bg-error/20 border-error/50 text-error"
                    : "bg-white/[0.03] border-white/[0.06] text-on-surface-variant/25"
                : isSelected
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-white/[0.03] border-white/[0.07] text-on-surface-variant/50";

              return (
                <button
                  key={i}
                  onClick={() => !checked && setSelected(i)}
                  disabled={checked}
                  className={card}
                >
                  <span
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center text-[11px] font-bold shrink-0 transition-all ${badge}`}
                  >
                    {checked && isCorrectOpt ? (
                      <span
                        className="material-symbols-outlined "
                        style={{
                          fontSize: "14px",
                          fontVariationSettings: "'FILL' 1",
                        }}
                      >
                        check
                      </span>
                    ) : checked && isSelected && !isCorrectOpt ? (
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: "14px",
                          fontVariationSettings: "'FILL' 1",
                        }}
                      >
                        close
                      </span>
                    ) : (
                      String.fromCharCode(65 + i)
                    )}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {checked && isCorrectOpt && (
                    <span
                      className="material-symbols-outlined text-emerald-600 shrink-0"
                      style={{
                        fontSize: "18px",
                        fontVariationSettings: "'FILL' 1",
                      }}
                    >
                      check_circle
                    </span>
                  )}
                  {checked && isSelected && !isCorrectOpt && (
                    <span
                      className="material-symbols-outlined text-error shrink-0"
                      style={{
                        fontSize: "18px",
                        fontVariationSettings: "'FILL' 1",
                      }}
                    >
                      cancel
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          <AnimatePresence>
            {checked && (
              <motion.div
                key="quiz-feedback"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`rounded-2xl border p-3.5 flex items-center gap-3 ${
                  isCorrect
                    ? "border-emerald-500/15 bg-emerald-500/[0.06]"
                    : "bg-error/[0.05] border-error/30"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isCorrect ? "bg-success/15" : "bg-error/15"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined ${isCorrect ? "text-emerald-600" : "text-error"}`}
                    style={{
                      fontSize: "19px",
                      fontVariationSettings: "'FILL' 1",
                    }}
                  >
                    {isCorrect ? "check_circle" : "cancel"}
                  </span>
                </div>
                <div>
                  <p
                    className={`text-[14px] font-bold leading-tight ${isCorrect ? "text-emerald-600" : "text-error"}`}
                  >
                    {isCorrect ? "Correct!" : "Not quite"}
                  </p>
                  <p className="text-[12px] text-on-surface-variant/55 leading-snug mt-0.5">
                    {isCorrect
                      ? "Nice — you nailed that one."
                      : "The correct answer is highlighted in green."}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA */}
          <div className="pb-6">
            {!checked ? (
              <button
                onClick={checkQuiz}
                disabled={selected === null}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-[#8B7CFF] hover:brightness-110 disabled:opacity-35 disabled:cursor-not-allowed text-white text-[14px] font-bold flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_-6px_rgba(110,91,255,0.55)] active:scale-[0.98]"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "17px" }}
                >
                  check
                </span>
                Submit Answer
              </button>
            ) : (
              <button
                onClick={nextQuiz}
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-[#8B7CFF] hover:brightness-110 disabled:opacity-70 text-white text-[14px] font-bold flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_-6px_rgba(110,91,255,0.55)] active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                    Scoring…
                  </>
                ) : quizIdx + 1 < quiz.length ? (
                  <>
                    Next Question
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "17px" }}
                    >
                      arrow_forward
                    </span>
                  </>
                ) : (
                  <>
                    Finish Quiz
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "17px" }}
                    >
                      auto_awesome
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
      <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
function PageError({ router }: { router: any }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 text-center">
      <span className="material-symbols-outlined text-error text-5xl">
        error
      </span>
      <button
        onClick={() => router.push("/dashboard")}
        className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold"
      >
        Back to Dashboard
      </button>
    </div>
  );
}

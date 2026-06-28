"use client";

import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetLessonByIdQuery,
  useGetNextLessonQuery,
} from "@/services/lessonApi";
import { Button } from "@/components/ui/Button";
import { useLessonContext } from "../LessonContext";

// ─── lightweight similarity (mirrors exercises page) ─────────────────────────
const CONTRACTIONS: [RegExp, string][] = [
  [/\bhaven't\b/gi, "have not"],
  [/\bhasn't\b/gi, "has not"],
  [/\bdon't\b/gi, "do not"],
  [/\bdoesn't\b/gi, "does not"],
  [/\bdidn't\b/gi, "did not"],
  [/\bwon't\b/gi, "will not"],
  [/\bwouldn't\b/gi, "would not"],
  [/\bcan't\b/gi, "cannot"],
  [/\bcouldn't\b/gi, "could not"],
  [/\bisn't\b/gi, "is not"],
  [/\baren't\b/gi, "are not"],
  [/\bwasn't\b/gi, "was not"],
  [/\bweren't\b/gi, "were not"],
  [/\bshouldn't\b/gi, "should not"],
  [/\bi'm\b/gi, "i am"],
  [/\bhe's\b/gi, "he is"],
  [/\bshe's\b/gi, "she is"],
  [/\bit's\b/gi, "it is"],
  [/\bthey're\b/gi, "they are"],
  [/\bwe're\b/gi, "we are"],
  [/\byou're\b/gi, "you are"],
  [/\bi've\b/gi, "i have"],
  [/\bi'll\b/gi, "i will"],
  [/\bhe'll\b/gi, "he will"],
];
function norm(s: string): string {
  let r = (s || "").toLowerCase().trim();
  for (const [p, rep] of CONTRACTIONS) r = r.replace(p, rep);
  return r
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function lev(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] =
        a[i - 1] === b[j - 1]
          ? d[i - 1][j - 1]
          : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
  return d[m][n];
}
function similarity(user: string, correct: string): number {
  const u = norm(user),
    c = norm(correct);
  if (!u) return 0;
  if (u === c) return 100;
  return Math.max(
    0,
    Math.round((1 - lev(u, c) / Math.max(u.length, c.length)) * 100),
  );
}

// ─── grading helpers ─────────────────────────────────────────────────────────
function gradeColor(pct: number) {
  if (pct >= 90)
    return {
      text: "text-emerald-600",
      bg: "bg-emerald-500/[0.06]",
      border: "border-success/25",
      ring: "#3DD68C",
    };
  if (pct >= 70)
    return {
      text: "text-primary",
      bg: "bg-primary/[0.04]",
      border: "border-primary/25",
      ring: "#E8B339",
    };
  return {
    text: "text-red",
    bg: "bg-error/[0.06]",
    border: "border-error/25",
    ring: "#FF5C6C",
  };
}
function encouragement(score: number) {
  if (score >= 0.9)
    return {
      title: "Outstanding!",
      body: "You've mastered this lesson. Your hard work is paying off.",
    };
  if (score >= 0.7)
    return {
      title: "Nicely done!",
      body: "Solid effort — a little more practice and you'll own this.",
    };
  return {
    title: "Keep going!",
    body: "Every mistake is a step forward. Review below and try again.",
  };
}

export default function CompletePage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.lesson_id as string;

  const { data: lesson } = useGetLessonByIdQuery(lessonId);
  const { completionData, exAnswers } = useLessonContext();

  const [showMistakes, setShowMistakes] = useState(false);
  const [fetchNext, setFetchNext] = useState(false);
  const {
    data: nextLesson,
    isLoading: nextLoading,
    error: nextError,
  } = useGetNextLessonQuery(undefined, { skip: !fetchNext });

  // Navigate once the next lesson is ready
  useEffect(() => {
    if (fetchNext && nextLesson)
      router.push(`/lessons/${nextLesson.id}/theory` as any);
  }, [fetchNext, nextLesson, router]);

  if (!completionData) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-md py-20 text-center">
        <span className="material-symbols-outlined text-on-surface-variant text-5xl">
          hourglass_empty
        </span>
        <p className="text-on-surface-variant text-sm">
          Complete the quiz first to see your results.
        </p>
        <Button
          onClick={() => router.push(`/lessons/${lessonId}/theory` as any)}
        >
          Start Lesson
        </Button>
      </div>
    );
  }

  const scorePct = Math.round(completionData.score * 100);
  const accuracyPct = Math.round(completionData.accuracy * 100);
  const scoreGrade = gradeColor(scorePct);
  const accGrade = gradeColor(accuracyPct);
  const msg = encouragement(completionData.score);

  // ── "What was learned" data ──
  const vocab = lesson?.content.vocabulary ?? [];
  const keyPoints = lesson?.content.theory?.key_points ?? [];
  const grammar = lesson?.content.theory?.grammar_notes;

  // ── Mistakes review ──
  const exercises = lesson?.content.exercises ?? [];
  const mistakes = exercises
    .map((ex, i) => {
      const userAns = exAnswers[i] ?? "";
      const hasOptions = (ex.options?.length ?? 0) > 0;
      const pct = hasOptions
        ? norm(userAns) === norm(ex.correct_answer)
          ? 100
          : 0
        : similarity(userAns, ex.correct_answer);
      return { ex, userAns, pct, answered: !!exAnswers[i] };
    })
    .filter((m) => m.pct < 90);

  const stats = [
    {
      label: "XP Earned",
      value: `+${completionData.xp_earned}`,
      suffix: "XP",
      color: "text-pri,ary",
      accent: "emerald-600",
    },
    {
      label: "Accuracy",
      value: `${accuracyPct}`,
      suffix: "%",
      color: accGrade.text,
      accent: "accuracy",
    },
    {
      label: "Score",
      value: `${scorePct}`,
      suffix: "%",
      color: scoreGrade.text,
      accent: "score",
    },
    {
      label: "Correct",
      value: `${completionData.exercises_correct}`,
      suffix: `/${completionData.exercises_total}`,
      color: "text-on-surface",
      accent: "correct",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="max-w-[560px] mx-auto w-full px-6 md:px-8 py-10 flex flex-col gap-7"
      >
        {/* ── Hero ── */}
        <div className="flex flex-col items-center text-center gap-4">
          <div className="relative">
            {/* glow */}
            <div className="absolute inset-0 rounded-full blur-2xl bg-primary/25 scale-150 -z-10" />
            <motion.div
              initial={{ scale: 0.6, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 14,
                delay: 0.1,
              }}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/25 to-[#9B8CFF]/15 border-2 border-primary/60 flex items-center justify-center shadow-[0_0_40px_rgba(110,91,255,0.35)]"
            >
              <span
                className="material-symbols-outlined text-primary text-5xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                emoji_events
              </span>
            </motion.div>
            <AnimatePresence>
              {completionData.level_up && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.4, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute -top-2 -right-3 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-[0_4px_12px_rgba(110,91,255,0.5)]"
                >
                  Level Up!
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <h1 className="text-3xl font-bold text-on-surface tracking-tight">
              Lesson Complete!
            </h1>
            <p className="text-on-surface-variant/65 text-[16px] font-medium">
              You finished{" "}
              <span className="text-on-surface font-medium">
                &ldquo;{lesson?.title}&rdquo;
              </span>{" "}
              and earned your rewards.
            </p>
          </div>

          {/* Encouraging message */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={`rounded-2xl border border-primary bg-primary/[0.04] px-4 py-3 flex items-center gap-3`}
          >
            {/* ${scoreGrade.border} ${scoreGrade.bg} */}
            <span
              className={`material-symbols-outlined ${scoreGrade.text} shrink-0`}
              style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}
            >
              {scorePct >= 90
                ? "mood"
                : scorePct >= 70
                  ? "sentiment_satisfied"
                  : "sentiment_dissatisfied"}
            </span>
            <div className="text-left">
              <p
                className={`text-[14px] font-bold leading-tight ${scoreGrade.text}`}
              >
                {msg.title}
              </p>
              <p className="text-[12px] text-on-surface-variant/60 leading-snug mt-0.5">
                {msg.body}
              </p>
            </div>
          </motion.div>
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s, i) => {
            const isXp = s.accent === "success";
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                className={`rounded-2xl border p-4 flex flex-col gap-1.5 ${
                  s.accent === "accuracy"
                    ? accGrade.border + " " + accGrade.bg
                    : s.accent === "score"
                      ? scoreGrade.border + " " + scoreGrade.bg
                      : s.accent === "success"
                        ? "border-success/25 bg-success/[0.05]"
                        : "border-white/[0.07] bg-[#0E0E16]"
                }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant/45 flex items-center gap-1.5">
                  {isXp && (
                    <span
                      className="material-symbols-outlined text-success"
                      style={{ fontSize: "13px" }}
                    >
                      bolt
                    </span>
                  )}
                  {s.label}
                </span>
                <span className={`text-2xl font-bold tabular-nums ${s.color}`}>
                  {s.value}
                  <span className="text-sm font-semibold ml-0.5 opacity-70">
                    {s.suffix}
                  </span>
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* ── What was learned ── */}
        {(vocab.length > 0 || keyPoints.length > 0 || grammar) && (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0E0E16] p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{
                    fontSize: "17px",
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  menu_book
                </span>
              </div>
              <div>
                <p className="text-[14px] font-bold text-on-surface leading-tight">
                  What you learned
                </p>
                <p className="text-[11px] text-on-surface-variant/45 leading-tight mt-0.5">
                  Key takeaways from this lesson
                </p>
              </div>
            </div>

            {vocab.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant/40">
                  Vocabulary
                </p>
                <div className="flex flex-wrap gap-2">
                  {vocab.slice(0, 10).map((v, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[12px]"
                    >
                      <span className="text-on-surface font-semibold">
                        {v.word}
                      </span>
                      <span className="text-on-surface-variant/40">·</span>
                      <span className="text-on-surface-variant/60">
                        {v.translation}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(keyPoints.length > 0 || grammar) && (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant/40">
                  Grammar & key points
                </p>
                <ul className="flex flex-col gap-1.5">
                  {keyPoints.slice(0, 5).map((p, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[13px] text-on-surface-variant/75 leading-relaxed"
                    >
                      <span
                        className="material-symbols-outlined text-primary/70 shrink-0 mt-0.5"
                        style={{ fontSize: "14px" }}
                      >
                        check_circle
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                  {grammar && (
                    <li className="flex items-start gap-2 text-[13px] text-on-surface-variant/75 leading-relaxed">
                      <span
                        className="material-symbols-outlined text-primary/70 shrink-0 mt-0.5"
                        style={{ fontSize: "14px" }}
                      >
                        school
                      </span>
                      <span>{grammar}</span>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── Review Mistakes ── */}
        {mistakes.length > 0 && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowMistakes((s) => !s)}
              className="w-full rounded-2xl border border-white/[0.07] bg-[#0E0E16] hover:bg-white/[0.03] transition-all p-3.5 flex items-center gap-3 text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-error/15 border border-error/20 flex items-center justify-center shrink-0">
                <span
                  className="material-symbols-outlined text-error"
                  style={{ fontSize: "17px" }}
                >
                  target
                </span>
              </div>
              <div className="flex-1">
                <p className="text-[13.5px] font-semibold text-on-surface leading-tight">
                  Review your mistakes
                </p>
                <p className="text-[11.5px] text-on-surface-variant/45 leading-tight mt-0.5">
                  {mistakes.length}{" "}
                  {mistakes.length === 1 ? "exercise" : "exercises"} to revisit
                </p>
              </div>
              <motion.span
                animate={{ rotate: showMistakes ? 180 : 0 }}
                className="material-symbols-outlined text-on-surface-variant/50 shrink-0"
                style={{ fontSize: "20px" }}
              >
                expand_more
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {showMistakes && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden flex flex-col gap-2.5"
                >
                  {mistakes.map(({ ex, userAns, pct, answered }, i) => {
                    const g = gradeColor(pct);
                    return (
                      <div
                        key={i}
                        className={`rounded-xl border ${g.border} ${g.bg} p-3.5 flex flex-col gap-2`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] text-on-surface font-medium leading-snug flex-1">
                            {ex.question}
                          </p>
                          <span
                            className={`text-[10px] font-bold tabular-nums shrink-0 px-1.5 py-0.5 rounded-md ${g.text} bg-white/[0.03]`}
                          >
                            {pct}%
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg border border-white/[0.06] bg-[#0A0A12] p-2.5">
                            <p className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant/35 mb-1">
                              Your answer
                            </p>
                            <p className="text-[12.5px] text-on-surface-variant/70 leading-snug">
                              {answered ? (
                                userAns
                              ) : (
                                <span className="italic text-on-surface-variant/30">
                                  skipped
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.05] text-on-surface-variant/35 p-2.5">
                            <p className="text-[9px] uppercase font-bold tracking-widest text-success/45 mb-1">
                              Correct
                            </p>
                            <p className="text-[12.5px] text-emerald-200 font-semibold leading-snug">
                              {ex.correct_answer}
                            </p>
                          </div>
                        </div>
                        {ex.explanation && (
                          <p className="text-[12px] text-on-surface-variant/55 leading-relaxed flex items-start gap-1.5">
                            <span
                              className="material-symbols-outlined text-primary/55 shrink-0 mt-0.5"
                              style={{ fontSize: "13px" }}
                            >
                              school
                            </span>
                            {ex.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── CTAs ── */}
        <div className="flex flex-col gap-2.5 pb-10">
          {mistakes.length > 0 ? (
            <button
              onClick={() => setShowMistakes((s) => !s)}
              className="w-full py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-on-surface-variant text-[14px] font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px" }}
              >
                target
              </span>
              {showMistakes ? "Hide mistakes" : "Review Mistakes"}
            </button>
          ) : (
            <button
              onClick={() => router.push(`/lessons/${lessonId}/theory` as any)}
              className="w-full py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-on-surface-variant text-[14px] font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px" }}
              >
                replay
              </span>
              Review Lesson
            </button>
          )}

          <button
            onClick={() => {
              if (nextError) router.push("/lessons" as any);
              else setFetchNext(true);
            }}
            disabled={nextLoading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-[#8B7CFF] hover:brightness-110 disabled:opacity-70 disabled:cursor-wait text-white text-[14.5px] font-bold flex items-center justify-center gap-2 transition-all shadow-[0_6px_24px_-6px_rgba(110,91,255,0.6)] active:scale-[0.98]"
          >
            {nextLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                Preparing next lesson…
              </>
            ) : (
              <>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "18px" }}
                >
                  auto_awesome
                </span>
                New Session
              </>
            )}
          </button>

          <button
            onClick={() => router.push("/lessons" as any)}
            className="w-full py-2.5 text-on-surface-variant/55 hover:text-on-surface-variant text-[13px] font-medium transition-all"
          >
            All Lessons
          </button>
        </div>
      </motion.div>
    </div>
  );
}

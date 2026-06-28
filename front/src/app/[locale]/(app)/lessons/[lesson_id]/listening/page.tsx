"use client";

import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useGetLessonByIdQuery } from "@/services/lessonApi";
import { Button } from "@/components/ui/Button";
import { resolveAudioUrl } from "../lessonUtils";

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -24 },
  transition: { duration: 0.25 },
} as const;

export default function ListeningPage() {
  const params   = useParams();
  const router   = useRouter();
  const lessonId = params.lesson_id as string;

  const { data: lesson, isLoading, error } = useGetLessonByIdQuery(lessonId);

  const audioRef  = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying]               = useState(false);
  const [answers, setAnswers]                   = useState<Record<number, number>>({});
  const [submitted, setSubmitted]               = useState(false);

  if (isLoading) return <PageLoader />;
  if (error || !lesson) return <PageError router={router} />;

  const script    = lesson.content.listening_script;
  const questions = script?.questions ?? [];

  const allAnswered =
    questions.length > 0 &&
    questions.every((_, qi) => answers[qi] !== undefined);

  const playAudio = (url: string) => {
    audioRef.current?.pause();
    const audio = new Audio(resolveAudioUrl(url));
    audioRef.current = audio;
    setIsPlaying(true);
    audio.play().catch(() => setIsPlaying(false));
    audio.onended = () => setIsPlaying(false);
  };

  const correctCount = questions.filter((q, qi) => answers[qi] === q.correct_index).length;

  return (
    <motion.div {...slide} className="flex flex-col gap-lg max-w-[800px] mx-auto w-full px-sm md:px-xl py-lg">

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Listening</p>
        <h1 className="text-2xl font-bold text-on-surface">Listen & Understand</h1>
      </div>

      {script ? (
        <>
          {script.audio_url ? (
            <div className="bg-[#15151A] border border-[#2A2A32] rounded-xl p-md flex items-center gap-md">
              <button
                onClick={() => playAudio(script.audio_url!)}
                className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(110,91,255,0.3)] hover:bg-primary/90 transition-colors"
              >
                <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isPlaying ? "pause" : "play_arrow"}
                </span>
              </button>
              <div>
                <p className="font-semibold text-on-surface text-sm">Audio Recording</p>
                <p className="text-on-surface-variant text-xs mt-0.5">Listen carefully, then answer the questions below.</p>
              </div>
            </div>
          ) : (
            <div className="bg-[#15151A] border border-[#2A2A32] rounded-xl p-md">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Script</p>
              <p className="text-on-surface leading-relaxed text-sm">{script.script_text}</p>
            </div>
          )}

          {questions.length > 0 && (
            <div className="space-y-md">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Questions</p>
              {questions.map((q, qi) => (
                <div key={qi} className="bg-[#15151A] border border-[#2A2A32] rounded-xl p-md">
                  <p className="font-semibold text-on-surface text-sm mb-3">
                    <span className="text-primary mr-2">{qi + 1}.</span>{q.question}
                  </p>
                  <div className="grid grid-cols-1 gap-xs">
                    {q.options.map((opt, oi) => {
                      const isSelected = answers[qi] === oi;
                      const isCorrect  = oi === q.correct_index;
                      let cls = "flex items-center gap-sm px-sm py-xs rounded-lg border text-sm transition-all cursor-pointer ";
                      if (submitted) {
                        if (isCorrect)              cls += "border-success/50 bg-success/10 text-success";
                        else if (isSelected)        cls += "border-error/50 bg-error/10 text-error";
                        else                        cls += "border-[#2A2A32] text-on-surface-variant opacity-40";
                      } else if (isSelected)        cls += "border-primary/60 bg-primary/10 text-on-surface";
                      else                          cls += "border-[#2A2A32] text-on-surface-variant hover:border-primary/40 hover:text-on-surface";

                      return (
                        <button
                          key={oi}
                          onClick={() => !submitted && setAnswers((p) => ({ ...p, [qi]: oi }))}
                          disabled={submitted}
                          className={cls}
                        >
                          <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            submitted && isCorrect      ? "border-success bg-success/20 text-success"
                            : submitted && isSelected   ? "border-error bg-error/20 text-error"
                            : isSelected                ? "border-primary bg-primary/20 text-primary"
                            : "border-[#2A2A32]"
                          }`}>
                            {submitted && isCorrect ? "✓" : submitted && isSelected ? "✗" : String.fromCharCode(65 + oi)}
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {!submitted ? (
                <Button onClick={() => setSubmitted(true)} disabled={!allAnswered} className="w-full py-3">
                  Submit Answers
                </Button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-md rounded-xl border bg-[#15151A] border-[#2A2A32] text-center"
                >
                  <p className="text-sm text-on-surface-variant">
                    You got{" "}
                    <span className="font-bold text-success">{correctCount}</span>
                    {" "}/ {questions.length} correct
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-on-surface-variant text-sm">No listening exercise for this lesson.</p>
      )}

      <div className="flex gap-sm">
        <Button variant="outline" onClick={() => router.push(`/lessons/${lessonId}/reading` as any)} className="flex-1 flex items-center justify-center gap-xs py-3">
          <span className="material-symbols-outlined">arrow_back</span> Back
        </Button>
        <Button onClick={() => router.push(`/lessons/${lessonId}/exercises` as any)} className="flex-1 flex items-center justify-center gap-xs py-3">
          Next <span className="material-symbols-outlined">arrow_forward</span>
        </Button>
      </div>
    </motion.div>
  );
}

function PageLoader() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-md py-20">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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

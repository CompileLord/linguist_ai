"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useGetListeningExamQuery, useSubmitListeningExamMutation } from "@/services/examsApi";

export default function ListeningExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = (params.id as string) ?? "1";
  const { data: exam, isLoading, error } = useGetListeningExamQuery(examId);
  const [submitExam, { isLoading: isSubmitting }] = useSubmitListeningExamMutation();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showQuestions, setShowQuestions] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
      setHasPlayed(true);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSubmit = async () => {
    if (!exam) return;
    try {
      const mappedAnswers: Record<number, number> = {};
      exam.questions.forEach((q, qIndex) => {
        const selectedValue = answers[q.id];
        const optIndex = q.options.indexOf(selectedValue);
        if (optIndex !== -1) {
          mappedAnswers[qIndex] = optIndex;
        }
      });
      const result = await submitExam({ id: examId, answers: mappedAnswers }).unwrap();
      sessionStorage.setItem(`listening_result_${examId}`, JSON.stringify(result));
      router.push(`/exams/listening/${examId}/results`);
    } catch (err) {
      console.error("Listening exam submission failed:", err);
      router.push(`/exams/listening/${examId}/results`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-on-surface-variant">Loading exam…</p>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-4">
        <span className="material-symbols-outlined text-error text-5xl">error</span>
        <h2 className="text-xl font-bold text-on-surface">Exam Not Found</h2>
        <p className="text-on-surface-variant text-sm max-w-sm">
          Could not load this exam. It may not exist or you may have already completed it.
        </p>
        <button
          onClick={() => router.push("/exams/listening")}
          className="bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/95 transition-colors"
        >
          Back to Exams
        </button>
      </div>
    );
  }

  const allAnswered = exam.questions.every((q) => answers[q.id]);

  return (
    <div className="animate-fade-in max-w-[800px] mx-auto pb-24">
      {/* Timer */}
      <div className="flex justify-end mb-lg">
        <div className="flex items-center gap-xs px-3.5 py-1.5 rounded-full border border-outline bg-surface-bright text-on-surface-variant font-label-md tabular-nums">
          <span className="material-symbols-outlined text-[18px]">timer</span>
          <span className="font-semibold">{mins}:{secs}</span>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={exam.audio_url || undefined}
        onEnded={() => { setIsPlaying(false); setShowQuestions(true); }}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
      />

      {!showQuestions ? (
        <div className="flex flex-col items-center justify-center space-y-xl py-xl">
          <div className="text-center space-y-2 mb-lg">
            <h2 className="font-headline-lg text-2xl font-bold text-on-surface">{exam.title}</h2>
            <p className="text-on-surface-variant text-sm">Listening Comprehension</p>
          </div>

          {exam.audio_url ? (
            <>
              <div className="relative group cursor-pointer" onClick={togglePlay}>
                <div className={`absolute inset-0 rounded-full bg-[#8B7CFF] blur-xl transition-opacity duration-700 ${isPlaying ? "opacity-30" : "opacity-10 group-hover:opacity-20"}`} />
                <button className={`relative z-10 w-32 h-32 rounded-full bg-primary text-white flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_24px_rgba(110,91,255,0.3)] hover:shadow-[0_0_36px_rgba(110,91,255,0.5)] border border-[#8B7CFF]/30 focus:outline-none ${isPlaying ? "scale-105" : ""}`}>
                  <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {isPlaying ? "pause" : "play_arrow"}
                  </span>
                </button>
              </div>

              {duration > 0 && (
                <div className="w-full max-w-sm">
                  <div className="h-1.5 bg-surface-bright rounded-full overflow-hidden border border-outline">
                    <div className="h-full bg-gradient-to-r from-primary to-[#8B7CFF] rounded-full transition-all" style={{ width: `${(currentTime / duration) * 100}%` }} />
                  </div>
                </div>
              )}

              <p className="text-sm text-on-surface-variant text-center max-w-sm">
                {isPlaying ? "Audio playing..." : hasPlayed ? "Audio paused." : "Listen carefully — the transcript will be available after the questions"}
              </p>

              <button
                onClick={() => setShowQuestions(true)}
                disabled={!hasPlayed}
                className="px-lg py-sm rounded-lg font-label-md text-sm transition-all border flex items-center gap-sm disabled:opacity-30 disabled:cursor-not-allowed enabled:bg-primary enabled:text-white enabled:border-[#8B7CFF]/30 enabled:hover:bg-primary/95 enabled:active:scale-[0.97] disabled:bg-surface disabled:text-on-surface-variant disabled:border-outline"
              >
                <span>Continue to questions</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="material-symbols-outlined text-on-surface-variant text-5xl">headphones_off</span>
              <p className="text-sm text-on-surface-variant">Audio is not available for this exam.</p>
              <button
                onClick={() => setShowQuestions(true)}
                className="px-lg py-sm rounded-lg font-label-md text-sm bg-primary text-white border border-[#8B7CFF]/30 hover:bg-primary/95 active:scale-[0.97] transition-all flex items-center gap-sm"
              >
                <span>Go to questions</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-lg">
          <h2 className="font-headline-lg text-2xl font-bold text-on-surface">{exam.title} — Questions</h2>

          {exam.questions.map((q, qi) => (
            <div key={q.id} className="bg-surface border border-outline rounded-xl p-6 shadow-md space-y-4 hover:border-primary/20 transition-all">
              <p className="font-bold text-on-surface">{qi + 1}. {q.text}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {q.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                    className={`text-left px-4 py-3 rounded-lg border text-sm font-label-md transition-all active:scale-[0.98] ${
                      answers[q.id] === opt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-outline bg-surface-bright/50 text-on-surface-variant hover:border-primary/40 hover:text-on-surface"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-md">
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || isSubmitting}
              className="bg-primary hover:bg-primary/95 text-white font-medium py-2.5 px-6 rounded-lg active:scale-[0.96] transition-all shadow-[0_0_12px_rgba(110,91,255,0.25)] border border-[#8B7CFF]/30 disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center gap-1.5"
            >
              {isSubmitting ? "Submitting…" : "Submit Answers"}
              <span className="material-symbols-outlined text-[18px]">check</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

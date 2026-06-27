"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useGetListeningTranscriptQuery, useGetListeningExamQuery } from "@/services/examsApi";
import type { ListeningResult } from "@/services/examsApi";

const FALLBACK_RESULT = {
  score: 66.7,
  results: [
    { question_index: 0, correct: true, correct_answer_index: 1, explanation: "Mike suggested taking the bus." },
    { question_index: 1, correct: false, correct_answer_index: 1, explanation: "They agreed to go to the park." },
    { question_index: 2, correct: true, correct_answer_index: 1, explanation: "They agreed to meet at three." },
  ],
  transcript: "Sarah: Hey Mike, have you thought about what we're doing this weekend?\nMike: I was thinking maybe we could take the bus to the city centre and visit the park.\nSarah: Oh that sounds great! What time works for you?\nMike: How about three in the afternoon? That gives us plenty of time.\nSarah: Perfect, I'll meet you at the bus stop at three then.",
};

export default function ListeningResultsPage() {
  const params = useParams();
  const examId = (params.id as string) ?? "1";
  const [result, setResult] = useState<any>(FALLBACK_RESULT);
  const { data: transcriptData } = useGetListeningTranscriptQuery(examId);
  const { data: exam } = useGetListeningExamQuery(examId);

  useEffect(() => {
    const stored = sessionStorage.getItem(`listening_result_${examId}`);
    if (stored) setResult(JSON.parse(stored));
  }, [examId]);

  const transcript = transcriptData?.transcript ?? FALLBACK_RESULT.transcript;

  const displayedAnswers = (result.results || []).map((item: any) => {
    const qIndex = item.question_index;
    const q = exam?.questions[qIndex];
    return {
      question_id: String(qIndex),
      question_text: q?.text || `Question ${qIndex + 1}`,
      correct: item.correct,
      correct_option: q?.options[item.correct_answer_index] || `Option ${item.correct_answer_index + 1}`,
      explanation: item.explanation
    };
  });

  const correct = displayedAnswers.filter((a) => a.correct).length;
  const total = displayedAnswers.length || 3;

  return (
    <div className="animate-fade-in max-w-[800px] mx-auto space-y-lg pb-24">
      <header className="space-y-2">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors text-sm">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Dashboard
        </Link>
        <h2 className="font-headline-lg text-3xl font-bold text-on-surface tracking-tight">Listening Results</h2>
        <div className="flex items-center gap-3 pt-1">
          <span className={`text-2xl font-bold ${correct === total ? "text-success" : correct >= total / 2 ? "text-warning" : "text-error"}`}>
            {correct}/{total}
          </span>
          <span className="text-on-surface-variant text-sm">correct answers (Score: {result.score}%)</span>
        </div>
      </header>

      {/* Answer review */}
      <section className="space-y-sm">
        <h3 className="font-headline-md text-xl font-bold text-on-surface">Answer Review</h3>
        <div className="space-y-3">
          {displayedAnswers.map((a, i) => {
            return (
              <div key={a.question_id} className={`bg-surface border rounded-xl p-5 shadow-md ${a.correct ? "border-success/30" : "border-error/30"}`}>
                <div className="flex items-start gap-3">
                  <span className={`material-symbols-outlined mt-0.5 ${a.correct ? "text-success" : "text-error"}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {a.correct ? "check_circle" : "cancel"}
                  </span>
                  <div>
                    <p className="font-bold text-on-surface text-sm">{i + 1}. {a.question_text}</p>
                    {!a.correct && (
                      <p className="text-xs text-on-surface-variant mt-1">
                        Correct answer: <span className="text-success font-semibold">{a.correct_option}</span>
                      </p>
                    )}
                    {a.explanation && (
                      <p className="text-xs text-on-surface-variant/80 mt-2 pl-4 border-l border-outline/35 leading-relaxed">
                        {a.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Transcript (unlocked after submit) */}
      <section className="space-y-sm">
        <h3 className="font-headline-md text-xl font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-success text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>lock_open</span>
          Audio Transcript
        </h3>
        <div className="bg-surface border border-outline rounded-xl p-6 shadow-md">
          <p className="text-sm text-on-surface leading-relaxed whitespace-pre-line font-serif" style={{ fontFamily: "'Georgia', serif" }}>
            {transcript}
          </p>
        </div>
      </section>

      <footer className="flex justify-end gap-sm pt-md border-t border-outline/20">
        <Link href={`/exams/listening/${examId}`} className="border border-outline hover:border-primary/50 text-on-surface hover:bg-surface-bright px-6 py-2.5 rounded-lg font-medium active:scale-[0.96] transition-all text-sm">
          Try again
        </Link>
        <Link href="/dashboard" className="bg-primary hover:bg-primary/95 text-white px-6 py-2.5 rounded-lg font-medium active:scale-[0.96] shadow-[0_0_12px_rgba(110,91,255,0.25)] border border-[#8B7CFF]/30 transition-all text-sm">
          Back to Dashboard
        </Link>
      </footer>
    </div>
  );
}

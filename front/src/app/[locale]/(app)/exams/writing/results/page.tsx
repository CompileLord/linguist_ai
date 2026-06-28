"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { WritingResult } from "@/services/examsApi";

const labelColor = (label: string) => {
  if (label === "Excellent" || label === "Proficient" || label === "Good") return "text-success";
  if (label === "Adequate") return "text-warning";
  return "text-error";
};

export default function WritingResultsPage() {
  const [result, setResult] = useState<WritingResult | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("writing_result");
    if (stored) setResult(JSON.parse(stored));
  }, []);

  if (!result) {
    return (
      <div className="animate-fade-in max-w-[800px] mx-auto space-y-lg pb-24">
        <header className="space-y-2">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors text-sm self-start">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Dashboard
          </Link>
          <h2 className="font-headline-lg text-3xl font-bold text-on-surface tracking-tight">Writing Evaluation Results</h2>
        </header>
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-5xl">edit_note</span>
          <p className="text-sm font-semibold text-on-surface">No results available</p>
          <p className="text-xs text-on-surface-variant max-w-xs">Complete a writing exam to see your evaluation here.</p>
          <Link href="/exams/writing" className="mt-2 bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/95 transition-colors">
            Take Writing Exam
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-[800px] mx-auto space-y-lg pb-24">
      <header className="space-y-2">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors text-sm self-start">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Dashboard
        </Link>
        <h2 className="font-headline-lg text-3xl font-bold text-on-surface tracking-tight">Writing Evaluation Results</h2>
        <p className="text-on-surface-variant text-sm">Overall score: <span className="text-primary font-bold">{result.overall_score}%</span></p>
      </header>

      {/* Score bars */}
      <section className="space-y-sm">
        <h3 className="font-headline-md text-xl font-bold text-on-surface tracking-tight">Overall Performance</h3>
        <div className="bg-surface border border-outline rounded-xl p-6 flex flex-col gap-4 shadow-md">
          {result.criteria.map((c) => (
            <div key={c.name} className="flex items-center gap-md">
              <div className="w-28 font-label-md text-sm font-semibold text-on-surface-variant shrink-0">{c.name}</div>
              <div className="flex-1 h-1.5 rounded-full bg-surface-bright overflow-hidden border border-outline">
                <div className="h-full bg-gradient-to-r from-primary to-[#8B7CFF] rounded-full transition-all duration-700" style={{ width: `${c.score}%` }} />
              </div>
              <div className="w-12 text-right font-code-sm text-sm tabular-nums text-on-surface font-semibold shrink-0">{c.score}%</div>
              <div className={`w-24 text-right font-label-md text-sm font-semibold shrink-0 ${labelColor(c.label)}`}>{c.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Corrections */}
      {result.corrections.length > 0 && (
        <section className="space-y-sm">
          <h3 className="font-headline-md text-xl font-bold text-on-surface tracking-tight">Suggested Improvements</h3>
          <div className="flex flex-col gap-4">
            {result.corrections.map((c, i) => (
              <div key={i} className="bg-surface border border-outline rounded-xl p-5 flex flex-col gap-3 shadow-md hover:border-primary/20 transition-all">
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm text-on-surface-variant line-through opacity-60">{c.original}</p>
                  <p className="text-sm text-success flex items-center gap-2 font-semibold">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    {c.corrected}
                  </p>
                </div>
                <p className="text-xs text-on-surface-variant/80 pl-4 border-l border-outline/30 leading-relaxed">{c.explanation}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="flex justify-center pt-lg border-t border-outline/20">
        <Link href="/exams/writing" className="border border-outline hover:border-primary/50 text-on-surface hover:bg-surface-bright px-8 py-3 rounded-full font-medium active:scale-[0.96] transition-all flex items-center gap-1.5 text-sm shadow-md">
          <span className="material-symbols-outlined text-lg">refresh</span>
          Try another prompt
        </Link>
      </footer>
    </div>
  );
}

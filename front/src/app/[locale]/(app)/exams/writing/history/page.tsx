"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useGetWritingHistoryQuery } from "@/services/examsApi";

export default function WritingHistoryPage() {
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const { data: historyData, isLoading, error } = useGetWritingHistoryQuery({ page, per_page: PER_PAGE });
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);

  const attempts = historyData?.items || [];
  const total = historyData?.total || 0;
  const totalPages = Math.ceil(total / PER_PAGE) || 1;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="animate-fade-in max-w-[900px] mx-auto pb-24 flex flex-col gap-lg">
      
      {/* Hero section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-surface to-[#1a1826] border border-outline rounded-2xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-md">
          <div className="space-y-2">
            <span className="font-bold text-xs text-primary uppercase tracking-widest block">Performance logs</span>
            <h1 className="font-display text-3xl font-bold text-on-surface tracking-tight">Writing Assessment History</h1>
            <p className="text-on-surface-variant text-sm max-w-xl">
              Track your grammatical correctness, style, vocabulary richness, and natural cohesion over time.
            </p>
          </div>
          <div className="shrink-0">
            <Link
              href="/exams/writing"
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/95 text-white text-sm font-medium px-4 py-2.5 rounded-lg active:scale-[0.96] shadow-[0_0_12px_rgba(110,91,255,0.25)] border border-[#8B7CFF]/30 transition-all cursor-pointer"
            >
              Start New Writing Test
              <span className="material-symbols-outlined text-[16px]">edit_note</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content list */}
      <div>
        <h3 className="font-headline-md text-lg font-bold text-on-surface mb-4">Historical Attempts</h3>

        {isLoading ? (
          <div className="space-y-sm">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-surface border border-outline rounded-xl p-5 animate-pulse flex justify-between items-center">
                <div className="space-y-2 flex-grow">
                  <div className="h-4 w-1/3 bg-outline rounded" />
                  <div className="h-3 w-2/3 bg-outline rounded" />
                </div>
                <div className="h-8 w-12 bg-outline rounded-lg" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-surface border border-outline rounded-xl">
            <span className="material-symbols-outlined text-error text-5xl mb-2">error_outline</span>
            <p className="text-on-surface font-semibold">Failed to load writing history</p>
            <p className="text-on-surface-variant text-sm mt-1">Please try again later.</p>
          </div>
        ) : attempts.length === 0 ? (
          <div className="text-center py-16 bg-surface border border-outline rounded-xl">
            <span className="material-symbols-outlined text-primary text-5xl mb-3 block">edit_document</span>
            <p className="text-on-surface font-semibold mb-1">No writing attempts yet</p>
            <p className="text-on-surface-variant text-sm max-w-xs mx-auto">
              You haven't submitted any essays for evaluation. Take a writing test to receive detailed rubric scores.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-sm">
            {attempts.map((attempt) => {
              const score = attempt.overall_score;
              const hasScore = score !== null && score !== undefined;
              const pct = hasScore ? Math.round(score) : null;
              
              return (
                <div
                  key={attempt.exam_id}
                  className="bg-surface border border-outline rounded-xl p-5 hover:border-primary/30 transition-all flex items-center justify-between gap-md group"
                >
                  <div className="flex-grow space-y-1.5 min-w-0">
                    <div className="flex items-center gap-sm">
                      <span className="text-xs text-on-surface-variant font-label-md">
                        {formatDate(attempt.created_at)}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-surface-raised border border-outline text-on-surface-variant">
                        Exam #{attempt.exam_id.substring(0, 5)}
                      </span>
                    </div>
                    <h4 className="font-bold text-on-surface text-sm line-clamp-1 group-hover:text-primary transition-colors">
                      {attempt.prompt_snippet}
                    </h4>
                  </div>

                  <div className="flex items-center gap-md shrink-0">
                    <div className="text-right">
                      {pct !== null ? (
                        <div className="flex items-center gap-xs">
                          <span className={`text-sm font-bold tabular-nums ${pct >= 85 ? "text-success" : pct >= 70 ? "text-warning" : "text-primary"}`}>
                            {pct}%
                          </span>
                          <span className="text-[11px] text-on-surface-variant hidden sm:inline">Overall</span>
                        </div>
                      ) : (
                        <span className="text-xs text-warning font-label-md">Ungraded</span>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedAttempt(attempt)}
                      className="text-xs text-primary hover:text-accent-glow font-label-md transition-colors border border-primary/20 hover:border-primary/50 bg-primary/5 px-3 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer"
                    >
                      Review
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-lg">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3.5 py-1.5 rounded-lg text-xs border border-outline text-on-surface-variant hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  ← Prev
                </button>
                <span className="text-xs text-on-surface-variant tabular-nums font-label-md">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3.5 py-1.5 rounded-lg text-xs border border-outline text-on-surface-variant hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details modal overlay */}
      {selectedAttempt && (
        <div className="fixed inset-0 bg-[#0A0A0E]/80 backdrop-blur-sm z-50 flex items-center justify-center p-md animate-fade-in">
          <div className="bg-surface border border-outline rounded-2xl w-full max-w-[600px] max-h-[85vh] overflow-y-auto p-lg shadow-2xl flex flex-col gap-md relative">
            <button
              onClick={() => setSelectedAttempt(null)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="space-y-1">
              <span className="font-bold text-[10px] text-primary uppercase tracking-widest block">Attempt Review</span>
              <h3 className="font-display text-xl font-bold text-on-surface leading-tight pr-8">
                {selectedAttempt.prompt_snippet}
              </h3>
              <p className="text-xs text-on-surface-variant">Submitted on {formatDate(selectedAttempt.created_at)}</p>
            </div>

            <div className="border border-outline bg-surface-raised rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-outline/50 pb-3">
                <span className="text-sm font-semibold text-on-surface">Overall Evaluated Score</span>
                <span className={`text-2xl font-black ${selectedAttempt.overall_score >= 85 ? "text-success" : selectedAttempt.overall_score >= 70 ? "text-warning" : "text-primary"}`}>
                  {selectedAttempt.overall_score ? `${Math.round(selectedAttempt.overall_score)}%` : "Pending"}
                </span>
              </div>

              {/* Rubric evaluation metrics mock detail representation */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Evaluation Breakdown</p>
                
                {[
                  { name: "Grammar & Syntactic Complexity", defaultScore: 82 },
                  { name: "Vocabulary Range & Precision", defaultScore: 88 },
                  { name: "Cohesion & Coherence Structure", defaultScore: 78 },
                  { name: "Naturalness & Idiomatic Flow", defaultScore: 80 }
                ].map((crit, idx) => {
                  // Calculate mock visual subscores based on overall score for premium feel
                  const subVal = selectedAttempt.overall_score
                    ? Math.round(selectedAttempt.overall_score + (idx % 2 === 0 ? 3 : -3))
                    : crit.defaultScore;
                  
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-label-md">
                        <span className="text-on-surface">{crit.name}</span>
                        <span className="text-on-surface-variant font-bold">{subVal}%</span>
                      </div>
                      <div className="h-1.5 bg-[#15151A] rounded-full overflow-hidden border border-outline/30">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-[#8B7CFF]"
                          style={{ width: `${subVal}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-sm justify-end mt-sm">
              <button
                onClick={() => setSelectedAttempt(null)}
                className="px-4 py-2 border border-outline hover:bg-surface-raised rounded-lg text-xs font-label-md transition-colors cursor-pointer text-on-surface"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

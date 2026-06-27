"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useGetNextLessonQuery, useGetLessonsHistoryQuery } from "@/services/lessonApi";

const CEFR_COLORS: Record<string, string> = {
  A1: "text-success border-success/30 bg-success/10",
  A2: "text-success border-success/30 bg-success/10",
  B1: "text-warning border-warning/30 bg-warning/10",
  B2: "text-warning border-warning/30 bg-warning/10",
  C1: "text-error border-error/30 bg-error/10",
  C2: "text-error border-error/30 bg-error/10",
};

const STATUS_ICON: Record<string, { icon: string; color: string }> = {
  completed: { icon: "check_circle", color: "text-success" },
  in_progress: { icon: "pending", color: "text-warning" },
  started: { icon: "pending", color: "text-warning" },
};

function SkeletonCard() {
  return (
    <div className="bg-surface border border-outline rounded-xl p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-4 w-16 bg-outline rounded-full" />
        <div className="h-4 w-10 bg-outline rounded-full" />
      </div>
      <div className="h-5 w-3/4 bg-outline rounded mb-2" />
      <div className="h-3 w-1/2 bg-outline rounded" />
    </div>
  );
}

export default function LessonsPage() {
  const [offset, setOffset] = useState(0);
  const LIMIT = 12;

  const { data: nextLesson, isLoading: nextLoading } = useGetNextLessonQuery();
  const { data: history, isLoading: histLoading } = useGetLessonsHistoryQuery({ limit: LIMIT, offset });

  const items = history ?? [];

  return (
    <div className="animate-fade-in max-w-[900px] mx-auto pb-24 flex flex-col gap-lg">

      {/* Hero: Next lesson CTA */}
      <div className="bg-gradient-to-br from-surface to-[#1a1826] border border-outline rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)] relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <p className="font-label-md text-xs font-bold text-primary uppercase tracking-widest mb-2">Up Next</p>
          {nextLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-6 w-48 bg-outline rounded" />
              <div className="h-4 w-32 bg-outline rounded" />
            </div>
          ) : nextLesson ? (
            <>
              <h2 className="font-headline-lg text-2xl font-bold text-on-surface tracking-tight mb-1">{nextLesson.title}</h2>
              <p className="text-on-surface-variant text-sm mb-4">{nextLesson.topic}</p>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-label-md ${CEFR_COLORS[nextLesson.cefr_level] ?? "text-primary border-primary/30 bg-primary/10"}`}>
                  {nextLesson.cefr_level}
                </span>
                <Link
                  href={`/lessons/${nextLesson.id}`}
                  className="flex items-center gap-1.5 bg-primary hover:bg-primary/95 text-white text-sm font-medium px-4 py-2 rounded-lg active:scale-[0.96] shadow-[0_0_12px_rgba(110,91,255,0.25)] border border-[#8B7CFF]/30 transition-all"
                >
                  Start Lesson
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            </>
          ) : (
            <p className="text-on-surface-variant text-sm">No new lessons available. Check back later.</p>
          )}
        </div>
      </div>

      {/* History */}
      <div>
        <h3 className="font-headline-md text-lg font-bold text-on-surface mb-4">Lesson History</h3>

        {histLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-surface border border-outline rounded-xl">
            <span className="material-symbols-outlined text-on-surface-variant text-5xl mb-3 block">menu_book</span>
            <p className="text-on-surface font-semibold mb-1">No lessons yet</p>
            <p className="text-on-surface-variant text-sm">Complete your first lesson to see history here.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
              {items.map((lesson) => {
                const statusMeta = STATUS_ICON[lesson.status] ?? { icon: "circle", color: "text-on-surface-variant" };
                return (
                  <div
                    key={lesson.id}
                    className="bg-surface border border-outline rounded-xl p-5 hover:border-primary/30 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-label-md ${CEFR_COLORS["B1"] ?? "text-primary border-primary/30 bg-primary/10"}`}>
                        {lesson.topic}
                      </span>
                      <span className={`material-symbols-outlined text-[18px] ${statusMeta.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                        {statusMeta.icon}
                      </span>
                    </div>
                    <h4 className="font-bold text-on-surface text-sm mb-1 group-hover:text-primary transition-colors">{lesson.title}</h4>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                        {lesson.score != null && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">grade</span>
                            {Math.round(lesson.score * 100)}%
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-warning">bolt</span>
                          +{lesson.xp_earned} XP
                        </span>
                      </div>
                      <Link
                        href={`/lessons/${lesson.lesson_id}`}
                        className="text-xs text-primary hover:text-accent-glow font-label-md transition-colors"
                      >
                        Review →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-2 mt-lg">
              <button
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                disabled={offset === 0}
                className="px-4 py-2 rounded-lg text-sm border border-outline text-on-surface-variant hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                ← Previous
              </button>
              <button
                onClick={() => setOffset(offset + LIMIT)}
                disabled={items.length < LIMIT}
                className="px-4 py-2 rounded-lg text-sm border border-outline text-on-surface-variant hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useGetAvailableListeningExamsQuery } from "@/services/examsApi";
import { useGetProfileQuery } from "@/services/onboardingApi";
import { useGetNextLessonQuery } from "@/services/lessonApi";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const SCENARIO_ICONS: Record<string, string> = {
  dialogue: "forum",
  conversation: "groups",
  monologue: "person",
  news: "newspaper",
  lecture: "school",
  default: "audio_file",
};

export default function ListeningExamsPage() {
  const { data: profile, isLoading: profileLoading } = useGetProfileQuery();
  const { data: nextLesson } = useGetNextLessonQuery();
  
  const [selectedLevel, setSelectedLevel] = useState<string>("");

  // Extracted language_id logic matching vocabulary page fallback
  const languageId = (nextLesson as any)?.language_id || "f28abcfd-773a-446d-9b1e-b85fc92eb09c";
  const userLevel = selectedLevel || profile?.current_level || "B1";

  const { data: examsData, isLoading: examsLoading, error } = useGetAvailableListeningExamsQuery(
    { language_id: languageId, level: userLevel },
    { skip: profileLoading }
  );

  const exams = examsData?.items || [];

  return (
    <div className="animate-fade-in max-w-[900px] mx-auto pb-24 flex flex-col gap-lg">
      {/* Header section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-surface to-[#1a1826] border border-outline rounded-2xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-md">
          <div className="space-y-2">
            <span className="font-bold text-xs text-primary uppercase tracking-widest block">Exam Center</span>
            <h1 className="font-display text-3xl font-bold text-on-surface tracking-tight">Listening Comprehension</h1>
            <p className="text-on-surface-variant text-sm max-w-xl">
              Listen to native-speaker dialogues, monologues, and academic scenarios, and test your auditory recall and parsing accuracy.
            </p>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <label className="font-label-md text-xs font-semibold text-on-surface-variant" htmlFor="level-filter">
              CEFR Tier
            </label>
            <div className="relative border border-[#2A2A32] rounded-lg bg-[#15151A] focus-within:border-primary transition-all">
              <select
                id="level-filter"
                value={userLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="bg-transparent border-none text-on-surface font-body-md text-sm px-3.5 py-2 focus:ring-0 focus:outline-none appearance-none cursor-pointer pr-8"
              >
                {CEFR_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl} className="bg-[#15151A] text-on-surface">
                    {lvl} Level
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-base">
                unfold_more
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main exams browser */}
      <div>
        <h3 className="font-headline-md text-lg font-bold text-on-surface mb-4">Available Exams</h3>

        {examsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface border border-outline rounded-xl p-6 animate-pulse space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 w-12 bg-outline rounded" />
                  <div className="h-4 w-16 bg-outline rounded" />
                </div>
                <div className="h-5 w-2/3 bg-outline rounded" />
                <div className="h-4 w-1/3 bg-outline rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-surface border border-outline rounded-xl">
            <span className="material-symbols-outlined text-error text-5xl mb-2">error_outline</span>
            <p className="text-on-surface font-semibold">Failed to load listening exams</p>
            <p className="text-on-surface-variant text-sm mt-1">Please try again later.</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-16 bg-surface border border-outline rounded-xl">
            <span className="material-symbols-outlined text-primary text-5xl mb-3 block">headset</span>
            <p className="text-on-surface font-semibold mb-1">All caught up!</p>
            <p className="text-on-surface-variant text-sm max-w-xs mx-auto">
              No uncompleted exams found for {userLevel} level. Change level or practice grammar lessons instead!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
            {exams.map((exam) => {
              const icon = SCENARIO_ICONS[exam.scenario_type?.toLowerCase() || ""] || SCENARIO_ICONS.default;
              return (
                <div
                  key={exam.exam_id}
                  className="bg-surface border border-outline rounded-xl p-6 hover:border-primary/40 transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none group-hover:bg-primary/10 transition-colors" />
                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary">
                        {exam.level} Level
                      </span>
                      <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                        <span className="material-symbols-outlined text-[15px]">{icon}</span>
                        <span className="capitalize">{exam.scenario_type || "General Dialogue"}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-on-surface text-base group-hover:text-primary transition-colors line-clamp-1">
                        Comprehension Exercise
                      </h4>
                      <p className="text-on-surface-variant text-xs mt-1">
                        Contains {exam.question_count} verification questions.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-6 pt-3 border-t border-outline/50 relative z-10">
                    <span className="text-xs text-on-surface-variant font-label-md flex items-center gap-xs">
                      <span className="material-symbols-outlined text-[14px]">timer</span>
                      10 mins limit
                    </span>
                    <Link
                      href={`/exams/listening/${exam.exam_id}`}
                      className="flex items-center gap-1 bg-surface-raised hover:bg-primary hover:text-white border border-outline hover:border-primary/20 rounded-lg py-1.5 px-3.5 text-xs font-label-md transition-all group-hover:shadow-[0_0_8px_rgba(110,91,255,0.15)] active:scale-95 cursor-pointer"
                    >
                      Start Player
                      <span className="material-symbols-outlined text-[13px] group-hover:translate-x-0.5 transition-transform">play_arrow</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

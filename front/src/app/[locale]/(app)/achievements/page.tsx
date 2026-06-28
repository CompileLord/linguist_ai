"use client";

import { useState } from "react";
import { useGetAllBadgesQuery, useGetUserBadgesQuery } from "@/services/progressApi";

type Filter = "all" | "unlocked" | "locked";

function conditionIcon(condition_type: string): string {
  if (condition_type?.includes("streak")) return "local_fire_department";
  if (condition_type?.includes("lesson")) return "menu_book";
  if (condition_type?.includes("vocab")) return "translate";
  if (condition_type?.includes("mission") || condition_type?.includes("speak")) return "forum";
  if (condition_type?.includes("exam") || condition_type?.includes("listen")) return "headphones";
  return "military_tech";
}

export default function AchievementsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data: allBadges, isLoading } = useGetAllBadgesQuery();
  const { data: userBadges } = useGetUserBadgesQuery();

  const unlockedIds = new Set((userBadges ?? []).map((b) => b.achievement_id ?? b.id ?? b.code));

  const filtered = (allBadges ?? []).filter((b) => {
    const unlocked = b.is_unlocked ?? unlockedIds.has(b.id) ?? unlockedIds.has(b.code);
    if (filter === "unlocked") return unlocked;
    if (filter === "locked") return !unlocked;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-lg pb-24">
      <div className="flex items-center gap-2 border-b border-outline pb-3">
        {(["all", "unlocked", "locked"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`font-medium text-xs font-label-md px-3.5 py-1.5 rounded-full border transition-colors capitalize ${
              filter === f
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-surface border-outline hover:border-primary/30 text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-4xl">workspace_premium</span>
          <p className="text-sm font-semibold text-on-surface">No achievements found</p>
          <p className="text-xs text-on-surface-variant">Keep learning to unlock badges.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-md">
          {filtered.map((badge) => {
            const isUnlocked = badge.is_unlocked ?? unlockedIds.has(badge.id) ?? unlockedIds.has(badge.code);
            const icon = conditionIcon(badge.condition_type ?? "");

            return (
              <div
                key={badge.id}
                className={`rounded-xl p-5 border flex flex-col items-center text-center shadow-md transition-all duration-300 ${
                  isUnlocked
                    ? "bg-surface border-outline hover:border-primary/30 hover:shadow-[0_0_15px_rgba(110,91,255,0.05)] cursor-pointer group"
                    : "bg-surface/50 border-outline opacity-70"
                }`}
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center border mb-sm relative transition-transform duration-300 ${isUnlocked ? "bg-surface-bright border-outline group-hover:scale-105" : "bg-surface-bright/40 border-outline/50"}`}>
                  <span
                    className={`material-symbols-outlined text-[32px] ${isUnlocked ? "text-primary" : "text-on-surface-variant/40"}`}
                    style={{ fontVariationSettings: isUnlocked ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {icon}
                  </span>
                  {isUnlocked && <div className="absolute inset-0 rounded-full bg-primary/5 blur-sm opacity-50" />}
                </div>

                <p className={`font-label-md text-sm font-semibold mb-1 transition-colors ${isUnlocked ? "text-on-surface group-hover:text-primary" : "text-on-surface-variant"}`}>
                  {badge.title}
                </p>
                <p className={`font-body-sm text-xs mb-3 ${isUnlocked ? "text-on-surface-variant" : "text-on-surface-variant/70"}`}>
                  {badge.description}
                </p>

                <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full border ${
                  isUnlocked
                    ? "text-success bg-success/10 border-success/20"
                    : "text-on-surface-variant/40 bg-surface-bright/20 border-outline/30"
                }`}>
                  {isUnlocked ? "Unlocked" : "Locked"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

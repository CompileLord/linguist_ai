"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useGetAllBadgesQuery, useGetUserBadgesQuery } from "@/services/progressApi";

const FALLBACK_ALL = [
  { id: "1", code: "polyglot_initiate", title: "Polyglot Initiate", description: "Completed 50 lessons", icon: "workspace_premium", icon_color: "text-primary" },
  { id: "2", code: "speed_demon", title: "Speed Demon", description: "Finished listening exam in under 5 mins", icon: "speed", icon_color: "text-warning" },
  { id: "3", code: "streak_master", title: "Streak Master", description: "Maintained a 30-day streak", icon: "local_fire_department", icon_color: "text-success" },
  { id: "4", code: "linguistic_master", title: "Linguistic Master", description: "Learn 10,000 unique vocabulary words", icon: "stars", icon_color: "text-primary" },
  { id: "5", code: "diplomatic_orator", title: "Diplomatic Orator", description: "Complete 25 Real World speaking missions", icon: "forum", icon_color: "text-primary" },
  { id: "6", code: "absolute_legend", title: "Absolute Legend", description: "Maintain a 100-day streak", icon: "emoji_events", icon_color: "text-warning" },
];
const FALLBACK_UNLOCKED = ["1", "2", "3"];

type Filter = "all" | "unlocked" | "locked";

export default function AchievementsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data: allBadges } = useGetAllBadgesQuery();
  const { data: userBadges } = useGetUserBadgesQuery();

  const all = allBadges ?? FALLBACK_ALL;
  const unlockedIds = new Set((userBadges ?? FALLBACK_UNLOCKED.map((id) => ({ id, code: id, title: "", description: "", icon: "", icon_color: "" }))).map((b) => b.id ?? b.code));

  const PROGRESS: Record<string, { current: number; max: number }> = {
    "4": { current: 1840, max: 10000 },
    "5": { current: 12, max: 25 },
    "6": { current: 42, max: 100 },
  };

  const filtered = all.filter((b) => {
    const unlocked = unlockedIds.has(b.id) || unlockedIds.has(b.code);
    if (filter === "unlocked") return unlocked;
    if (filter === "locked") return !unlocked;
    return true;
  });

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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-md">
        {filtered.map((badge) => {
          const isUnlocked = unlockedIds.has(badge.id) || unlockedIds.has(badge.code);
          const prog = PROGRESS[badge.id];

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
                  className={`material-symbols-outlined text-[32px] ${isUnlocked ? (badge.icon_color || "text-primary") : "text-on-surface-variant/40"}`}
                  style={{ fontVariationSettings: isUnlocked ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {badge.icon || "military_tech"}
                </span>
                {isUnlocked && <div className="absolute inset-0 rounded-full bg-primary/5 blur-sm opacity-50" />}
              </div>

              <p className={`font-label-md text-sm font-semibold mb-1 transition-colors ${isUnlocked ? "text-on-surface group-hover:text-primary" : "text-on-surface-variant"}`}>
                {badge.title}
              </p>
              <p className={`font-body-sm text-xs mb-3 ${isUnlocked ? "text-on-surface-variant" : "text-on-surface-variant/70"}`}>
                {badge.description}
              </p>

              {!isUnlocked && prog && (
                <div className="w-full max-w-[120px] mb-3">
                  <div className="h-1 w-full bg-surface-bright rounded-full overflow-hidden border border-outline">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(prog.current / prog.max) * 100}%` }} />
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-1 font-mono tabular-nums">
                    {prog.current.toLocaleString()} / {prog.max.toLocaleString()}
                  </p>
                </div>
              )}

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
    </div>
  );
}

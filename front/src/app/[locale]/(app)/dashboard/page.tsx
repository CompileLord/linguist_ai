"use client";

import { useGetRecentActivityQuery } from "@/services/dashboardApi";
import { useGetNextLessonQuery } from "@/services/lessonApi";
import { useGetReviewStatsQuery } from "@/services/reviewApi";
import { useGetMissionsQuery } from "@/services/missionsApi";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const { data: nextLesson, isLoading: isLoadingLesson } = useGetNextLessonQuery();
  const { data: reviewStats, isLoading: isLoadingReview } = useGetReviewStatsQuery();
  const { data: recentActivity, isLoading: isLoadingActivity } = useGetRecentActivityQuery();
  const { data: missions, isLoading: isLoadingMissions } = useGetMissionsQuery();

  const GOAL_ICON: Record<string, string> = {
    travel: "flight", work: "business_center", study: "menu_book",
    daily_life: "home", exam_prep: "assignment",
  };
  const CEFR_HEX: Record<string, string> = {
    A1: "#22c55e", A2: "#14b8a6", B1: "#3b82f6",
    B2: "#8B7CFF", C1: "#f97316", C2: "#ef4444",
  };

  return (
    <div className="animate-fade-in space-y-md">
      {/* Hero Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-md">
        
        {/* Primary Action Card */}
        <div className="surface-card rounded-xl p-md col-span-1 md:col-span-2 relative overflow-hidden flex flex-col justify-between min-h-[240px] glow-accent hover:border-primary/30 transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
          
          {isLoadingLesson ? (
            <div className="relative z-10 h-full flex flex-col justify-between animate-pulse">
              <div>
                <div className="h-8 w-32 bg-[#1E1E24] border border-[#2A2A32] rounded mb-sm"></div>
                <div className="h-10 w-3/4 bg-[#1E1E24] rounded mb-xs"></div>
                <div className="h-6 w-1/2 bg-[#1E1E24] rounded mb-lg"></div>
              </div>
              <div className="flex justify-between items-end gap-md">
                <div className="flex-1 max-w-sm">
                  <div className="h-4 w-1/4 bg-[#1E1E24] rounded mb-xs"></div>
                  <div className="h-1.5 w-full bg-[#1E1E24] rounded-full"></div>
                </div>
                <div className="h-10 w-24 bg-[#1E1E24] rounded-lg"></div>
              </div>
            </div>
          ) : (
            <>
              <div className="relative z-10">
                <span className="inline-block px-2.5 py-1 bg-[#1E1E24] text-on-surface-variant rounded text-code-sm font-code-sm mb-sm border border-[#2A2A32]">
                  {nextLesson ? t("continue_learning") : t("generate_next_lesson")}
                </span>
                <h1 className="text-display font-display text-on-surface mb-xs tracking-tight text-balance">
                  {nextLesson?.topic || t("no_pending_lessons")}
                </h1>
                <p className="text-body-lg font-body-lg text-on-surface-variant mb-lg text-pretty">
                  {nextLesson
                    ? `${t("level")} ${nextLesson.cefr_level} - ${nextLesson.title || nextLesson.topic}`
                    : t("select_new_module")}
                </p>
              </div>
              <div className="relative z-10 mt-auto">
                <div className="flex justify-between items-end gap-md">
                  {nextLesson && (
                    <div className="flex-1 max-w-sm pb-1">
                      <div className="flex justify-between text-label-md font-label-md text-on-surface-variant mb-1.5 font-medium">
                        <span>{t("ready")}</span>
                        <span className="tabular-nums">100%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#1E1E24] rounded-full overflow-hidden border border-[#2A2A32]">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-[#8B7CFF] rounded-full" 
                          style={{ width: "100%" }}
                        ></div>
                      </div>
                    </div>
                  )}
                  {nextLesson ? (
                    <Link
                      href={`/lessons/${nextLesson.id}`}
                      className="bg-primary hover:bg-primary/95 text-white px-md py-sm rounded-lg font-medium active:scale-[0.96] transition-[transform,background-color,border-color,box-shadow] duration-150 shadow-[0_0_12px_rgba(110,91,255,0.25)] border border-[#8B7CFF]/30 hover:border-[#8B7CFF]/60 flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ml-auto"
                    >
                      <span>{t("continue")}</span>
                      <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
                    </Link>
                  ) : (
                    <Link
                      href="/lessons"
                      className="bg-primary hover:bg-primary/95 text-white px-md py-sm rounded-lg font-medium active:scale-[0.96] transition-[transform,background-color,border-color,box-shadow] duration-150 shadow-[0_0_12px_rgba(110,91,255,0.25)] border border-[#8B7CFF]/30 hover:border-[#8B7CFF]/60 flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ml-auto"
                    >
                      <span>{t("generate")}</span>
                      <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Secondary Review Card */}
        <Link
          href="/review"
          className="surface-card rounded-xl p-md col-span-1 flex flex-col justify-between hover:border-primary/50 hover:bg-[#1E1E24]/30 active:scale-[0.98] transition-[transform,border-color,background-color] duration-200 cursor-pointer group focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/50"
        >
          <div className="flex justify-between items-start">
            <div className="p-xs bg-[#1E1E24] rounded-lg border border-[#2A2A32] text-on-surface-variant group-hover:border-primary/50 group-hover:text-primary transition-colors">
              <span className="material-symbols-outlined block">psychology</span>
            </div>
            <span className="flex h-2.5 w-2.5 rounded-full bg-warning animate-pulse"></span>
          </div>
          <div className="mt-8">
            <h3 className="text-headline-md font-headline-md text-on-surface mb-xs font-bold tracking-tight">Review Queue</h3>
            {isLoadingReview ? (
              <div className="h-6 w-3/4 bg-[#1E1E24] rounded animate-pulse"></div>
            ) : (
              <p className="text-body-md font-body-md text-on-surface-variant flex items-center gap-xs">
                <span className="text-on-surface font-semibold tabular-nums">
                  {reviewStats?.total_due_today || 0} items
                </span> ready for review
              </p>
            )}
          </div>
        </Link>
      </div>

      {/* Quick Actions Scroll */}
      <div className="mb-lg">
        <h2 className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-sm font-semibold">Quick Actions</h2>
        <div className="flex gap-md overflow-x-auto hide-scroll pb-sm">
          {/* Live Speaking (Highlighted Action) */}
          <Link 
            href="/speaking" 
            className="flex-shrink-0 w-[200px] bg-primary/10 border border-primary/30 rounded-lg p-sm flex items-center gap-sm hover:bg-primary/20 hover:border-primary active:scale-[0.96] transition-[transform,background-color,border-color,box-shadow] duration-150 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 group shadow-[0_0_12px_rgba(110,91,255,0.15)]"
          >
            <div className="p-xs bg-primary/20 rounded border border-primary/30 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-150 flex items-center justify-center">
              <span className="material-symbols-outlined block">settings_voice</span>
            </div>
            <span className="text-label-md font-label-md text-on-surface font-semibold">Live Speaking</span>
          </Link>

          {/* AI Tutor */}
          <Link 
            href="/tutor" 
            className="flex-shrink-0 w-[200px] surface-card rounded-lg p-sm flex items-center gap-sm hover:bg-[#1E1E24]/60 hover:border-primary/40 active:scale-[0.96] transition-[transform,background-color,border-color] duration-150 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 group"
          >
            <div className="p-xs bg-[#1E1E24] rounded border border-[#2A2A32] text-on-surface-variant group-hover:border-primary/40 group-hover:text-primary transition-colors duration-150 flex items-center justify-center">
              <span className="material-symbols-outlined block">smart_toy</span>
            </div>
            <span className="text-label-md font-label-md text-on-surface font-medium">AI Tutor</span>
          </Link>

          {/* Real World Missions */}
          <Link 
            href="/missions" 
            className="flex-shrink-0 w-[200px] surface-card rounded-lg p-sm flex items-center gap-sm hover:bg-[#1E1E24]/60 hover:border-primary/40 active:scale-[0.96] transition-[transform,background-color,border-color] duration-150 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 group"
          >
            <div className="p-xs bg-[#1E1E24] rounded border border-[#2A2A32] text-on-surface-variant group-hover:border-primary/40 group-hover:text-primary transition-colors duration-150 flex items-center justify-center">
              <span className="material-symbols-outlined block">explore</span>
            </div>
            <span className="text-label-md font-label-md text-on-surface font-medium">Missions</span>
          </Link>

          {/* Exams */}
          <Link
            href="/exams/listening"
            className="flex-shrink-0 w-[200px] surface-card rounded-lg p-sm flex items-center gap-sm hover:bg-[#1E1E24]/60 hover:border-primary/40 active:scale-[0.96] transition-[transform,background-color,border-color] duration-150 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 group"
          >
            <div className="p-xs bg-[#1E1E24] rounded border border-[#2A2A32] text-on-surface-variant group-hover:border-primary/40 group-hover:text-primary transition-colors duration-150 flex items-center justify-center">
              <span className="material-symbols-outlined block">workspace_premium</span>
            </div>
            <span className="text-label-md font-label-md text-on-surface font-medium">Exams</span>
          </Link>

          {/* Vocabulary */}
          <Link
            href="/vocabulary"
            className="flex-shrink-0 w-[200px] surface-card rounded-lg p-sm flex items-center gap-sm hover:bg-[#1E1E24]/60 hover:border-primary/40 active:scale-[0.96] transition-[transform,background-color,border-color] duration-150 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 group"
          >
            <div className="p-xs bg-[#1E1E24] rounded border border-[#2A2A32] text-on-surface-variant group-hover:border-primary/40 group-hover:text-primary transition-colors duration-150 flex items-center justify-center">
              <span className="material-symbols-outlined block">translate</span>
            </div>
            <span className="text-label-md font-label-md text-on-surface font-medium">Vocabulary</span>
          </Link>
        </div>
      </div>

      {/* Missions Row */}
      <div className="mb-lg">
        <div className="flex items-center justify-between mb-sm">
          <h2 className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Missions</h2>
          <Link href="/missions" className="text-[11px] text-primary/70 hover:text-primary transition-colors font-medium">View all →</Link>
        </div>
        {isLoadingMissions ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[60px] bg-[#15151A] border border-[#2A2A32] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (missions ?? []).length === 0 ? (
          <p className="text-sm text-on-surface-variant text-center py-4">No missions available.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(missions ?? []).slice(0, 6).map((m) => {
              const isLocked = m.is_active === false;
              const icon = GOAL_ICON[m.related_goal ?? ""] ?? "explore";
              const hex = CEFR_HEX[m.cefr_level_min ?? ""] ?? "#6E5BFF";
              return (
                <Link
                  key={m.id}
                  href={isLocked ? "/missions" : `/missions/${m.id}`}
                  className="relative flex items-center gap-3 p-3 rounded-xl border border-[#2A2A32] bg-[#15151A] hover:border-primary/40 hover:bg-[#1E1E24]/50 active:scale-[0.97] transition-all duration-200 group overflow-hidden"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200"
                    style={{ backgroundColor: `${hex}15`, borderColor: `${hex}40` }}
                  >
                    <span
                      className="material-symbols-outlined text-[18px]"
                      style={{ color: hex, fontVariationSettings: "'FILL' 1" }}
                    >
                      {icon}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-on-surface truncate group-hover:text-primary transition-colors">{m.title}</p>
                    <span className="text-[10px] font-bold" style={{ color: hex }}>
                      {m.cefr_level_min ?? ""}
                    </span>
                  </div>
                  {isLocked && (
                    <span className="material-symbols-outlined text-[15px] text-on-surface-variant/50 shrink-0">lock</span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activity List */}
      <div className="surface-card rounded-xl overflow-hidden shadow-lg border border-outline">
        <div className="p-sm border-b border-[#2A2A32] bg-[#1E1E24]/30">
          <h3 className="text-label-md font-label-md text-on-surface font-semibold">{t("recent_activity")}</h3>
        </div>
        <div className="flex flex-col">
          {isLoadingActivity ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-sm border-b border-[#2A2A32] animate-pulse">
                <div className="flex items-center gap-sm w-full">
                  <div className="w-8 h-8 bg-[#1E1E24] rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 w-1/3 bg-[#1E1E24] rounded mb-1"></div>
                    <div className="h-3 w-1/4 bg-[#1E1E24] rounded"></div>
                  </div>
                </div>
                <div className="h-4 w-12 bg-[#1E1E24] rounded"></div>
              </div>
            ))
          ) : recentActivity && recentActivity.length > 0 ? (
            recentActivity.map((activity, i, arr) => (
              <div 
                key={activity.achievement_id} 
                className={`flex items-center justify-between p-sm ${
                  i < arr.length - 1 ? 'border-b border-[#2A2A32]' : ''
                } hover:bg-[#1E1E24]/20 active:scale-[0.99] transition-[transform,background-color] duration-150 cursor-pointer group`}
              >
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors block">
                    workspace_premium
                  </span>
                  <div>
                    <p className="text-body-sm font-body-sm text-on-surface font-medium">{activity.title}</p>
                    <p className="text-code-sm font-code-sm text-on-surface-variant mt-0.5">{activity.description}</p>
                  </div>
                </div>
                <span className="text-code-sm font-code-sm text-primary tabular-nums font-semibold">+100 XP</span>
              </div>
            ))
          ) : (
            <div className="p-md text-center text-on-surface-variant text-sm">
              No recent activity
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

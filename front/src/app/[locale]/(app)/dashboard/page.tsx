"use client";

import { useGetNextLessonQuery, useGetRecentActivityQuery } from "@/services/dashboardApi";
import { useGetReviewStatsQuery } from "@/services/reviewApi";
import { Link } from "@/i18n/navigation";

export default function DashboardPage() {
  const { data: nextLesson, isLoading: isLoadingLesson } = useGetNextLessonQuery();
  const { data: reviewStats, isLoading: isLoadingReview } = useGetReviewStatsQuery();
  const { data: recentActivity, isLoading: isLoadingActivity } = useGetRecentActivityQuery();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-md min-h-[240px]">
        {/* Primary Action Card */}
        <div className="bg-[#15151A] border border-[#2A2A32] rounded-xl p-md col-span-1 md:col-span-2 relative overflow-hidden flex flex-col justify-between shadow-[0_0_12px_2px_rgba(139,124,255,0.1)]">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-container/10 to-transparent pointer-events-none"></div>
          {isLoadingLesson ? (
            <div className="relative z-10 h-full flex flex-col justify-between animate-pulse">
              <div>
                <div className="h-8 w-24 bg-surface-container-high rounded mb-sm"></div>
                <div className="h-10 w-3/4 bg-surface-container-high rounded mb-xs"></div>
                <div className="h-6 w-1/2 bg-surface-container-high rounded mb-lg"></div>
              </div>
              <div className="flex justify-between items-end gap-md">
                <div className="flex-1 max-w-sm">
                  <div className="h-4 w-1/4 bg-surface-container-high rounded mb-xs"></div>
                  <div className="h-1.5 w-full bg-surface-container-high rounded-full"></div>
                </div>
                <div className="h-10 w-24 bg-surface-container-high rounded-lg"></div>
              </div>
            </div>
          ) : (
            <>
              <div className="relative z-10">
                <span className="inline-block px-xs py-base bg-[#1C1C24] text-on-surface-variant rounded text-code-sm font-code-sm mb-sm border border-[#2A2A32]">
                  {nextLesson?.isReady ? "Continue Learning" : "Generate Next Lesson"}
                </span>
                <h1 className="text-display font-display text-on-surface mb-xs">{nextLesson?.topic || "No pending lessons"}</h1>
                <p className="text-body-lg font-body-lg text-on-surface-variant mb-lg">{nextLesson?.moduleName || "Select a new module to start"}</p>
              </div>
              <div className="relative z-10 mt-auto">
                <div className="flex justify-between items-end gap-md">
                  {nextLesson?.isReady && (
                    <div className="flex-1 max-w-sm">
                      <div className="flex justify-between text-label-md font-label-md text-on-surface-variant mb-xs">
                        <span>Progress</span>
                        <span>{nextLesson.progressPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#1C1C24] rounded-full overflow-hidden">
                        <div className="h-full bg-primary-container rounded-full" style={{ width: `${nextLesson.progressPercent}%` }}></div>
                      </div>
                    </div>
                  )}
                  <button className="bg-primary-container text-on-primary-container px-md py-sm rounded-lg font-label-md text-label-md hover:bg-inverse-primary transition-colors duration-200 shadow-[0_0_15px_rgba(110,91,255,0.3)] border border-[#8B7CFF]/50 hover:shadow-[0_0_20px_rgba(110,91,255,0.5)] ml-auto">
                    {nextLesson?.isReady ? "Continue" : "Generate"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Secondary Review Card */}
        <div className="bg-[#15151A] border border-[#2A2A32] rounded-xl p-md col-span-1 flex flex-col hover:border-primary/50 transition-colors cursor-pointer group">
          <div className="flex justify-between items-start mb-auto">
            <div className="p-xs bg-[#1C1C24] rounded-lg border border-[#2A2A32] group-hover:border-primary/50 transition-colors">
              <span className="material-symbols-outlined text-primary">psychology</span>
            </div>
            <span className="flex h-2 w-2 rounded-full bg-[#E8B339]"></span>
          </div>
          <div className="mt-lg">
            <h3 className="text-headline-md font-headline-md text-on-surface mb-xs">Review Queue</h3>
            {isLoadingReview ? (
              <div className="h-6 w-3/4 bg-surface-container-high rounded animate-pulse"></div>
            ) : (
              <p className="text-body-md font-body-md text-on-surface-variant flex items-center gap-xs">
                <span className="text-on-surface font-medium">{reviewStats?.total_due_today || 0} items</span> ready for review
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-lg">
        <h2 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-sm">Quick Actions</h2>
        <div className="flex gap-md overflow-x-auto pb-sm" style={{ scrollbarWidth: "none" }}>
          {[
            { icon: "settings_voice", label: "AI Speaking", href: "/speaking" },
            { icon: "smart_toy", label: "AI Tutor", href: "/tutor" },
            { icon: "explore", label: "Real World Missions", href: "/missions" },
            { icon: "workspace_premium", label: "Exams", href: "/progress" },
            { icon: "translate", label: "Vocabulary", href: "/dashboard" }
          ].map(action => (
            <Link key={action.label} href={action.href} className="flex-shrink-0 w-[200px] bg-[#15151A] border border-[#2A2A32] rounded-lg p-sm flex items-center gap-sm hover:bg-[#1C1C24] hover:border-primary/30 transition-all text-left">
              <div className="p-xs bg-[#1C1C24] rounded border border-[#2A2A32] text-on-surface-variant">
                <span className="material-symbols-outlined">{action.icon}</span>
              </div>
              <span className="text-label-md font-label-md text-on-surface">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-[#15151A] border border-[#2A2A32] rounded-xl overflow-hidden min-h-[200px]">
        <div className="p-sm border-b border-[#2A2A32] bg-[#1C1C24]/50">
          <h3 className="text-label-md font-label-md text-on-surface">Recent Activity</h3>
        </div>
        <div className="flex flex-col">
          {isLoadingActivity ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-sm border-b border-[#2A2A32] animate-pulse">
                <div className="flex items-center gap-sm w-full">
                  <div className="w-6 h-6 bg-surface-container-high rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 w-1/3 bg-surface-container-high rounded mb-1"></div>
                    <div className="h-3 w-1/4 bg-surface-container-high rounded"></div>
                  </div>
                </div>
                <div className="h-4 w-12 bg-surface-container-high rounded"></div>
              </div>
            ))
          ) : (
            recentActivity?.map((activity, i, arr) => (
              <div key={activity.id} className={`flex items-center justify-between p-sm ${i < arr.length - 1 ? 'border-b border-[#2A2A32]' : ''} hover:bg-[#1C1C24] transition-colors cursor-pointer`}>
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-outline">{activity.icon}</span>
                  <div>
                    <p className="text-body-sm font-body-sm text-on-surface">{activity.title}</p>
                    <p className="text-code-sm font-code-sm text-on-surface-variant">{activity.subtitle}</p>
                  </div>
                </div>
                <span className="text-code-sm font-code-sm text-primary">{activity.xp}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

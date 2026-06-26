"use client";

import { useGetNextLessonQuery, useGetRecentActivityQuery } from "@/services/dashboardApi";
import { useGetReviewStatsQuery } from "@/services/reviewApi";
import { Link } from "@/i18n/navigation";

export default function DashboardPage() {
  const { data: nextLesson, isLoading: isLoadingLesson } = useGetNextLessonQuery();
  const { data: reviewStats, isLoading: isLoadingReview } = useGetReviewStatsQuery();
  const { data: recentActivity, isLoading: isLoadingActivity } = useGetRecentActivityQuery();

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
                  {nextLesson?.isReady ? "Continue Learning" : "Generate Next Lesson"}
                </span>
                <h1 className="text-display font-display text-on-surface mb-xs tracking-tight text-balance">
                  {nextLesson?.topic || "No pending lessons"}
                </h1>
                <p className="text-body-lg font-body-lg text-on-surface-variant mb-lg text-pretty">
                  {nextLesson?.moduleName || "Select a new module to start"}
                </p>
              </div>
              <div className="relative z-10 mt-auto">
                <div className="flex justify-between items-end gap-md">
                  {nextLesson?.isReady && (
                    <div className="flex-1 max-w-sm pb-1">
                      <div className="flex justify-between text-label-md font-label-md text-on-surface-variant mb-1.5 font-medium">
                        <span>Progress</span>
                        <span className="tabular-nums">{nextLesson.progressPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#1E1E24] rounded-full overflow-hidden border border-[#2A2A32]">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-[#8B7CFF] rounded-full" 
                          style={{ width: `${nextLesson.progressPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  <button className="bg-primary hover:bg-primary/95 text-white px-md py-sm rounded-lg font-medium active:scale-[0.96] transition-[transform,background-color,border-color,box-shadow] duration-150 shadow-[0_0_12px_rgba(110,91,255,0.25)] border border-[#8B7CFF]/30 hover:border-[#8B7CFF]/60 flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ml-auto cursor-pointer">
                    <span>{nextLesson?.isReady ? "Continue" : "Generate"}</span>
                    <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Secondary Review Card */}
        <Link 
          href="/dashboard" // Keeps on current view, or links to spaced repetition review if available
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
            href="/progress" 
            className="flex-shrink-0 w-[200px] surface-card rounded-lg p-sm flex items-center gap-sm hover:bg-[#1E1E24]/60 hover:border-primary/40 active:scale-[0.96] transition-[transform,background-color,border-color] duration-150 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 group"
          >
            <div className="p-xs bg-[#1E1E24] rounded border border-[#2A2A32] text-on-surface-variant group-hover:border-primary/40 group-hover:text-primary transition-colors duration-150 flex items-center justify-center">
              <span className="material-symbols-outlined block">workspace_premium</span>
            </div>
            <span className="text-label-md font-label-md text-on-surface font-medium">Exams</span>
          </Link>

          {/* Vocabulary */}
          <Link 
            href="/dashboard" 
            className="flex-shrink-0 w-[200px] surface-card rounded-lg p-sm flex items-center gap-sm hover:bg-[#1E1E24]/60 hover:border-primary/40 active:scale-[0.96] transition-[transform,background-color,border-color] duration-150 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 group"
          >
            <div className="p-xs bg-[#1E1E24] rounded border border-[#2A2A32] text-on-surface-variant group-hover:border-primary/40 group-hover:text-primary transition-colors duration-150 flex items-center justify-center">
              <span className="material-symbols-outlined block">translate</span>
            </div>
            <span className="text-label-md font-label-md text-on-surface font-medium">Vocabulary</span>
          </Link>
        </div>
      </div>

      {/* Recent Activity List */}
      <div className="surface-card rounded-xl overflow-hidden shadow-lg border border-outline">
        <div className="p-sm border-b border-[#2A2A32] bg-[#1E1E24]/30">
          <h3 className="text-label-md font-label-md text-on-surface font-semibold">Recent Activity</h3>
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
                key={activity.id} 
                className={`flex items-center justify-between p-sm ${
                  i < arr.length - 1 ? 'border-b border-[#2A2A32]' : ''
                } hover:bg-[#1E1E24]/20 active:scale-[0.99] transition-[transform,background-color] duration-150 cursor-pointer group`}
              >
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors block">
                    {activity.icon === 'workspace_premium' ? 'military_tech' : 'chat_bubble'}
                  </span>
                  <div>
                    <p className="text-body-sm font-body-sm text-on-surface font-medium">{activity.title}</p>
                    <p className="text-code-sm font-code-sm text-on-surface-variant mt-0.5">{activity.subtitle}</p>
                  </div>
                </div>
                <span className="text-code-sm font-code-sm text-primary tabular-nums font-semibold">{activity.xp}</span>
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

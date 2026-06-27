"use client";

import { Link } from "@/i18n/navigation";
import { useGetProgressStatsQuery, useGetCoachReportsQuery } from "@/services/progressApi";
import CountUp from "react-countup";

const FALLBACK_STATS = {
  total_xp: 12450,
  current_streak: 42,
  current_game_level: 24,
  words_learned: 1840,
  cefr_level: "B2",
  recent_badges: [
    { id: "1", code: "polyglot", title: "Polyglot Initiate", description: "Completed 50 lessons", icon: "workspace_premium", icon_color: "text-primary" },
    { id: "2", code: "speed", title: "Speed Demon", description: "10 perfect speed rounds", icon: "speed", icon_color: "text-warning" },
  ],
  recent_reports: [],
};

const FALLBACK_REPORTS = [
  { id: "1", period_start: "May 15", period_end: "May 21", strengths: "Strong progress with Present Perfect. Consistency during evening sessions is helping with retention.", weaknesses: "Subject-Verb Agreement · Irregular Verbs", recommendations: "Review irregular past participles.\nTry a 'Job Interview' roleplay." },
];

export default function ProgressPage() {
  const { data: stats, isLoading } = useGetProgressStatsQuery();
  const { data: reports } = useGetCoachReportsQuery();

  const s = stats ?? FALLBACK_STATS;
  const rpts = reports ?? FALLBACK_REPORTS;

  return (
    <div className="animate-fade-in space-y-lg pb-24">
      <header>
        <h2 className="font-headline-lg text-3xl font-bold text-on-surface mb-xs tracking-tight">Performance Metrics</h2>
        <p className="text-on-surface-variant text-sm">Your learning trajectory and AI insights.</p>
      </header>

      {/* Bento stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
        {/* Streak */}
        <div className="md:col-span-2 bg-surface rounded-xl p-6 border border-outline relative overflow-hidden group hover:border-primary/50 transition-colors shadow-md">
          <div className="absolute -right-10 -bottom-10 opacity-[0.03] pointer-events-none">
            <span className="material-symbols-outlined text-[150px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
          </div>
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="font-label-md text-xs font-semibold text-on-surface-variant mb-1">Current Streak</p>
              <p className="text-4xl font-bold text-on-surface tabular-nums">
                {isLoading ? <span className="inline-block w-16 h-9 bg-surface-bright animate-pulse rounded" /> : <CountUp end={s.current_streak} duration={1.5} />}{" "}
                <span className="font-headline-md text-lg text-on-surface-variant font-medium">days</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-colors">
              <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            </div>
          </div>
          <div className="mt-8 relative z-10">
            <div className="h-1.5 w-full bg-surface-bright rounded-full overflow-hidden border border-outline">
              <div className="h-full bg-gradient-to-r from-primary to-[#8B7CFF] rounded-full" style={{ width: `${Math.min((s.current_streak / 50) * 100, 100)}%` }} />
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant mt-2">Next milestone: 50 days</p>
          </div>
        </div>

        {/* XP */}
        <div className="bg-surface rounded-xl p-6 border border-outline flex flex-col justify-between hover:border-primary/50 transition-colors shadow-md group">
          <div className="flex items-center gap-2 text-on-surface-variant mb-sm">
            <span className="material-symbols-outlined text-lg text-primary">military_tech</span>
            <span className="font-label-md text-xs font-semibold">Total XP</span>
          </div>
          <p className="text-3xl font-bold text-on-surface tabular-nums tracking-tight group-hover:text-primary transition-colors">
            {isLoading ? "…" : <CountUp end={s.total_xp} duration={1.5} separator="," />}
          </p>
        </div>

        {/* Level */}
        <div className="bg-surface rounded-xl p-6 border border-outline flex flex-col justify-between hover:border-primary/50 transition-colors shadow-md group">
          <div className="flex items-center gap-2 text-on-surface-variant mb-sm">
            <span className="material-symbols-outlined text-lg text-primary">stairs</span>
            <span className="font-label-md text-xs font-semibold">Level · {s.cefr_level}</span>
          </div>
          <p className="text-3xl font-bold text-on-surface tabular-nums tracking-tight group-hover:text-primary transition-colors">
            Level {isLoading ? "…" : s.current_game_level}
          </p>
        </div>

        {/* Words */}
        <div className="md:col-span-4 bg-surface rounded-xl p-6 border border-outline flex items-center justify-between hover:border-primary/50 transition-colors shadow-md group">
          <div className="flex items-center gap-sm">
            <div className="w-11 h-11 rounded-full bg-surface-bright flex items-center justify-center border border-outline group-hover:border-primary/30 transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant text-lg group-hover:text-primary transition-colors">translate</span>
            </div>
            <div>
              <p className="font-label-md text-xs font-semibold text-on-surface-variant mb-0.5">Words Learned</p>
              <p className="text-2xl font-bold text-on-surface tabular-nums group-hover:text-primary transition-colors">
                {isLoading ? "…" : <CountUp end={s.words_learned} duration={1.5} separator="," />}
              </p>
            </div>
          </div>
          <Link href="/vocabulary" className="font-label-md text-sm text-primary hover:text-[#8B7CFF] transition-colors font-medium hover:underline">
            View Vocabulary
          </Link>
        </div>
      </div>

      {/* Coach + Mistakes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        {/* Coach report */}
        <div className="lg:col-span-2 bg-surface rounded-xl p-6 border-l-4 border-l-primary border border-y-outline border-r-outline shadow-lg flex flex-col gap-4">
          <div className="flex justify-between items-start mb-1">
            <div>
              <h3 className="font-headline-md text-xl font-bold text-on-surface flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B7CFF] opacity-50" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                </span>
                AI Coach — Weekly Report
              </h3>
              {rpts[0] && <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">{rpts[0].period_start} – {rpts[0].period_end}</p>}
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-lg">auto_awesome</span>
          </div>
          {rpts[0] && (
            <div className="space-y-4 text-sm text-[#E0DFE8] leading-relaxed">
              <p className="text-pretty">{rpts[0].strengths}</p>
              {rpts[0].recommendations && (
                <div className="bg-surface-bright/40 p-4 rounded-lg border border-outline">
                  <h4 className="font-label-md text-xs font-bold text-on-surface mb-2 uppercase tracking-wider">Recommendations</h4>
                  <ol className="list-decimal list-inside space-y-1.5 text-on-surface-variant">
                    {(typeof rpts[0].recommendations === "string"
                      ? rpts[0].recommendations.split("\n").filter(Boolean)
                      : rpts[0].recommendations as string[]
                    ).map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ol>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-sm mt-2">
            <Link href="/missions" className="bg-primary hover:bg-primary/95 text-white font-medium py-2.5 px-4 rounded-lg active:scale-[0.96] transition-all shadow-[0_0_12px_rgba(110,91,255,0.25)] border border-[#8B7CFF]/30 text-sm">
              Start Recommended Mission
            </Link>
            <Link href="/coach" className="text-primary hover:text-[#8B7CFF] hover:underline transition-colors font-medium font-label-md text-sm">
              View Reports History
            </Link>
          </div>
        </div>

        {/* Persistent areas */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <h3 className="font-headline-md text-xl font-bold text-on-surface tracking-tight">Persistent Areas</h3>
          <div className="bg-surface rounded-xl border border-outline overflow-hidden shadow-md">
            <ul className="divide-y divide-outline">
              {(rpts[0]?.weaknesses
                ? rpts[0].weaknesses.split(/[·,;\n]+/).map((w: string) => w.trim()).filter(Boolean)
                : []
              ).map((label: string) => (
                <li key={label} className="p-4 flex items-center hover:bg-surface-bright/20 transition-all group cursor-pointer">
                  <span className="font-body-sm text-sm text-on-surface group-hover:text-primary transition-colors">{label}</span>
                </li>
              ))}
              {(!rpts[0]?.weaknesses || !rpts[0].weaknesses.trim()) && (
                <li className="p-4 text-sm text-on-surface-variant">No data yet</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Achievements preview */}
      <div>
        <div className="flex justify-between items-center mb-md">
          <h3 className="font-headline-md text-xl font-bold text-on-surface tracking-tight">Milestones</h3>
          <Link href="/achievements" className="text-primary hover:text-[#8B7CFF] hover:underline transition-colors font-medium font-label-md text-sm">
            View All Achievements
          </Link>
        </div>
        <div className="flex gap-md overflow-x-auto no-scrollbar pb-sm -mx-sm px-sm">
          {(s.recent_badges.length ? s.recent_badges : FALLBACK_STATS.recent_badges).map((badge) => (
            <div key={badge.id} className="shrink-0 w-48 bg-surface rounded-xl p-5 border border-outline flex flex-col items-center text-center shadow-md hover:border-primary/30 transition-all group cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-surface-bright flex items-center justify-center border border-outline mb-sm group-hover:scale-105 transition-transform">
                <span className={`material-symbols-outlined text-[32px] ${badge.icon_color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{badge.icon}</span>
              </div>
              <p className="font-label-md text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">{badge.title}</p>
              <p className="font-body-sm text-xs text-on-surface-variant mt-1">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

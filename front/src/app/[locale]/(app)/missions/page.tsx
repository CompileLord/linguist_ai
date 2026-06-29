"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { useGetMissionsQuery } from "@/services/missionsApi";

const CEFR_COLORS: Record<string, { hex: string; label: string }> = {
  A1: { hex: "#22c55e", label: "Beginner" },
  A2: { hex: "#14b8a6", label: "Elementary" },
  B1: { hex: "#3b82f6", label: "Intermediate" },
  B2: { hex: "#8B7CFF", label: "Upper-Intermediate" },
  C1: { hex: "#f97316", label: "Advanced" },
  C2: { hex: "#ef4444", label: "Mastery" },
};

const GOAL_ICON: Record<string, string> = {
  travel: "flight",
  work: "business_center",
  study: "menu_book",
  daily_life: "home",
  exam_prep: "assignment",
};

const GOAL_LABEL: Record<string, string> = {
  travel: "Travel",
  work: "Work",
  study: "Study",
  daily_life: "Daily Life",
  exam_prep: "Exam Prep",
};

export default function MissionsPage() {
  const { data: missions, isLoading, error } = useGetMissionsQuery();
  const items = missions ?? [];
  const apiError = !isLoading && error && !missions;
  const available = items.filter((m) => m.is_active !== false).length;

  return (
    <div className="animate-fade-in pb-16">
      {/* ── Hero Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative mb-8 rounded-2xl border border-[#2A2A32] bg-[#15151A] overflow-hidden p-6 md:p-8"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 90% at 100% 50%, rgba(110,91,255,0.07) 0%, transparent 65%)",
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/70">
                Real-World Practice
              </span>
            </div>
            <h2 className="font-headline-lg text-2xl md:text-3xl font-bold text-on-surface tracking-tight mb-2">
              Master Real Conversations
            </h2>
            <p
              className="text-on-surface-variant text-sm leading-relaxed"
              style={{ maxWidth: "36rem" }}
            >
              Step into authentic scenarios with your AI conversation partner.
              Build confidence for restaurants, interviews, travel, and daily
              life.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <span className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "#22c55e" }}
                />
                {isLoading ? "…" : `${available} missions ready`}
              </span>
              <span
                className="flex items-center gap-1 text-[11px]"
                style={{ color: "#f97316" }}
              >
                <span
                  className="material-symbols-outlined text-[14px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  bolt
                </span>
                Earn XP every session
              </span>
              <span className="flex items-center gap-1 text-[11px] text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px]">
                  mic
                </span>
                Voice mode available
              </span>
            </div>
          </div>

          {/* AI partner avatars */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex -space-x-3">
              {[
                {
                  gradient: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                  icon: "face_6",
                },
                {
                  gradient: "linear-gradient(135deg, #2563eb, #4338ca)",
                  icon: "face_3",
                },
              ].map((av, i) => (
                <div
                  key={i}
                  className="w-11 h-11 rounded-full flex items-center justify-center border-2 border-[#15151A] shadow-lg"
                  style={{ background: av.gradient }}
                >
                  <span
                    className="material-symbols-outlined text-white text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {av.icon}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-on-surface">
                AI Partners
              </p>
              <p className="text-[11px] text-on-surface-variant">
                Ready to practice
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Mission Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-56 bg-surface border border-outline rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : apiError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <span className="material-symbols-outlined text-error text-4xl">
            wifi_off
          </span>
          <p className="text-on-surface-variant text-sm max-w-xs">
            Could not load missions from the server. Check that the backend is
            running and try again.
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-4xl">
            explore_off
          </span>
          <p className="text-on-surface-variant text-sm max-w-xs">
            No missions available yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((m, idx) => {
            const isLocked = m.is_active === false;
            const icon = GOAL_ICON[m.related_goal ?? ""] ?? "explore";
            const cefr = CEFR_COLORS[m.cefr_level_min ?? ""] ?? {
              hex: "#6E5BFF",
              label: "Intermediate",
            };
            const goalLabel =
              GOAL_LABEL[m.related_goal ?? ""] ?? "Conversation";
            const durationMin = m.estimated_duration_minutes ?? 8;

            if (isLocked) {
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                  className="relative p-5 flex flex-col gap-3 bg-surface border border-outline rounded-2xl overflow-hidden pointer-events-none select-none"
                  style={{ opacity: 0.42 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl border border-outline flex items-center justify-center bg-surface-bright/30">
                      <span
                        className="material-symbols-outlined text-2xl text-on-surface-variant/50"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {icon}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-surface-bright border border-outline rounded-full px-2.5 py-1">
                      <span className="material-symbols-outlined text-[12px] text-on-surface-variant">
                        lock
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                        {m.cefr_level_min ?? ""}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-headline-md text-lg font-bold text-on-surface tracking-tight">
                      {m.title}
                    </h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed mt-1">
                      {m.description}
                    </p>
                  </div>
                  <div className="mt-auto pt-3 border-t border-outline">
                    <span className="text-[11px] text-on-surface-variant">
                      Not available
                    </span>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="group"
              >
                <Link
                  href={`/missions/${m.id}`}
                  className="relative p-5 flex flex-col min-h-full gap-3 bg-surface border border-[#2A2A32] rounded-2xl transition-all duration-300 overflow-hidden block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 shadow-sm"
                >
                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                    style={{
                      background: `radial-gradient(ellipse 80% 60% at 50% 110%, ${cefr.hex}14 0%, transparent 65%)`,
                    }}
                  />
                  {/* Border glow on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                    style={{ boxShadow: `inset 0 0 0 1px ${cefr.hex}45` }}
                  />

                  <div className="relative z-10 flex items-start justify-between">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 group-hover:scale-105"
                      style={{
                        backgroundColor: `${cefr.hex}18`,
                        borderColor: `${cefr.hex}50`,
                      }}
                    >
                      <span
                        className="material-symbols-outlined text-2xl"
                        style={{
                          color: cefr.hex,
                          fontVariationSettings: "'FILL' 1",
                        }}
                      >
                        {icon}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {m.completed_before && (
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border text-success bg-success/10 border-success/30">
                          Done
                        </span>
                      )}
                      <span
                        className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border"
                        style={{
                          color: cefr.hex,
                          backgroundColor: `${cefr.hex}12`,
                          borderColor: `${cefr.hex}38`,
                        }}
                      >
                        {m.cefr_level_min ?? ""}
                      </span>
                    </div>
                  </div>

                  <div className="relative z-10 flex-1">
                    <h3 className="font-headline-md text-lg font-bold text-on-surface tracking-tight group-hover:text-primary transition-colors duration-200">
                      {m.title}
                    </h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed mt-1">
                      {m.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-bright border border-outline text-on-surface-variant">
                        {goalLabel}
                      </span>
                      {m.completed_before && m.best_score != null && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-success/10 border border-success/20 text-success">
                          Best: {Math.round(m.best_score)}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative z-10 pt-3 border-t border-[#2A2A32] flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[11px] text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">
                          schedule
                        </span>
                        {durationMin} min
                      </span>
                      <span
                        className="flex items-center gap-1"
                        style={{ color: "#f97316" }}
                      >
                        <span
                          className="material-symbols-outlined text-[13px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          bolt
                        </span>
                        Earn XP
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-primary text-xs font-semibold translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
                      <span>Start</span>
                      <span className="material-symbols-outlined text-[15px]">
                        arrow_forward
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

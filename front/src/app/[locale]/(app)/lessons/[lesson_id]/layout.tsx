"use client";

import { useParams, usePathname } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { LessonProvider } from "./LessonContext";

const STEPS = [
  { key: "theory",     label: "Theory",     icon: "menu_book"  },
  { key: "vocabulary", label: "Vocabulary", icon: "translate"  },
  { key: "reading",    label: "Reading",    icon: "article"    },
  { key: "listening",  label: "Listening",  icon: "headphones" },
  { key: "exercises",  label: "Exercises",  icon: "edit"       },
  { key: "quiz",       label: "Quiz",       icon: "quiz"       },
];

export default function LessonLayout({ children }: { children: React.ReactNode }) {
  const params   = useParams();
  const pathname = usePathname();
  const router   = useRouter();

  const lessonId   = params.lesson_id as string;
  const isComplete = pathname.endsWith("/complete");
  const currentIdx = STEPS.findIndex((s) => pathname.endsWith(`/${s.key}`));
  const progressPct = Math.min(
    Math.max(0, currentIdx) / (STEPS.length - 1) * 100,
    100
  );

  const navigate = (key: string) =>
    router.push(`/lessons/${lessonId}/${key}` as any);

  return (
    <LessonProvider>
      <div className="flex flex-col flex-grow w-full min-h-0 pb-20 md:pb-0">

        {/* ── Progress bar ── */}
        {!isComplete && (
          <div className="w-full h-[2px] bg-[#111120] shrink-0">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-[#9B8CFF]"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
          </div>
        )}

        {/* ── Step tabs (underline style) ── */}
        {!isComplete && (
          <div className="w-full border-b border-[#111120] shrink-0">
            <div className="flex items-end overflow-x-auto no-scrollbar px-sm md:px-xl">
              {STEPS.map((s, i) => {
                const isActive  = i === currentIdx;
                const isVisited = i < currentIdx;
                return (
                  <button
                    key={s.key}
                    onClick={() => (isVisited || isActive) ? navigate(s.key) : undefined}
                    className={`relative flex items-center gap-1.5 px-3.5 pt-2.5 pb-3 text-[11px] font-medium shrink-0 whitespace-nowrap transition-all duration-200 border-b-2 -mb-px ${
                      isActive
                        ? "border-primary text-primary"
                        : isVisited
                        ? "border-transparent text-on-surface-variant/45 hover:text-on-surface-variant/75 cursor-pointer"
                        : "border-transparent text-on-surface-variant/22 cursor-default"
                    }`}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: "12px",
                        fontVariationSettings: isVisited ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      {isVisited ? "check_circle" : s.icon}
                    </span>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Page content ── */}
        {children}
      </div>
    </LessonProvider>
  );
}

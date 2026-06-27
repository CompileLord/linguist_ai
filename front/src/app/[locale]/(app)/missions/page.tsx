"use client";

import { Link } from "@/i18n/navigation";
import { useGetMissionsQuery } from "@/services/missionsApi";

const FALLBACK_MISSIONS = [
  { id: "restaurant", title: "Order at a Restaurant", description: "Navigate a menu, ask questions, and order your meal.", icon: "restaurant", cefr_level: "A2", is_locked: false },
  { id: "job-interview", title: "Job Interview", description: "Discuss your experience and answer common interview questions.", icon: "work", cefr_level: "B2", is_locked: false },
  { id: "train-tickets", title: "Buy Train Tickets", description: "Inquire about schedules, platforms, and purchase tickets.", icon: "confirmation_number", cefr_level: "B1", is_locked: false },
  { id: "hotel", title: "Check-in to a Hotel", description: "Confirm reservations and ask about hotel amenities.", icon: "hotel", cefr_level: "B1", is_locked: false },
  { id: "presentation", title: "Give a Presentation", description: "Deliver a formal presentation and answer Q&A.", icon: "co_present", cefr_level: "C1", is_locked: true },
  { id: "meet-someone", title: "Meet Someone New", description: "Introduce yourself and exchange basic information.", icon: "chat_bubble", cefr_level: "A1", is_locked: false },
];

export default function MissionsPage() {
  const { data: missions, isLoading } = useGetMissionsQuery();
  const items = missions ?? FALLBACK_MISSIONS;

  return (
    <div className="animate-fade-in space-y-lg pb-12">
      <p className="text-body-lg text-on-surface-variant">Practice real situations with an AI conversation partner.</p>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-surface border border-outline rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {items.map((m) =>
            m.is_locked ? (
              <div key={m.id} className="p-6 flex flex-col gap-4 bg-surface border border-outline rounded-xl opacity-40 grayscale pointer-events-none shadow-md">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-full border border-outline flex items-center justify-center text-on-surface-variant bg-surface-bright/40">
                    <span className="material-symbols-outlined text-xl">{m.icon}</span>
                  </div>
                  <span className="font-code-sm text-xs font-semibold text-on-surface-variant px-2.5 py-1 rounded bg-surface-bright border border-outline flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">lock</span> {m.cefr_level}
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-md text-xl font-bold text-on-surface mb-1 tracking-tight">{m.title}</h3>
                  <p className="font-body-sm text-sm text-on-surface-variant leading-relaxed">{m.description}</p>
                </div>
              </div>
            ) : (
              <Link
                key={m.id}
                href={`/missions/${m.id}`}
                className="p-6 flex flex-col gap-4 bg-surface border border-outline rounded-xl group active:scale-[0.98] hover:border-primary/50 transition-all duration-200 shadow-md focus:outline-none"
              >
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-full border border-outline flex items-center justify-center text-on-surface-variant group-hover:text-primary group-hover:border-primary/50 transition-colors bg-surface-bright/40">
                    <span className="material-symbols-outlined text-xl">{m.icon}</span>
                  </div>
                  <span className="font-code-sm text-xs font-semibold text-primary px-2.5 py-1 rounded bg-surface-bright border border-outline">
                    {m.cefr_level}
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-md text-xl font-bold text-on-surface mb-1 tracking-tight group-hover:text-primary transition-colors">{m.title}</h3>
                  <p className="font-body-sm text-sm text-on-surface-variant leading-relaxed">{m.description}</p>
                </div>
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { MissionFeedback } from "@/services/missionsApi";

const FALLBACK: MissionFeedback = {
  score: 82,
  xp_earned: 120,
  what_went_well: ["Natural greeting", "Clear pronunciation of order", "Polite request for specials"],
  corrections: [
    { original: "I want see menu", suggestion: "I'd like to see the menu, please" },
    { original: "What is special today?", suggestion: "Do you have any specials today?" },
    { original: "Give me water", suggestion: "Could I have some water, please?" },
  ],
};

export default function MissionFeedbackPage() {
  const params = useParams();
  const missionId = params.id as string;
  const [feedback, setFeedback] = useState<MissionFeedback>(FALLBACK);

  useEffect(() => {
    const stored = sessionStorage.getItem(`mission_feedback_${missionId}`);
    if (stored) setFeedback(JSON.parse(stored));
  }, [missionId]);

  return (
    <div className="animate-fade-in max-w-[800px] mx-auto space-y-md pb-24">
      <header className="mb-lg">
        <p className="font-label-md text-xs font-bold text-primary mb-1 uppercase tracking-widest">Mission Complete</p>
        <h2 className="font-headline-lg text-3xl font-bold text-on-surface tracking-tight">
          Mission Feedback
        </h2>
        <div className="flex items-center gap-md mt-4">
          <div className="bg-surface border border-outline rounded-xl px-5 py-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">military_tech</span>
            <span className="font-bold text-on-surface text-xl">{feedback.score}%</span>
            <span className="text-on-surface-variant text-sm">Score</span>
          </div>
          <div className="bg-surface border border-outline rounded-xl px-5 py-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-warning" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            <span className="font-bold text-on-surface text-xl">+{feedback.xp_earned}</span>
            <span className="text-on-surface-variant text-sm">XP</span>
          </div>
        </div>
      </header>

      <section className="bg-surface border border-outline rounded-xl p-6 shadow-md hover:border-primary/20 transition-all">
        <h3 className="font-bold text-on-surface mb-4">What went well</h3>
        <ul className="space-y-3">
          {feedback.what_went_well.map((item, i) => (
            <li key={i} className="flex items-start gap-sm">
              <span className="material-symbols-outlined mt-0.5 text-success text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span className="text-sm text-on-surface-variant">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {feedback.corrections.length > 0 && (
        <section className="bg-surface border border-outline rounded-xl p-6 shadow-md hover:border-primary/20 transition-all">
          <h3 className="font-bold text-on-surface mb-4">What you could say differently</h3>
          <div className="space-y-3">
            {feedback.corrections.map((c, i) => (
              <div key={i} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 bg-surface-bright/40 rounded-lg p-4 border border-outline">
                <p className="flex-1 text-sm text-on-surface-variant line-through opacity-65">{c.original}</p>
                <span className="material-symbols-outlined text-on-surface-variant text-lg hidden md:block">arrow_forward</span>
                <p className="flex-1 text-sm text-success font-semibold">{c.suggestion}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col md:flex-row justify-end gap-sm mt-lg">
        <Link href={`/missions/${missionId}`} className="font-label-md text-sm text-on-surface border border-outline px-5 py-2.5 rounded-lg hover:bg-surface-bright active:scale-[0.96] transition-all text-center">
          Try again
        </Link>
        <Link href="/missions" className="font-label-md text-sm bg-primary hover:bg-primary/95 text-white px-5 py-2.5 rounded-lg active:scale-[0.96] shadow-[0_0_12px_rgba(110,91,255,0.25)] border border-[#8B7CFF]/30 transition-all text-center">
          Back to Missions
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useGetCoachReportsQuery } from "@/services/progressApi";

const FALLBACK = [
  { id: "1", period_start: "May 15", period_end: "May 21", strengths: "Strong progress with Present Perfect. Speaking fluency score increased by 4%. Evening session consistency helping with retention.", weaknesses: "Subject-Verb Agreement · Irregular Verbs", recommendations: "Review irregular past participles.\nTry a 'Restaurant' or 'Job Interview' roleplay.\nPractice past perfect exercises." },
  { id: "2", period_start: "May 08", period_end: "May 14", strengths: "Active listening exercises paid off. Improved passive grammar comprehension by 15%. Good accuracy on relative clauses.", weaknesses: "Article Usage · Preposition Choice", recommendations: "Practice audio playback at 1.1x speed.\nReview definite and indefinite articles (a/an/the).\nDaily vocabulary flashcard drill." },
  { id: "3", period_start: "May 01", period_end: "May 07", strengths: "Good vocabulary baseline of 1,200 words. Expresses basic ideas effectively. Strong written paragraph transitions.", weaknesses: "Subjunctive Mood · Passive Construction", recommendations: "Study Present Subjunctive theory cards.\nComplete a grammar practice test on conditionals.\nSet a target of 5 lessons per week." },
];

export default function CoachPage() {
  const { data: reports } = useGetCoachReportsQuery();
  const rpts = reports ?? FALLBACK;
  const [selected, setSelected] = useState(0);
  const report = rpts[selected];

  // Parse recommendations string into an array of lines
  const recommendationLines = (report?.recommendations ?? "")
    .split("\n")
    .map((r: string) => r.trim())
    .filter(Boolean);

  // Parse weaknesses string into labels for the persistent areas list
  const persistentAreas = (report?.weaknesses ?? "")
    .split(/[·,;\n]+/)
    .map((w: string) => w.trim())
    .filter(Boolean)
    .map((label: string) => ({ label }));

  return (
    <div className="animate-fade-in space-y-lg pb-24">
      <header className="flex items-center gap-sm">
        <Link href="/progress" className="flex items-center text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded-md">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h2 className="font-headline-lg text-2xl font-bold text-on-surface tracking-tight">AI Coach Reports Archive</h2>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        {/* Reports list */}
        <div className="md:col-span-1 flex flex-col gap-sm">
          <h3 className="font-label-md text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-xs px-2">History</h3>
          <div className="flex flex-col gap-2">
            {rpts.map((r, i) => (
              <button
                key={r.id}
                onClick={() => setSelected(i)}
                className={`p-4 bg-surface rounded-xl cursor-pointer shadow-md transition-all text-left border ${selected === i ? "border-primary" : "border-outline hover:border-primary/40"}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-label-md text-sm font-bold text-on-surface">{r.period_start} – {r.period_end}</span>
                  {i === 0 && <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />}
                </div>
                <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2">{r.strengths}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Report detail */}
        {report && (
          <div className="md:col-span-2 bg-surface rounded-xl p-6 border border-outline shadow-lg flex flex-col gap-6">
            <div className="flex justify-between items-start border-b border-outline pb-4">
              <div>
                <h2 className="font-headline-md text-2xl font-bold text-on-surface">Weekly AI Coaching Report</h2>
                <p className="font-body-sm text-sm text-on-surface-variant mt-1">Period: {report.period_start} – {report.period_end}</p>
              </div>
              <span className="material-symbols-outlined text-primary text-2xl">auto_awesome</span>
            </div>

            <div className="space-y-2">
              <h3 className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider">Strengths & Progress</h3>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">{report.strengths}</p>
            </div>

            {persistentAreas.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider">Persistent Areas</h3>
                <div className="grid grid-cols-2 gap-sm">
                  {persistentAreas.map((a) => (
                    <div key={a.label} className="bg-surface-bright/40 p-3 rounded-lg border border-outline flex items-center">
                      <span className="font-body-sm text-xs text-on-surface-variant">{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-surface-bright/40 p-5 rounded-lg border border-outline flex flex-col gap-3">
              <h4 className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider">Coach Recommendations</h4>
              <ul className="list-disc list-inside space-y-2 text-sm text-on-surface-variant leading-relaxed pl-1">
                {recommendationLines.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <Link href="/missions" className="bg-primary hover:bg-primary/95 text-white font-medium py-2.5 px-5 rounded-lg active:scale-[0.96] transition-all border border-[#8B7CFF]/30 text-sm shadow-md">
                Start Suggested Mission
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

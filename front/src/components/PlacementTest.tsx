"use client";
import { useState } from "react";

const QS = [
  { q: `"I ___ to Paris last summer."`, opts: ["have gone","went","go"], correct: 1, diff: "A2", tip: "Use Past Simple for finished times ('last summer')." },
  { q: `"If it ___ tomorrow, we won't go to the park."`, opts: ["will rain","rain","rains"], correct: 2, diff: "B1", tip: "Conditional type 1 uses Present Simple after 'if'." },
  { q: `"Find the synonym of 'Crucial':"`, opts: ["Tiny","Vital","Unnecessary"], correct: 1, diff: "B2", tip: "'Crucial' means extremely important or vital." },
];

const RESULTS = [
  { cefr:"A1", title:"Beginner", desc:"We'll guide you from the fundamentals with translations in your native language." },
  { cefr:"A2", title:"Elementary", desc:"You understand basic patterns. We'll start at A2 to reinforce structures." },
  { cefr:"B1", title:"Intermediate", desc:"Stable grasp of core concepts. Ready for work & travel dialogues." },
  { cefr:"B2", title:"Upper Intermediate", desc:"Excellent! We'll prioritize advanced nuances and writing exams." },
];

export default function PlacementTest() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number|null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const pick = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    if (i === QS[step].correct) setScore(s => s + 1);
  };

  const next = () => {
    if (step + 1 >= QS.length) { setDone(true); return; }
    setStep(s => s + 1); setSelected(null);
  };

  const q = QS[step];
  const result = RESULTS[Math.min(score, 3)];

  if (done) return (
    <div className="text-center py-6 space-y-6 flex flex-col items-center h-full">
      <div>
        <span className="text-xs font-bold text-[#3DD68C] uppercase font-mono tracking-wider">Evaluation Result</span>
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#6E5BFF] to-[#8B7CFF] flex items-center justify-center text-white text-3xl font-extrabold mx-auto mt-4 shadow-xl" style={{fontFamily:"Hanken Grotesk,sans-serif"}}>{result.cefr}</div>
      </div>
      <div className="max-w-md mx-auto space-y-2">
        <h3 className="text-lg font-bold text-white" style={{fontFamily:"Hanken Grotesk,sans-serif"}}>{result.title} level established</h3>
        <p className="text-xs text-[#9A9AA5] leading-relaxed">{result.desc}</p>
      </div>
      <a href="/register" className="px-6 py-2.5 bg-[#6E5BFF] hover:bg-[#6E5BFF]/90 text-white font-medium text-xs rounded-lg border border-[#8B7CFF]/30 active:scale-95 transition-all">Register with {result.cefr}</a>
    </div>
  );

  return (
    <>
      <div className="flex justify-between items-center border-b border-[#1E1E26] pb-4 mb-4">
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#6E5BFF] animate-ping"/><span className="text-xs font-bold text-[#6E5BFF] uppercase font-mono">Question {step+1} of 3</span></div>
        <span className="text-[10px] font-mono text-[#62626C]">Difficulty: {q.diff}</span>
      </div>
      <div className="flex-grow space-y-6">
        <h3 className="text-lg font-bold text-white" style={{fontFamily:"Hanken Grotesk,sans-serif"}}>{q.q}</h3>
        <div className="space-y-2.5">
          {q.opts.map((opt, i) => {
            let cls = "border-[#1E1E26] bg-[#161620] hover:border-[#6E5BFF]/40 text-[#9A9AA5]";
            if (selected !== null) {
              if (i === q.correct) cls = "border-[#3DD68C] bg-[#3DD68C]/5 text-[#F5F5F7]";
              else if (i === selected) cls = "border-[#FF5C6C] bg-[#FF5C6C]/5 text-[#F5F5F7]";
            }
            return (
              <button key={i} onClick={() => pick(i)} className={`w-full p-4 border rounded-lg text-left text-xs font-medium transition-all flex justify-between items-center group active:scale-[0.99] ${cls}`}>
                <span>{opt}</span>
                <span className="material-symbols-outlined text-sm">
                  {selected !== null ? (i === q.correct ? "check" : i === selected ? "close" : "arrow_forward") : "arrow_forward"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-[#1E1E26] flex justify-between items-center font-mono">
        <p className="text-[10px] text-[#9A9AA5] max-w-[200px]">{selected !== null ? q.tip : "Select an option to test your grammar level."}</p>
        <button onClick={next} disabled={selected === null} className="px-5 py-2 bg-[#6E5BFF] hover:bg-[#6E5BFF]/90 text-white text-xs font-bold uppercase tracking-wider rounded-lg border border-[#8B7CFF]/20 active:scale-[0.98] transition-all disabled:opacity-30">Next</button>
      </div>
    </>
  );
}

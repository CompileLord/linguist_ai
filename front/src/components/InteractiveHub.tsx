"use client";
import { useState, useRef } from "react";

const TABS = [
  { icon: "auto_awesome", label: "Lesson Generator" },
  { icon: "smart_toy", label: "AI Live Tutor" },
  { icon: "settings_voice", label: "Voice Speaking" },
  { icon: "rate_review", label: "Writing Exams" },
  { icon: "analytics", label: "AI Coach Report" },
];

const TUTOR_REPLIES: Record<string, string> = {
  explain: "The Present Perfect uses 'have/has + past participle'. It connects past actions to the present: 'I have lost my key' (I lost it, and I still don't have it now).",
  diff: "Use Past Simple for finished times ('I went to Paris in 2024'). Use Present Perfect for actions with present relevance ('I have been to Paris twice').",
  custom: "Interesting question! In this context the action is incomplete, so we apply the continuous aspect for a more natural expression.",
};

function LessonTab() {
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState("Present Perfect Tense");
  const [desc, setDesc] = useState("Learn to explain past experiences with active present consequences.");
  const simulate = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setTopic(t => t === "Present Perfect Tense" ? "Past Passive Constructions" : "Present Perfect Tense");
      setDesc(d => d.includes("past experiences") ? "Generate custom syntax for highlighting historical events." : "Learn to explain past experiences with active present consequences.");
    }, 2000);
  };
  return (
    <div className="flex flex-col md:flex-row gap-8 h-full">
      <div className="flex-1 flex flex-col justify-between space-y-6">
        <div>
          <span className="text-[10px] font-bold text-[#6E5BFF] uppercase tracking-wider font-mono mb-2 block">Module 3.4</span>
          <h3 className="text-2xl font-bold text-white mb-3" style={{fontFamily:"Hanken Grotesk,sans-serif"}}>Generative AI Lessons</h3>
          <p className="text-[#9A9AA5] text-sm leading-relaxed">Vertex AI builds lessons individually in JSON format. It translates theory into your UI language (Tajik, Russian, or English), creates custom exercises, and builds a curriculum.</p>
        </div>
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[#9A9AA5] uppercase tracking-wider font-mono">Lesson Structure:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {["Theory explanation","10-15 Vocabulary items","8-10 Adaptive Exercises","Final quiz & audio script"].map(s=>(
              <div key={s} className="flex items-center gap-2 text-[#F5F5F7]"><span className="w-1.5 h-1.5 rounded-full bg-[#3DD68C] shrink-0"/>{s}</div>
            ))}
          </div>
        </div>
        <div className="pt-4 border-t border-[#1E1E26] flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#62626C]">Powered by gemini-2.5-flash</span>
          <button onClick={simulate} className="px-4 py-2 bg-[#6E5BFF]/10 border border-[#6E5BFF]/30 hover:border-[#6E5BFF] text-[#6E5BFF] hover:bg-[#6E5BFF]/20 transition-all text-xs font-bold uppercase tracking-wider font-mono rounded-lg">Simulate Generation</button>
        </div>
      </div>
      <div className="flex-1 bg-[#050507] rounded-xl border border-[#1E1E26] p-5 flex flex-col justify-between relative overflow-hidden min-h-[260px]">
        {loading && <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#6E5BFF] to-transparent animate-pulse"/>}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#6E5BFF]"/>
            <p className="text-xs font-mono font-bold text-[#6E5BFF]">GENERATING CONTENT...</p>
            <p className="text-[10px] text-[#9A9AA5]">Vertex AI compiling rules, grammar & audio scripts</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono text-[#3DD68C] px-2 py-0.5 bg-[#3DD68C]/10 border border-[#3DD68C]/20 rounded">Ready</span>
              <span className="text-[10px] font-mono text-[#9A9AA5]">~15m</span>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">{topic}</h4>
              <p className="text-xs text-[#9A9AA5] mt-1">{desc}</p>
            </div>
            {[{icon:"import_contacts",col:"text-[#6E5BFF]",label:"Grammar Theory & Notes"},{icon:"translate",col:"text-[#8B7CFF]",label:"15 Core Words to Study"}].map(r=>(
              <div key={r.label} className="p-3 bg-[#0F0F14] border border-[#1E1E26] rounded-lg flex justify-between items-center">
                <div className="flex items-center gap-3"><span className={`material-symbols-outlined ${r.col} text-base`}>{r.icon}</span><span className="text-xs font-medium">{r.label}</span></div>
                <span className="material-symbols-outlined text-xs text-[#9A9AA5]">arrow_forward_ios</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TutorTab() {
  const [msgs, setMsgs] = useState([{role:"ai",text:"Hello! I'm your AI Language Tutor. You are studying Present Perfect. How can I help you today?"}]);
  const [input, setInput] = useState(""); const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const reply = (type: string, userText: string) => {
    setMsgs(m=>[...m,{role:"user",text:userText}]); setTyping(true);
    setTimeout(()=>{ setMsgs(m=>[...m,{role:"ai",text:TUTOR_REPLIES[type]}]); setTyping(false); setTimeout(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),50); },1500);
  };
  const send = () => { if(!input.trim())return; reply("custom",input); setInput(""); };
  return (
    <div className="flex flex-col md:flex-row gap-8 h-full">
      <div className="flex-1 flex flex-col justify-between space-y-6">
        <div>
          <span className="text-[10px] font-bold text-[#6E5BFF] uppercase tracking-wider font-mono mb-2 block">Module 3.7</span>
          <h3 className="text-2xl font-bold text-white mb-3" style={{fontFamily:"Hanken Grotesk,sans-serif"}}>Interactive AI Tutor Chat</h3>
          <p className="text-[#9A9AA5] text-sm leading-relaxed">Streaming WebSocket chat available anytime. Click a chip or type your question. The AI knows your proficiency level and active curriculum.</p>
        </div>
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[#9A9AA5] uppercase tracking-wider font-mono">Click to ask tutor:</h4>
          <div className="flex flex-wrap gap-2">
            <button onClick={()=>reply("explain","Can you explain the Present Perfect?")} className="px-2.5 py-1.5 bg-[#161620] border border-[#1E1E26] hover:border-[#6E5BFF]/50 text-xs rounded-lg text-[#9A9AA5] hover:text-[#F5F5F7] transition-colors">Explain Present Perfect</button>
            <button onClick={()=>reply("diff","Past Simple vs Present Perfect?")} className="px-2.5 py-1.5 bg-[#161620] border border-[#1E1E26] hover:border-[#6E5BFF]/50 text-xs rounded-lg text-[#9A9AA5] hover:text-[#F5F5F7] transition-colors">Past Simple vs Present Perfect</button>
          </div>
        </div>
        <div className="pt-4 border-t border-[#1E1E26] flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#62626C]">Real-time WebSocket streaming</span>
          <span className="text-xs text-[#6E5BFF] flex items-center gap-1 font-mono"><span className="w-1.5 h-1.5 rounded-full bg-[#6E5BFF] animate-ping"/>Live Connection</span>
        </div>
      </div>
      <div className="flex-1 bg-[#050507] rounded-xl border border-[#1E1E26] p-4 flex flex-col min-h-[260px]">
        <div className="flex-grow space-y-4 overflow-y-auto max-h-[200px] pr-1 text-xs mb-2">
          {msgs.map((m,i)=>(
            <div key={i} className={m.role==="ai"?"space-y-1":"space-y-1 text-right"}>
              <div className={`text-[10px] font-bold font-mono ${m.role==="ai"?"text-[#6E5BFF]":"text-[#8B7CFF]"}`}>{m.role==="ai"?"Linguist AI Tutor":"You"}</div>
              <div className={m.role==="ai"?"text-[#F5F5F7] border-l border-[#6E5BFF]/20 pl-3":"bg-[#161620] border border-[#1E1E26] rounded-lg p-2 inline-block text-left text-[#F5F5F7]"}>{m.text}</div>
            </div>
          ))}
          {typing&&<div className="flex gap-1 items-center"><span className="w-1.5 h-1.5 bg-[#6E5BFF] rounded-full animate-bounce" style={{animationDelay:".1s"}}/><span className="w-1.5 h-1.5 bg-[#6E5BFF] rounded-full animate-bounce" style={{animationDelay:".2s"}}/><span className="w-1.5 h-1.5 bg-[#6E5BFF] rounded-full animate-bounce" style={{animationDelay:".3s"}}/></div>}
          <div ref={endRef}/>
        </div>
        <div className="mt-auto pt-3 border-t border-[#1E1E26]/50 flex gap-2">
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask anything about English..." className="flex-grow bg-[#0F0F14] border border-[#1E1E26] rounded-lg px-3 py-2 text-xs text-[#F5F5F7] focus:outline-none focus:border-[#6E5BFF] placeholder:text-[#62626C]"/>
          <button onClick={send} className="bg-[#6E5BFF] hover:bg-[#6E5BFF]/90 text-white px-3 py-2 rounded-lg border border-[#8B7CFF]/20 active:scale-95 transition-all"><span className="material-symbols-outlined text-sm">send</span></button>
        </div>
      </div>
    </div>
  );
}

function WritingTab() {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col md:flex-row gap-8 h-full">
      <div className="flex-1 flex flex-col justify-between space-y-6">
        <div>
          <span className="text-[10px] font-bold text-[#6E5BFF] uppercase tracking-wider font-mono mb-2 block">Module 3.9</span>
          <h3 className="text-2xl font-bold text-white mb-3" style={{fontFamily:"Hanken Grotesk,sans-serif"}}>AI Writing Grading & Diff</h3>
          <p className="text-[#9A9AA5] text-sm leading-relaxed">Submit essays (IELTS/TOEFL standard). AI evaluates grammar, vocabulary, cohesion, and naturalness. Corrections shown as interactive diffs.</p>
        </div>
        <div className="space-y-1.5 text-[11px]">
          {[["Grammar Accuracy","B2 (7.5)",75],["Vocabulary Variety","B1 (6.0)",60]].map(([label,score,pct])=>(
            <div key={String(label)}>
              <div className="flex justify-between mb-0.5 text-[#9A9AA5]"><span>{label}</span><span className="font-mono text-[#F5F5F7] font-semibold">{score}</span></div>
              <div className="h-1 bg-[#161620] border border-[#1E1E26] rounded-full overflow-hidden"><div className="h-full bg-[#6E5BFF]" style={{width:`${pct}%`}}/></div>
            </div>
          ))}
        </div>
        <div className="pt-4 border-t border-[#1E1E26] flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#62626C]">Powered by gemini-2.5-pro</span>
          <button onClick={()=>setShow(s=>!s)} className="px-4 py-2 bg-[#6E5BFF]/10 border border-[#6E5BFF]/30 hover:border-[#6E5BFF] text-[#6E5BFF] hover:bg-[#6E5BFF]/20 transition-all text-xs font-bold uppercase tracking-wider font-mono rounded-lg">Simulate AI Evaluation</button>
        </div>
      </div>
      <div className="flex-1 bg-[#050507] rounded-xl border border-[#1E1E26] p-5 flex flex-col min-h-[260px] text-xs">
        <div className="space-y-4">
          <div><span className="text-[10px] font-mono text-[#9A9AA5] uppercase tracking-wider block mb-1">Assigned Prompt:</span><p className="font-semibold text-white">"Describe your memorable travel experience."</p></div>
          <div className="p-3 bg-[#0F0F14] border border-[#1E1E26] rounded-lg"><span className="text-[9px] font-mono text-[#62626C]">User Submission:</span><p className="text-[#F5F5F7] text-[11px] leading-relaxed italic mt-1">"Yesterday, I have gone to the shop and I saw a nice shoes. I bought it."</p></div>
          {show&&<div className="p-3 bg-[#6E5BFF]/5 border border-[#6E5BFF]/20 rounded-lg space-y-2">
            <span className="text-[9px] font-mono text-[#6E5BFF] font-bold uppercase tracking-wider">AI Coach Correction Diff:</span>
            <div className="font-mono text-[10px] space-y-1">
              <div className="text-[#FF5C6C] flex items-center gap-1.5"><span className="material-symbols-outlined text-[10px]">remove</span>Yesterday, <s>I have gone</s> to the shop...</div>
              <div className="text-[#3DD68C] flex items-center gap-1.5"><span className="material-symbols-outlined text-[10px]">add</span>Yesterday, <strong>I went</strong> to the shop...</div>
            </div>
            <p className="pt-1.5 border-t border-[#1E1E26]/30 text-[10px] text-[#9A9AA5]"><strong>Explanation:</strong> Use Past Simple instead of Present Perfect when a specific past time is mentioned ("Yesterday").</p>
          </div>}
        </div>
      </div>
    </div>
  );
}

function CoachTab() {
  return (
    <div className="flex flex-col md:flex-row gap-8 h-full">
      <div className="flex-1 flex flex-col justify-between space-y-6">
        <div>
          <span className="text-[10px] font-bold text-[#6E5BFF] uppercase tracking-wider font-mono mb-2 block">Module 3.14</span>
          <h3 className="text-2xl font-bold text-white mb-3" style={{fontFamily:"Hanken Grotesk,sans-serif"}}>Weekly Coach Reports</h3>
          <p className="text-[#9A9AA5] text-sm leading-relaxed">Once a week, the system gathers your study data and generates a progress summary noting improvements and targeting specific weaknesses.</p>
        </div>
        <div className="space-y-2 text-xs font-mono text-[#9A9AA5]">
          <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[#6E5BFF] text-sm">trending_up</span>Tracks dynamic CEFR progression</div>
          <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[#6E5BFF] text-sm">rule</span>Counts aggregated error repeats</div>
        </div>
        <div className="pt-4 border-t border-[#1E1E26] flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#62626C]">Uses gemini-2.5-pro</span>
          <span className="text-xs text-[#3DD68C] flex items-center gap-1 font-mono"><span className="material-symbols-outlined text-xs">verified</span>Generated Weekly</span>
        </div>
      </div>
      <div className="flex-1 bg-[#050507] rounded-xl border border-[#1E1E26] p-5 flex flex-col min-h-[260px] text-xs">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-[#1E1E26] pb-2">
            <div><h4 className="font-bold text-white">Weekly Progress Letter</h4><span className="text-[9px] text-[#62626C] font-mono">June 20 – June 26, 2026</span></div>
            <span className="text-[9px] font-mono bg-[#6E5BFF]/10 border border-[#6E5BFF]/20 text-[#6E5BFF] px-2 py-0.5 rounded">Pro Report</span>
          </div>
          <div className="space-y-3 text-[#9A9AA5] text-xs leading-relaxed">
            <p>Hi! This week you completed <strong className="text-white">6 lessons</strong> and earned <strong className="text-white">350 XP</strong>. Your speaking shows high conversational flow in work scenarios.</p>
            <div className="p-2.5 bg-[#161620] border border-[#1E1E26] rounded-lg">
              <span className="font-semibold text-[#E8B339] block mb-1 text-[11px]">Critical Target for next week:</span>
              <span>Confusion of Past Simple vs Present Perfect. Confirmed by 3 errors in your writing exam. We added 2 specific review topics.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InteractiveHub() {
  const [active, setActive] = useState(0);
  const content = [<LessonTab key={0}/>, <TutorTab key={1}/>, null, <WritingTab key={3}/>, <CoachTab key={4}/>];
  return (
    <section className="py-24 px-6 max-w-[1440px] mx-auto w-full border-t border-[#1E1E26]/30" id="interactive-hub">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-block px-3.5 py-1 bg-[#6E5BFF]/10 border border-[#6E5BFF]/20 text-[#c6bfff] rounded-lg text-[9px] font-bold font-mono uppercase tracking-widest mb-4">Sandbox environment</div>
        <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-4" style={{fontFamily:"Hanken Grotesk,sans-serif"}}>The 14-Module Personalized Learning Architecture</h2>
        <p className="text-[#9A9AA5] text-base">Click the tabs below to interact with real screen mockups and understand the core features of the system.</p>
      </div>
      <div className="max-w-5xl mx-auto flex flex-col">
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 border-b border-[#1E1E26] font-mono" style={{scrollbarWidth:"none"}}>
          {TABS.map((t,i)=>(
            <button key={i} onClick={()=>setActive(i)} className={`px-4 py-2 border-b-2 text-xs flex items-center gap-2 whitespace-nowrap transition-colors active:scale-[0.98] ${active===i?"border-[#6E5BFF] font-semibold text-[#6E5BFF]":"border-transparent font-medium text-[#9A9AA5] hover:text-[#F5F5F7]"}`}>
              <span className="material-symbols-outlined text-lg">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
        <div className="relative bg-[#0F0F14] rounded-2xl border border-[#1E1E26] min-h-[480px] overflow-hidden p-6 md:p-8 flex flex-col justify-between" style={{boxShadow:"0 0 40px -5px rgba(110,91,255,0.08)"}}>
          {content[active] ?? (
            <div className="flex flex-col items-center justify-center h-full text-[#9A9AA5] space-y-3">
              <span className="material-symbols-outlined text-4xl text-[#6E5BFF]">settings_voice</span>
              <p className="text-sm">Voice Speaking demo available in the full app.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

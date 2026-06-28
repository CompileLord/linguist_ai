"use client";
import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import InteractiveHub from "@/components/InteractiveHub";
import PlacementTest from "@/components/PlacementTest";

const MeshBackground = dynamic(() => import("@/components/MeshBackground"), {
  ssr: false,
});

const PIPELINE = [
  {
    num: "01",
    col: "text-[#6E5BFF]",
    hover: "hover:border-[#6E5BFF]/40",
    title: "Target Context",
    desc: "Aggregates CEFR level, daily goals, active language, and logged error tags from DB.",
  },
  {
    num: "02",
    col: "text-[#8B7CFF]",
    hover: "hover:border-[#8B7CFF]/40",
    title: "LLM Prompt Engine",
    desc: "Injects metrics into system prompts, prioritizing vocabulary based on user goals.",
  },
  {
    num: "03",
    col: "text-[#3DD68C]",
    hover: "hover:border-[#3DD68C]/40",
    title: "JSON Validation",
    desc: "Vertex AI enforces JSON structures using Pydantic models to prevent formatting drops.",
  },
  {
    num: "04",
    col: "text-[#E8B339]",
    hover: "hover:border-[#E8B339]/40",
    title: "Dynamic Compile",
    desc: "Deploys content blocks, schedules review queues, and registers error correction mappings.",
  },
];

export default function LandingPage() {
  return (
    <div
      className="relative min-h-screen text-[#F5F5F7] overflow-x-hidden"
      style={{
        background: "#050507",
        backgroundImage:
          "linear-gradient(to right,rgba(110,91,255,.03) 1px,transparent 1px),linear-gradient(to bottom,rgba(110,91,255,.03) 1px,transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    >
      <MeshBackground />

      {/* NAV */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-[#1E1E26]"
        style={{
          background: "rgba(15,15,20,0.75)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-20 flex justify-between items-center">
          <a href="#" className="flex items-center gap-3">
            <div
              className="relative w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg,#6E5BFF,#8B7CFF)",
                boxShadow: "0 0 20px rgba(110,91,255,.4)",
              }}
            >
              <div className="absolute inset-0.5 rounded-[10px] bg-[#050507]" />
              <span
                className="relative z-10 font-bold text-transparent bg-clip-text"
                style={{
                  backgroundImage: "linear-gradient(to right,#fff,#c6bfff)",
                  fontFamily: "Hanken Grotesk,sans-serif",
                }}
              >
                L
              </span>
            </div>
            <span
              className="text-xl font-bold tracking-tight"
              style={{
                fontFamily: "Hanken Grotesk,sans-serif",
                background: "linear-gradient(to right,#6E5BFF,#8B7CFF)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Linguist <span style={{ WebkitTextFillColor: "#fff" }}>AI</span>
            </span>
          </a>
          <div className="hidden lg:flex items-center gap-8 text-[#9A9AA5] text-xs uppercase tracking-wider font-mono font-medium">
            {[
              ["#pipeline", "Pipeline"],
              ["#interactive-hub", "Interactive Hub"],
              ["#placement", "Diagnostic"],
              ["#quotas", "Limits"],
            ].map(([h, l]) => (
              <a
                key={h}
                href={h}
                className="hover:text-[#6E5BFF] transition-colors"
              >
                {l}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden sm:inline-block px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider font-mono text-[#9A9AA5] hover:text-[#F5F5F7] transition-all"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider font-mono text-white border border-[#8B7CFF]/20 active:scale-[0.98] transition-all"
              style={{
                background: "#6E5BFF",
                boxShadow: "0 0 20px rgba(110,91,255,.3)",
              }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section
        className="relative pt-44 pb-24 px-6 max-w-[1440px] mx-auto w-full"
        style={{ zIndex: 1 }}
      >
        <div className="text-center max-w-4xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#161620] border border-[#1E1E26] text-[#c6bfff] rounded-lg text-[10px] font-bold font-mono uppercase tracking-widest mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6E5BFF] animate-ping" />
            SaaS MVP Launch
          </div>
          <h1
            className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05] mb-8 max-w-4xl"
            style={{ fontFamily: "Hanken Grotesk,sans-serif" }}
          >
            The Generative AI <br className="hidden sm:inline" />
            Language Platform
          </h1>
          <p className="text-[#9A9AA5] text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl mb-12">
            Ditch static courses. Linguist AI compiles personalized lessons,
            custom databases, and real-time voice sessions dynamically using
            Vertex AI—engineered to map perfectly to your goals and error logs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-20 justify-center w-full sm:w-auto relative z-10">
            <Link
              href="/register"
              className="px-8 py-4 rounded-lg text-white font-bold uppercase tracking-wider font-mono text-xs text-center border border-[#8B7CFF]/30 active:scale-[0.98] transition-all"
              style={{
                background: "#6E5BFF",
                boxShadow: "0 0 24px rgba(110,91,255,.4)",
              }}
            >
              Start Onboarding — Free
            </Link>
            <a
              href="#placement"
              className="px-8 py-4 rounded-lg border border-[#1E1E26] hover:border-[#6E5BFF]/50 hover:bg-[#161620]/30 text-[#F5F5F7] font-bold uppercase tracking-wider font-mono text-xs text-center transition-all"
            >
              Try Interactive Diagnostic
            </a>
          </div>
        </div>

        {/* MOCKUP */}
        <div
          className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden border border-[#1E1E26] shadow-2xl mt-8"
          style={{
            background: "#0F0F14",
            boxShadow: "0 0 40px -5px rgba(110,91,255,.08)",
          }}
        >
          <div
            className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#6E5BFF] to-transparent"
            style={{ animation: "accent-pulse 3s infinite ease-in-out" }}
          />
          <div className="bg-[#0F0F14] border-b border-[#1E1E26] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5C6C]/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#E8B339]/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#3DD68C]/30" />
              <span className="text-[10px] font-mono text-[#62626C] ml-2">
                linguist-ai-dashboard
              </span>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono text-[#9A9AA5]">
              <span className="flex items-center gap-1">
                <span
                  className="material-symbols-outlined text-[#E8B339] text-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  local_fire_department
                </span>
                <strong className="text-[#F5F5F7]">7 Day</strong> Streak
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[#6E5BFF] text-sm">
                  military_tech
                </span>
                <strong className="text-[#F5F5F7]">1,250</strong> XP
              </span>
            </div>
          </div>
          <div className="p-6 md:p-8 bg-[#050507] grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div
                className="rounded-xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[220px] border border-[#6E5BFF]/20"
                style={{
                  background:
                    "linear-gradient(135deg,rgba(110,91,255,.05),transparent)",
                }}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2.5 py-0.5 bg-[#161620] border border-[#1E1E26] rounded text-[9px] font-mono text-[#c6bfff] uppercase tracking-wider font-bold">
                      Active Module
                    </span>
                    <span className="text-[10px] font-mono text-[#9A9AA5] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6E5BFF] animate-ping" />
                      Live Generation
                    </span>
                  </div>
                  <h3
                    className="text-3xl font-bold text-white mb-1"
                    style={{ fontFamily: "Hanken Grotesk,sans-serif" }}
                  >
                    Past Tense Mastery
                  </h3>
                  <p className="text-xs text-[#9A9AA5]">
                    Module 4: Irregular Verbs in Narrative Writing
                  </p>
                </div>
                <div className="mt-auto flex items-center justify-between gap-4">
                  <div className="flex-grow max-w-xs">
                    <div className="flex justify-between text-[10px] font-mono text-[#9A9AA5] mb-1 font-bold">
                      <span>Module Progress</span>
                      <span>65%</span>
                    </div>
                    <div className="h-1.5 bg-[#161620] border border-[#1E1E26] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: "65%",
                          background:
                            "linear-gradient(to right,#6E5BFF,#8B7CFF)",
                        }}
                      />
                    </div>
                  </div>
                  <button
                    className="px-4 py-2.5 text-white rounded-lg text-xs font-bold uppercase tracking-wider font-mono border border-[#8B7CFF]/20 flex items-center gap-1"
                    style={{ background: "#6E5BFF" }}
                  >
                    Continue
                    <span className="material-symbols-outlined text-xs">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-[#9A9AA5] uppercase tracking-wider font-mono mb-3">
                  AI Action Suite
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    ["settings_voice", "text-[#6E5BFF]", "Speaking"],
                    ["smart_toy", "text-[#8B7CFF]", "AI Tutor"],
                    ["explore", "text-[#3DD68C]", "Missions"],
                    ["workspace_premium", "text-[#E8B339]", "Exams"],
                  ].map(([icon, col, label]) => (
                    <div
                      key={String(label)}
                      className="bg-[#0F0F14] p-3 rounded-lg border border-[#1E1E26] flex items-center gap-2 hover:border-[#6E5BFF]/40 transition-all cursor-pointer"
                    >
                      <span
                        className={`material-symbols-outlined ${col} text-base`}
                      >
                        {icon}
                      </span>
                      <span className="text-xs font-medium text-white">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-[#0F0F14] rounded-xl p-5 border border-[#1E1E26]">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#E8B339] text-lg">
                      psychology
                    </span>
                    <span className="text-[9px] font-bold text-[#9A9AA5] uppercase tracking-wider font-mono">
                      Spaced Repetition
                    </span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#E8B339] animate-pulse" />
                </div>
                <h4
                  className="text-xl font-bold text-white tracking-tight"
                  style={{ fontFamily: "Hanken Grotesk,sans-serif" }}
                >
                  52 Words & Rules
                </h4>
                <p className="text-xs text-[#9A9AA5] mt-1 mb-4">
                  Due today for review based on your previous errors.
                </p>
                <button className="w-full py-2 bg-[#161620] border border-[#1E1E26] hover:border-[#6E5BFF]/50 text-[10px] font-bold uppercase tracking-wider font-mono rounded-lg transition-all">
                  Start Review Session
                </button>
              </div>
              <div className="bg-[#0F0F14] rounded-xl p-4 border border-[#1E1E26] flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#6E5BFF]/10 border border-[#6E5BFF]/20 flex items-center justify-center text-[#6E5BFF]">
                  <span className="material-symbols-outlined text-base">
                    chat_bubble
                  </span>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white">
                    AI Coach Report Ready
                  </h5>
                  <p className="text-[9px] text-[#9A9AA5] font-mono mt-0.5">
                    Reviewing your B1 grammar accuracy patterns.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PIPELINE */}
      <section
        className="py-24 px-6 max-w-[1440px] mx-auto w-full border-t border-[#1E1E26]/30"
        id="pipeline"
        style={{ zIndex: 1, position: "relative" }}
      >
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-block px-3.5 py-1 bg-[#6E5BFF]/10 border border-[#6E5BFF]/20 text-[#c6bfff] rounded-lg text-[9px] font-bold font-mono uppercase tracking-widest mb-4">
            Under the Hood
          </div>
          <h2
            className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-4"
            style={{ fontFamily: "Hanken Grotesk,sans-serif" }}
          >
            The AI Content Compilation Pipeline
          </h2>
          <p className="text-[#9A9AA5] text-base">
            Watch how Vertex AI orchestrates and compiles lessons in real time
            based on your target profiles.
          </p>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          <div
            className="hidden md:block absolute top-12 left-6 right-6 h-0.5 border-t-2 border-dashed border-[#1E1E26]/40"
            style={{ zIndex: -1 }}
          />
          {PIPELINE.map((s) => (
            <div
              key={s.num}
              className={`bg-[#0F0F14] rounded-xl p-6 border border-[#1E1E26] ${s.hover} transition-all flex flex-col gap-4 min-h-[180px] group`}
            >
              <div
                className={`w-10 h-10 rounded-lg bg-[#161620] border border-[#1E1E26] flex items-center justify-center font-mono font-bold ${s.col}`}
              >
                {s.num}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{s.title}</h4>
                <p className="text-[11px] text-[#9A9AA5] mt-1 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* INTERACTIVE HUB */}
      <InteractiveHub />

      {/* PLACEMENT */}
      <section
        className="py-24 px-6 max-w-[1440px] mx-auto w-full border-t border-[#1E1E26]/30 bg-[#0F0F14]/20"
        id="placement"
        style={{ zIndex: 1, position: "relative" }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 max-w-5xl mx-auto items-center">
          <div className="lg:col-span-2 space-y-6">
            <div className="inline-block px-3.5 py-1 bg-[#3DD68C]/10 border border-[#3DD68C]/20 text-[#3DD68C] rounded-lg text-xs font-semibold font-mono uppercase tracking-wider">
              Diagnostic Module
            </div>
            <h2
              className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-[1.1]"
              style={{ fontFamily: "Hanken Grotesk,sans-serif" }}
            >
              Establish Your Real CEFR Level in 3 Questions
            </h2>
            <p className="text-[#9A9AA5] text-sm sm:text-base leading-relaxed">
              Linguist AI determines your level without stressful exams. Test
              the mini placement simulator to see how the system registers
              answers and updates your profile.
            </p>
            <div className="space-y-3 text-xs font-mono text-[#9A9AA5] pt-2">
              {[
                "Adaptive logic (adjusts question difficulty)",
                "Instant error grading & notes",
                "Sets initial goal parameters",
              ].map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#3DD68C] text-sm">
                    check_circle
                  </span>
                  {t}
                </div>
              ))}
            </div>
          </div>
          <div
            className="lg:col-span-3 rounded-2xl p-6 md:p-8 border border-[#1E1E26] flex flex-col justify-between min-h-[400px]"
            style={{
              background: "#0F0F14",
              boxShadow: "0 0 40px -5px rgba(110,91,255,.08)",
            }}
          >
            <PlacementTest />
          </div>
        </div>
      </section>

      {/* QUOTAS */}
      <section
        className="py-24 px-6 max-w-[1440px] mx-auto w-full border-t border-[#1E1E26]/30"
        id="quotas"
        style={{ zIndex: 1, position: "relative" }}
      >
        <div className="text-center max-w-2xl mx-auto mb-20">
          <div className="inline-block px-3.5 py-1 bg-[#6E5BFF]/10 border border-[#6E5BFF]/20 text-[#c6bfff] rounded-lg text-[9px] font-bold font-mono uppercase tracking-widest mb-4">
            Infrastructure Limits
          </div>
          <h2
            className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-4"
            style={{ fontFamily: "Hanken Grotesk,sans-serif" }}
          >
            Transparent Pricing & Infrastructure Quotas
          </h2>
          <p className="text-[#9A9AA5] text-base">
            Linguist AI is free forever at launch. Real-time STT and LLM
            reasoning are computationally expensive, so we enforce fair usage
            limits.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            {
              icon: "settings_voice",
              col: "text-[#6E5BFF]",
              bcol: "bg-[#6E5BFF]/10",
              bcol2: "border-[#6E5BFF]/20",
              title: "AI Live Speaking",
              desc: "Real-time oral chat sessions using voice audio Streaming STT & local Piper Text-to-Speech synthesis.",
              limit: "5 Minutes / Day",
              lcol: "text-[#E8B339]",
            },
            {
              icon: "smart_toy",
              col: "text-[#8B7CFF]",
              bcol: "bg-[#8B7CFF]/10",
              bcol2: "border-[#8B7CFF]/20",
              title: "AI Live Tutor",
              desc: "Streaming text dialogue explaining grammar, generating quick exercises, and clarifying study concerns.",
              limit: "50 Messages / Day",
              lcol: "text-[#6E5BFF]",
            },
            {
              icon: "auto_stories",
              col: "text-[#3DD68C]",
              bcol: "bg-[#3DD68C]/10",
              bcol2: "border-[#3DD68C]/20",
              title: "Lessons & Exams",
              desc: "Custom curriculum generation, listening exams, writing essays, spaced repetition, and achievement awards.",
              limit: "10 Lessons / Day",
              lcol: "text-[#3DD68C]",
              badge: "Free Tier",
            },
          ].map((c) => (
            <div
              key={c.title}
              className="bg-[#0F0F14] rounded-xl p-6 border border-[#1E1E26] flex flex-col justify-between hover:border-[#6E5BFF]/40 transition-colors relative overflow-hidden"
            >
              {c.badge && (
                <div className="absolute top-0 right-0 bg-[#6E5BFF] text-white text-[9px] font-bold font-mono px-3 py-1 uppercase rounded-bl-lg tracking-wider">
                  {c.badge}
                </div>
              )}
              <div className="space-y-4">
                <div
                  className={`w-10 h-10 rounded-lg ${c.bcol} border ${c.bcol2} flex items-center justify-center ${c.col}`}
                >
                  <span className="material-symbols-outlined">{c.icon}</span>
                </div>
                <div>
                  <h3
                    className="text-lg font-bold text-white"
                    style={{ fontFamily: "Hanken Grotesk,sans-serif" }}
                  >
                    {c.title}
                  </h3>
                  <p className="text-xs text-[#9A9AA5] mt-2 leading-relaxed">
                    {c.desc}
                  </p>
                </div>
              </div>
              <div className="flex items-end justify-between border-t border-[#1E1E26]/50 pt-4 mt-4">
                <span className="text-[10px] font-mono text-[#62626C]">
                  Daily Limit
                </span>
                <span className={`text-xs font-bold font-mono ${c.lcol}`}>
                  {c.limit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* COMPARISON */}
      <section
        className="py-24 px-6 max-w-[1440px] mx-auto w-full border-t border-[#1E1E26]/30 bg-[#0F0F14]/10"
        style={{ zIndex: 1, position: "relative" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <div className="inline-block px-3.5 py-1 bg-[#6E5BFF]/10 border border-[#6E5BFF]/20 text-[#c6bfff] rounded-lg text-[9px] font-bold font-mono uppercase tracking-widest mb-4">
              Comparison Metrics
            </div>
            <h2
              className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-4"
              style={{ fontFamily: "Hanken Grotesk,sans-serif" }}
            >
              How Linguist AI Compares
            </h2>
            <p className="text-[#9A9AA5] text-base">
              Traditional platforms use static paths. Linguist AI builds
              curriculum in real-time around your exact error patterns.
            </p>
          </div>
          <div className="border border-[#1E1E26] rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0F0F14] border-b border-[#1E1E26]">
                  <th
                    className="p-5 md:p-6 text-sm font-bold text-white"
                    style={{ fontFamily: "Hanken Grotesk,sans-serif" }}
                  >
                    Features
                  </th>
                  <th
                    className="p-5 md:p-6 text-sm font-bold text-[#62626C]"
                    style={{ fontFamily: "Hanken Grotesk,sans-serif" }}
                  >
                    Duolingo / Babbel
                  </th>
                  <th
                    className="p-5 md:p-6 text-sm font-bold text-[#6E5BFF] flex items-center gap-1.5"
                    style={{ fontFamily: "Hanken Grotesk,sans-serif" }}
                  >
                    <span className="material-symbols-outlined text-base">
                      verified
                    </span>
                    Linguist AI
                  </th>
                </tr>
              </thead>
              <tbody className="text-xs text-[#9A9AA5]">
                {[
                  [
                    "Learning Path",
                    "Static predetermined trees",
                    "Dynamic context generator",
                  ],
                  [
                    "Vocabulary Context",
                    'Generic examples ("apple", "boy")',
                    "Adapted to your goals (Work, IELTS)",
                  ],
                  [
                    "Error Analysis",
                    "Repeat same exercise later",
                    "Error Correction Database + AI Coach",
                  ],
                  [
                    "Voice Dialogue",
                    "Compare reading to static audio",
                    "5m real-time daily speaking conversation",
                  ],
                ].map(([feat, old, ai], i) => (
                  <tr
                    key={String(feat)}
                    className={`hover:bg-[#161620]/20 transition-colors ${i < 3 ? "border-b border-[#1E1E26]" : ""}`}
                  >
                    <td className="p-5 md:p-6 font-semibold text-white">
                      {feat}
                    </td>
                    <td className="p-5 md:p-6">{old}</td>
                    <td className="p-5 md:p-6 text-white font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[#3DD68C] text-base">
                          check_circle
                        </span>
                        {ai}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section
        className="py-24 px-6 max-w-[1440px] mx-auto w-full text-center relative overflow-hidden"
        style={{ zIndex: 1 }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg,rgba(110,91,255,.05),transparent)",
          }}
        />
        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <h2
            className="text-4xl sm:text-5xl font-bold text-white tracking-tight"
            style={{ fontFamily: "Hanken Grotesk,sans-serif" }}
          >
            Ready to Build Your AI Learning Path?
          </h2>
          <p className="text-[#9A9AA5] text-base  mx-auto leading-relaxed">
            Take your English to the next level today. It takes less than 5
            minutes to complete the onboarding placement test.
          </p>
          <div className="pt-4">
            <Link
              href="/register"
              className="inline-block px-8 py-4 rounded-lg text-white font-bold uppercase tracking-wider font-mono text-xs border border-[#8B7CFF]/30 active:scale-[0.98] transition-all"
              style={{
                background: "#6E5BFF",
                boxShadow: "0 0 24px rgba(110,91,255,.4)",
              }}
            >
              Get Started For Free
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="mt-auto bg-[#0F0F14] border-t border-[#1E1E26] py-12 px-6"
        style={{ zIndex: 1, position: "relative" }}
      >
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold text-[10px]"
              style={{
                background: "linear-gradient(135deg,#6E5BFF,#8B7CFF)",
                fontFamily: "Hanken Grotesk,sans-serif",
              }}
            >
              L
            </div>
            <span
              className="font-bold text-white tracking-tight"
              style={{ fontFamily: "Hanken Grotesk,sans-serif" }}
            >
              Linguist AI
            </span>
            <span className="text-xs text-[#62626C] font-mono ml-2">
              © 2026
            </span>
          </div>
          <div className="flex flex-wrap gap-3 items-center justify-center text-[10px] font-mono text-[#9A9AA5]">
            {[
              "FastAPI (Python)",
              "Next.js (React)",
              "Vertex AI",
              "Piper TTS",
            ].map((t) => (
              <span
                key={t}
                className="px-2.5 py-0.5 bg-[#050507] border border-[#1E1E26] rounded"
              >
                {t}
              </span>
            ))}
          </div>
          <div className="text-xs text-[#9A9AA5] flex gap-6 font-medium font-mono">
            {["Terms", "Privacy", "Support"].map((t) => (
              <a
                key={t}
                href="#"
                className="hover:text-[#6E5BFF] transition-colors"
              >
                {t}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

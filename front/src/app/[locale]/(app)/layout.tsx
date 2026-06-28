"use client";

import { ReactNode, useEffect, useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useGetGamificationStatsQuery } from "@/services/dashboardApi";
import { useGetTutorSessionsQuery, useCreateTutorSessionMutation, TutorSessionResponse } from "@/services/tutorApi";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import CountUp from "react-countup";

function TutorSessionsNav({ router }: { router: ReturnType<typeof useRouter> }) {
  const { data: sessions = [], refetch } = useGetTutorSessionsQuery({ include_ended: true });
  const [createSession, { isLoading: isCreating }] = useCreateTutorSessionMutation();
  const [activeSessId, setActiveSessId] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      const p = new URLSearchParams(window.location.search);
      setActiveSessId(p.get("s"));
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  const handleNewChat = async () => {
    try {
      const sess = await createSession({ title: "New Chat" }).unwrap();
      refetch();
      router.push(`/tutor?s=${sess.id}` as any);
      setActiveSessId(sess.id);
    } catch { /* ignore */ }
  };

  const todayStart = new Date().setHours(0, 0, 0, 0);
  const yesterdayStart = todayStart - 86400000;

  const groups: { label: string; items: TutorSessionResponse[] }[] = [
    {
      label: "Today",
      items: sessions.filter((s) => new Date(s.started_at).getTime() >= todayStart),
    },
    {
      label: "Yesterday",
      items: sessions.filter((s) => {
        const t = new Date(s.started_at).getTime();
        return t >= yesterdayStart && t < todayStart;
      }),
    },
    {
      label: "Older",
      items: sessions.filter((s) => new Date(s.started_at).getTime() < yesterdayStart),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="mt-0.5 ml-0.5">
      <button
        onClick={handleNewChat}
        disabled={isCreating}
        className="w-full flex items-center gap-2 pl-9 pr-3 py-1.5 rounded-lg text-[12px] text-on-surface-variant/70 hover:bg-white/[0.05] hover:text-on-surface transition-all disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[14px]">add</span>
        {isCreating ? "Creating…" : "New chat"}
      </button>

      <div className="mt-0.5 max-h-52 overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="pl-9 text-[9px] uppercase tracking-widest text-on-surface-variant/35 font-bold mt-1.5 mb-0.5">
              {g.label}
            </p>
            {g.items.map((s) => {
              const isActive = s.id === activeSessId;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveSessId(s.id);
                    router.push(`/tutor?s=${s.id}` as any);
                  }}
                  className={`w-full flex items-center gap-2 pl-9 pr-3 py-1.5 rounded-lg text-[12px] transition-all text-left ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface-variant/60 hover:bg-white/[0.04] hover:text-on-surface"
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.is_active ? "#3DD68C" : "transparent", border: s.is_active ? "none" : "1px solid rgba(154,154,165,0.4)" }}
                  />
                  <span className="truncate flex-1 leading-snug">{s.title || "New Chat"}</span>
                  <span className="text-[10px] text-on-surface-variant/30 shrink-0 tabular-nums">{s.message_count}</span>
                </button>
              );
            })}
          </div>
        ))}
        {sessions.length === 0 && (
          <p className="pl-9 text-[11px] text-on-surface-variant/35 italic mt-1">No sessions yet</p>
        )}
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const isInitialized = useSelector((state: RootState) => state.auth.isInitialized);
  const { data: gamification, isLoading } = useGetGamificationStatsQuery(undefined, {
    skip: !isAuthenticated,
  });

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isInitialized, isAuthenticated, router]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface">
        <div className="text-lg animate-pulse">Initializing session...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface">
        <div className="text-lg animate-pulse">Redirecting to login...</div>
      </div>
    );
  }

  const isOnboarding = pathname.startsWith("/onboarding");
  const isMissionChat = pathname.startsWith("/missions/") && !pathname.includes("/feedback");
  const isFullscreenChat = isMissionChat || pathname === "/tutor";
  const isLesson = pathname.includes("/lessons/");

  if (isOnboarding) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md antialiased selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden relative">
        <header className="bg-surface fixed top-0 w-full z-50 border-b border-[#2A2A32]">
          <div className="flex justify-between items-center h-16 px-md max-w-container-max mx-auto">
            <div className="flex items-center">
              <span className="font-headline-md text-headline-md font-semibold text-on-surface tracking-tight">
                Linguist AI
              </span>
            </div>
            <div className="flex items-center gap-sm">
              <button className="p-xs text-on-surface-variant hover:text-primary transition-colors duration-200 rounded-full hover:bg-surface-container-high focus:outline-none">
                <span
                  className="material-symbols-outlined block"
                  style={{
                    fontVariationSettings:
                      "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                  }}
                >
                  settings
                </span>
              </button>
              <button className="p-xs text-on-surface-variant hover:text-primary transition-colors duration-200 rounded-full hover:bg-surface-container-high focus:outline-none">
                <span
                  className="material-symbols-outlined block"
                  style={{
                    fontVariationSettings:
                      "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                  }}
                >
                  account_circle
                </span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center pt-xl pb-xl px-md mt-16 relative w-full max-w-[800px] mx-auto z-10">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
            <div className="w-64 h-64 bg-primary-container rounded-full opacity-10 blur-3xl transform scale-150"></div>
          </div>
          {children}
        </main>
      </div>
    );
  }

  const getPageTitle = () => {
    if (pathname.includes("/dashboard")) return "Dashboard";
    if (pathname.includes("/speaking")) return "AI Speaking";
    if (pathname.includes("/feedback")) return "Mission Feedback";
    if (pathname.includes("/review")) return "Review Queue";
    if (pathname.includes("/missions")) return "Missions";
    if (pathname.includes("/tutor")) return "AI Tutor";
    if (pathname.includes("/coach")) return "AI Coach Reports";
    if (pathname.includes("/progress")) return "Progress & Profile";
    if (pathname.includes("/achievements")) return "Achievements & Badges";
    if (pathname.includes("/exams/writing/results")) return "Writing Results";
    if (pathname.includes("/exams/writing")) return "Writing Exam";
    if (pathname.includes("/exams/listening")) return "Listening Exam";
    if (pathname.includes("/lessons")) return "Lesson";
    return "Dashboard";
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/missions", label: "Missions", icon: "explore" },
    { href: "/tutor", label: "Tutor", icon: "smart_toy" },
    { href: "/vocabulary", label: "Vocabulary", icon: "translate" },
    { href: "/progress", label: "Progress", icon: "analytics" },
    { href: "/settings", label: "Settings", icon: "settings" },
  ];

  const mobileNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/speaking", label: "Speaking", icon: "settings_voice" },
    { href: "/tutor", label: "Tutor", icon: "smart_toy" },
    { href: "/progress", label: "Progress", icon: "leaderboard" },
  ];

  return (
    <div className="min-h-screen flex flex-col font-body-md text-body-md antialiased selection:bg-primary/20 selection:text-primary bg-background text-on-background pb-16 md:pb-0">
      
      {/* Global TopNavBar (Mobile Only) */}
      <nav className="md:hidden fixed top-0 w-full z-50 bg-[#15151A]/80 backdrop-blur-md border-b border-[#2A2A32] flex justify-between items-center h-16 px-gutter max-w-container-max mx-auto">
        <div className="flex items-center">
          <span className="text-headline-md font-headline-lg text-primary tracking-tight">
            Linguist AI
          </span>
        </div>
        <div className="flex items-center gap-sm">
          <div className="flex items-center gap-xs text-on-surface-variant">
            <span
              className="material-symbols-outlined text-warning text-lg animate-pulse"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_fire_department
            </span>
            <span className="font-label-md text-label-md tabular-nums">
              {isLoading ? "-" : gamification?.current_streak || 0}
            </span>
          </div>
          <div className="flex items-center gap-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-primary text-lg">military_tech</span>
            <span className="font-label-md text-label-md tabular-nums">
              {isLoading ? "-" : gamification?.total_xp || 0} XP
            </span>
          </div>
          <div className="w-8 h-8 rounded-full border border-[#2A2A32] bg-surface-container-high flex items-center justify-center overflow-hidden">
            <span className="material-symbols-outlined text-on-surface-variant">
              person
            </span>
          </div>
        </div>
      </nav>

      {/* Main Layout Wrapper */}
      <div className="flex flex-1 pt-16 md:pt-0 min-h-0">
        
        {/* SideNavBar (Desktop Only) */}
        <aside className="hidden md:flex flex-col py-md px-sm fixed left-0 top-0 h-screen w-64 bg-background border-r border-[#2A2A32] z-20">
          <div className="mb-sm px-sm mt-sm shrink-0">
            <h1 className="font-display text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-[#8B7CFF] tracking-tight leading-tight mb-1">
              Linguist AI
            </h1>
            <p className="text-on-surface-variant font-body-sm text-xs font-semibold">Premium Tier</p>
          </div>
          <div className="flex flex-col flex-1 min-h-0">
            <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto custom-scrollbar pb-2">
              {navItems.map((item) => {
                const isTutor = item.href === "/tutor";
                const isActive = isTutor ? pathname.startsWith("/tutor") : pathname === item.href;
                return (
                  <div key={item.label}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-sm px-4 py-2.5 rounded-lg active:scale-[0.98] transition-all duration-150 ${
                        isActive
                          ? "bg-surface-bright text-primary font-semibold border-l-2 border-primary"
                          : "text-on-surface-variant hover:bg-surface-bright/50 hover:text-on-surface"
                      }`}
                    >
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                      <span className="text-label-md font-label-md flex-1">{item.label}</span>
                    </Link>
                    {isTutor && isActive && (
                      <TutorSessionsNav router={router} />
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="px-xs pb-4 shrink-0 pt-2">
              <Link
                href="/speaking"
                className="block w-full text-center bg-primary hover:bg-primary/95 text-white font-medium py-2.5 px-4 rounded-lg active:scale-[0.96] transition-[transform,background-color] duration-150 shadow-[0_0_12px_rgba(110,91,255,0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 text-label-md font-label-md border border-[#8B7CFF]/30 hover:border-[#8B7CFF]/60 cursor-pointer"
              >
                New Session
              </Link>
            </div>
          </div>
        </aside>

        {/* Content Canvas Area */}
        <div className="flex-1 md:pl-64 w-full flex flex-col min-h-0">
          
          {/* Inner TopAppBar (Desktop Only, matches mockup) */}
          <header className="hidden md:flex bg-surface/85 backdrop-blur-md border-b border-[#2A2A32] justify-between items-center w-full h-16 px-xl sticky top-0 z-10 shrink-0">
            <div className="font-headline-lg text-2xl font-bold text-on-surface tracking-tight">
              {getPageTitle()}
            </div>
            <div className="flex items-center gap-md">
              {/* Streak */}
              <div className="flex items-center gap-xs bg-surface-bright border border-[#2A2A32] rounded-full py-1 px-3">
                <span className="material-symbols-outlined text-[#E8B339] text-lg animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>
                  local_fire_department
                </span>
                <span className="font-label-md text-label-md text-on-surface tabular-nums">
                  {isLoading ? "-" : gamification?.current_streak || 0} Day Streak
                </span>
              </div>
              {/* XP */}
              <div className="flex items-center gap-xs bg-surface-bright border border-[#2A2A32] rounded-full py-1 px-3">
                <span className="material-symbols-outlined text-primary text-lg">military_tech</span>
                <span className="font-label-md text-label-md text-on-surface tabular-nums">
                  {isLoading ? (
                    <span className="inline-block w-8 h-4 bg-surface-container-high animate-pulse rounded"></span>
                  ) : (
                    <CountUp
                      end={gamification?.total_xp || 0}
                      duration={1.5}
                      separator=","
                    />
                  )}{" "}
                  XP
                </span>
              </div>
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full border border-[#2A2A32] bg-surface-container-high flex items-center justify-center overflow-hidden hover:border-primary/50 hover:shadow-[0_0_8px_rgba(110,91,255,0.4)] transition-all duration-200 cursor-pointer">
                <span className="material-symbols-outlined text-on-surface-variant">
                  person
                </span>
              </div>
            </div>
          </header>

          <main className={
            isFullscreenChat
              ? "flex-1 flex flex-col min-h-0 overflow-hidden"
              : isLesson
              ? "flex-1 flex flex-col min-h-0 overflow-hidden"
              : "flex-grow p-sm md:p-xl max-w-[1000px] w-full mx-auto pb-24"
          }>
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 bg-[#15151A]/90 backdrop-blur-md border-t border-[#2A2A32] flex justify-around items-center h-16 pb-safe">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {item.icon}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

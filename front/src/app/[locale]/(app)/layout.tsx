"use client";

import { ReactNode, useEffect, useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useGetGamificationStatsQuery } from "@/services/dashboardApi";
import CountUp from "react-countup";
import { useDispatch } from "react-redux";
import { logout } from "@/store/authSlice";
import { useTranslations } from "next-intl";

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const t = useTranslations("Dashboard");
  const params = useParams();
  const { data: gamification, isLoading } = useGetGamificationStatsQuery();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) {
      setTimeout(() => {
        setIsRedirecting(true);
      }, 0);
      router.replace("/login");
    }
  }, [router]);

  const isOnboarding = pathname.startsWith("/onboarding");

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface">
        <div className="text-lg animate-pulse">Loading...</div>
      </div>
    );
  }

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

  const navItems = [
    { href: "/dashboard", label: t("navigation.dashboard"), icon: "dashboard" },
    { href: "/missions", label: t("navigation.missions"), icon: "explore" },
    { href: "/tutor", label: t("navigation.tutor"), icon: "smart_toy" },
    { href: "/progress", label: t("navigation.progress"), icon: "leaderboard" },
  ];

  return (
    <div className="min-h-screen flex flex-col font-body-md text-body-md antialiased selection:bg-primary-container selection:text-on-primary-container bg-background text-on-background pb-16 md:pb-0">
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-[#15151A]/80 backdrop-blur-md border-b border-[#2A2A32] flex justify-between items-center h-16 px-gutter max-w-container-max mx-auto">
        <div className="flex items-center gap-sm">
          <span className="text-headline-md font-headline-lg text-primary tracking-tight">
            Linguist AI
          </span>
          <div className="hidden md:flex items-center gap-xs text-on-surface-variant ml-md">
            <span
              className="material-symbols-outlined text-[#E8B339]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_fire_department
            </span>
            <span className="font-label-md text-label-md">
              {isLoading ? "-" : t("navigation.day_streak", { count: gamification?.current_streak || 0 })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-md">
          {/* Global AI Tutor quick-access button */}
          <Link
            href="/tutor"
            className="hidden sm:flex items-center gap-xs bg-primary-container/20 text-primary hover:bg-primary-container/40 px-3 py-1.5 rounded-full transition-colors border border-primary/30"
          >
            <span
              className="material-symbols-outlined text-sm"
              style={{ fontSize: "18px" }}
            >
              smart_toy
            </span>
            <span className="font-label-sm text-label-sm font-semibold">
              {t("navigation.tutor")}
            </span>
          </Link>

          <div className="flex items-center gap-xs text-on-surface-variant">
            <span className="material-symbols-outlined">military_tech</span>
            <span className="font-label-md text-label-md">
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

          <div className="flex gap-2 mx-2">
            <Link href={pathname} locale="en" className={`text-sm ${params?.locale === 'en' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}>EN</Link>
            <Link href={pathname} locale="ru" className={`text-sm ${params?.locale === 'ru' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}>RU</Link>
            <Link href={pathname} locale="tg" className={`text-sm ${params?.locale === 'tg' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}>TG</Link>
          </div>

          {/* Logout button */}
          <button
            onClick={() => {
              dispatch(logout());
              router.replace("/login");
            }}
            className="p-xs text-on-surface-variant hover:text-error transition-colors duration-200 rounded-full hover:bg-surface-container-high focus:outline-none cursor-pointer flex items-center justify-center mr-xs"
            title="Logout"
          >
            <span
              className="material-symbols-outlined block"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              logout
            </span>
          </button>

          <div className="w-8 h-8 rounded-full border border-[#2A2A32] bg-surface-container-high flex items-center justify-center overflow-hidden">
            <span className="material-symbols-outlined text-on-surface-variant">
              person
            </span>
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="flex flex-1 pt-16">
        {/* SideNavBar (Desktop) */}
        <aside className="hidden md:flex flex-col py-lg px-sm fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-surface-container-lowest border-r border-[#2A2A32]">
          <div className="mb-lg px-xs">
            <h2 className="text-headline-sm font-headline-sm text-primary">
              Linguist AI
            </h2>
            <p className="text-label-md font-label-md text-on-surface-variant mt-base">
              {t("navigation.mastery_level", { level: isLoading ? "-" : (gamification?.current_game_level || 1) })}
            </p>
          </div>
          <nav className="flex flex-col gap-base flex-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-sm px-sm py-xs rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-surface-container-high text-primary font-bold border-l-2 border-primary"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className="text-label-md font-label-md">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
          <button className="w-full py-xs px-sm bg-primary-container text-on-primary-container rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity cursor-pointer">
            {t("navigation.start_lesson")}
          </button>
        </aside>

        {/* Canvas wrapper that pushes content past the fixed sidebar on desktop */}
        <div className="flex-1 md:pl-64 w-full">
          <main className="max-w-[1000px] mx-auto w-full pb-16">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 bg-[#15151A]/90 backdrop-blur-md border-t border-[#2A2A32] flex justify-around items-center h-16 pb-safe">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
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

      {/* Bottom Progress Bar Footer (Desktop Only) */}
      <footer className="hidden md:flex fixed left-[256px] bottom-0 w-[calc(100%-256px)] bg-[#15151A] border-t border-[#2A2A32] z-40 md:pl-64">
        <div className="max-w-[1000px] w-full mx-auto px-gutter py-sm flex items-center gap-md">
          <span className="text-label-md font-label-md text-on-surface-variant whitespace-nowrap">
            {t("level")} {gamification?.current_game_level || 1}
          </span>
          <div className="flex-1 h-1 bg-[#1C1C24] rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-container rounded-full"
              style={{ width: "30%" }}
            ></div>
          </div>
          <span className="text-label-md font-label-md text-on-surface whitespace-nowrap">
            {t("level")} {(gamification?.current_game_level || 1) + 1}
          </span>
        </div>
      </footer>
    </div>
  );
}

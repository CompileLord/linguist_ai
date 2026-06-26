"use client";

import { ReactNode, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useGetGamificationStatsQuery } from "@/services/dashboardApi";
import { useTranslations } from "next-intl";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const t = useTranslations("Dashboard");
  const { data: gamification, isLoading } = useGetGamificationStatsQuery();

  const navItems = [
    { href: "/dashboard", label: t("navigation.dashboard"), icon: "dashboard" },
    { href: "/missions", label: t("navigation.missions"), icon: "explore" },
    { href: "/tutor", label: t("navigation.tutor"), icon: "smart_toy" },
    { href: "/progress", label: t("navigation.progress"), icon: "leaderboard" },
  ];

  return (
    <div className="min-h-screen flex flex-col font-body-md text-body-md antialiased selection:bg-primary-container selection:text-on-primary-container bg-background text-on-background">
      {/* TopNavBar */}
      {/* Main Layout */}
      <div className="flex flex-1 pt-4">
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

        {/* Mobile Drawer (Sidebar) */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Dark Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Sidebar Panel */}
            <aside className="fixed top-0 left-0 h-full w-64 bg-[#15151A] border-r border-[#2A2A32] p-sm flex flex-col gap-md z-50">
              <div className="flex justify-between items-center px-xs pt-xs">
                <div>
                  <h2 className="text-headline-sm font-headline-sm text-primary">
                    Linguist AI
                  </h2>
                  <p className="text-label-md font-label-md text-on-surface-variant mt-base">
                    {t("navigation.mastery_level", { level: isLoading ? "-" : (gamification?.current_game_level || 1) })}
                  </p>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-xs text-on-surface-variant hover:text-on-surface focus:outline-none cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <nav className="flex flex-col gap-base flex-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-sm px-sm py-xs rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-surface-container-high text-primary font-bold border-l-2 border-primary"
                          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                      }`}
                    >
                      <span className="material-symbols-outlined">
                        {item.icon}
                      </span>
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
          </div>
        )}

        {/* Canvas wrapper that pushes content past the fixed sidebar on desktop */}
        <div className="flex-1 md:pl-1 w-full">
          <main className="p-gutter md:p-xl max-w-[1000px] mx-auto w-full pb-24">
            {children}
          </main>
        </div>
      </div>
      {/* Bottom Progress Bar Footer */}
      <footer className="fixed left-[256px] bottom-0 w-[calc(100%-256px)] bg-[#15151A] border-t border-[#2A2A32] z-40 md:pl-64">
        <div className="max-w-[1000px] mx-auto px-gutter py-sm flex items-center gap-md">
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

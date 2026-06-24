"use client";

import { ReactNode, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isOnboarding = pathname.startsWith("/onboarding");

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
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/missions", label: "Missions", icon: "explore" },
    { href: "/tutor", label: "Tutor", icon: "smart_toy" },
    { href: "/progress", label: "Progress", icon: "leaderboard" },
  ];

  return (
    <div className="min-h-screen flex flex-col font-body-md text-body-md antialiased selection:bg-primary-container selection:text-on-primary-container bg-background text-on-background">
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-[#15151A]/80 backdrop-blur-md border-b border-[#2A2A32] flex justify-between items-center h-16 px-gutter max-w-container-max mx-auto">
        <div className="flex items-center gap-sm">
          {/* Mobile hamburger menu */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-xs text-on-surface-variant hover:text-on-surface focus:outline-none cursor-pointer"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
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
            <span className="font-label-md text-label-md">7 Day Streak</span>
          </div>
        </div>
        <div className="flex items-center gap-md">
          <div className="hidden md:flex items-center gap-xs text-on-surface-variant">
            <span className="material-symbols-outlined">military_tech</span>
            <span className="font-label-md text-label-md">1,250 XP</span>
          </div>
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
              Mastery Level 4
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
            Start Lesson
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
                    Mastery Level 4
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
                Start Lesson
              </button>
            </aside>
          </div>
        )}

        {/* Canvas wrapper that pushes content past the fixed sidebar on desktop */}
        <div className="flex-1 md:pl-64 w-full">
          <main className="max-w-[1000px] mx-auto w-full pb-16">
            {children}
          </main>
        </div>
      </div>
      {/* Bottom Progress Bar Footer */}
      <footer className="fixed left-[256px] bottom-0 w-[calc(100%-256px)] bg-[#15151A] border-t border-[#2A2A32] z-40 md:pl-64">
        <div className="max-w-[1000px] mx-auto px-gutter py-sm flex items-center gap-md">
          <span className="text-label-md font-label-md text-on-surface-variant whitespace-nowrap">
            Level 4
          </span>
          <div className="flex-1 h-1 bg-[#1C1C24] rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-container rounded-full"
              style={{ width: "30%" }}
            ></div>
          </div>
          <span className="text-label-md font-label-md text-on-surface whitespace-nowrap">
            Level 5
          </span>
        </div>
      </footer>
    </div>
  );
}

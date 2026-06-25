import { ReactNode } from "react";

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md antialiased selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden relative">
      <main className="flex-1 flex flex-col items-center justify-center pt-xl pb-xl px-md mt-16 relative w-full max-w-[800px]    z-10">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
          <div className="w-64 h-64 bg-primary-container rounded-full opacity-10 blur-3xl transform scale-150"></div>
        </div>
        {children}
      </main>
    </div>
  );
}

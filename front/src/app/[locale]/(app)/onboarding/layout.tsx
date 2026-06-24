import { ReactNode } from "react";

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md antialiased selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden relative">
      {/* here */}
      {/* <header className="bg-surface fixed top-[100px] left-0 w-full z-50 border-b border-outline-variant">
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
      </header> */}

      <main className="flex-1 flex flex-col items-center justify-center pt-xl pb-xl px-md mt-16 relative w-full max-w-[800px] mx-auto z-10">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
          <div className="w-64 h-64 bg-primary-container rounded-full opacity-10 blur-3xl transform scale-150"></div>
        </div>
        {children}
      </main>
    </div>
  );
}

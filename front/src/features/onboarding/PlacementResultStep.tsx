import { useTranslations } from "next-intl";
import { useGetPlacementResultQuery } from "@/services/onboardingApi";

interface Props {
  onNext: () => void;
}

export function PlacementResultStep({ onNext }: Props) {
  const t = useTranslations("Onboarding.PlacementResult");
  const { data: result, isLoading } = useGetPlacementResultQuery();

  if (isLoading || !result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-lg animate-pulse">Loading result...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center w-full mx-auto space-y-lg animate-[fadeIn_1s_ease-out_forwards]">
      <div className="relative flex items-center justify-center py-lg w-full">
        <div className="absolute w-40 h-40 bg-primary-container rounded-full opacity-20 blur-2xl z-0"></div>
        <h1
          className="font-display text-display font-bold text-on-surface relative z-10 tracking-tighter"
          style={{ fontSize: "8rem", lineHeight: "1" }}
        >
          {result.final_level}
        </h1>
      </div>

      <div className="space-y-sm px-sm z-10 max-w-[500px]">
        <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
          {result.level_description}
        </p>
      </div>

      <div className="flex items-center justify-center gap-md font-body-sm text-body-sm text-outline z-10">
        <div className="flex items-center gap-xs">
          <span
            className="material-symbols-outlined text-[16px]"
            style={{
              fontVariationSettings:
                "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
            }}
          >
            check_circle
          </span>
          <span>Correct: {result.correct_count} / {result.questions_answered}</span>
        </div>
        <div className="w-1 h-1 bg-outline-variant rounded-full"></div>
        <div className="flex items-center gap-xs">
          <span
            className="material-symbols-outlined text-[16px]"
            style={{
              fontVariationSettings:
                "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
            }}
          >
            done_all
          </span>
          <span>{t("accuracy")} {(result.accuracy * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="pt-md w-full flex justify-center z-10">
        <button
          onClick={onNext}
          className="bg-primary-container text-on-primary-container font-label-md text-label-md px-lg py-[12px] rounded-lg transition-all duration-200 hover:bg-inverse-primary border border-transparent focus:border-primary focus:ring-4 focus:ring-primary/20 shadow-[0_0_15px_rgba(139,124,255,0.1)] hover:shadow-[0_0_20px_rgba(139,124,255,0.2)]"
        >
          {t("continue")}
        </button>
      </div>
    </div>
  );
}


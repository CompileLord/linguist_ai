import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

interface Props {
  onComplete: (level: string) => void;
  onBack: () => void;
}

export function SelfLevelSelectionStep({ onComplete, onBack }: Props) {
  const t = useTranslations("Onboarding.SelfLevelSelection");
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const levels = [
    { id: "A1", title: t("levels.a1_title"), desc: t("levels.a1_desc") },
    { id: "A2", title: t("levels.a2_title"), desc: t("levels.a2_desc") },
    { id: "B1", title: t("levels.b1_title"), desc: t("levels.b1_desc") },
    { id: "B2", title: t("levels.b2_title"), desc: t("levels.b2_desc") },
    { id: "C1", title: t("levels.c1_title"), desc: t("levels.c1_desc") },
    { id: "C2", title: t("levels.c2_title"), desc: t("levels.c2_desc") },
  ];

  return (
    <div className="w-full max-w-[640px] flex flex-col gap-lg text-center px-md">
      <div>
        <h1 className="font-display text-display text-on-surface mb-xs">
          {t("title")}
        </h1>
        <p className="font-body-lg text-on-surface-variant max-w-[480px] mx-auto">
          {t("description")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-sm text-left">
        {levels.map((lvl) => {
          const isSelected = selectedLevel === lvl.id;
          return (
            <button
              key={lvl.id}
              onClick={() => setSelectedLevel(lvl.id)}
              className={`p-sm flex flex-col gap-2xs bg-[#15151A] border rounded-[10px] text-left transition-all duration-200 group hover:bg-[#1C1C24] ${
                isSelected
                  ? "border-primary-container bg-[#1E1E24] shadow-[0_0_12px_rgba(139,124,255,0.15)]"
                  : "border-[#2A2A32] hover:border-primary-container/60"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span
                  className={`text-headline-sm font-headline-sm transition-colors ${
                    isSelected ? "text-primary" : "text-on-surface"
                  }`}
                >
                  {lvl.title}
                </span>
                <span
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected
                      ? "border-primary bg-primary-container/20 text-primary"
                      : "border-outline-variant group-hover:border-primary-container/60"
                  }`}
                >
                  {isSelected && (
                    <span
                      className="material-symbols-outlined text-[14px]"
                      style={{ fontVariationSettings: "'wght' 700" }}
                    >
                      check
                    </span>
                  )}
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant opacity-85 leading-relaxed">
                {lvl.desc}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-sm items-center mt-md w-full max-w-[320px] mx-auto">
        <Button
          variant="primary"
          onClick={() => selectedLevel && onComplete(selectedLevel)}
          disabled={!selectedLevel}
          className="w-full"
        >
          {t("continue")}
        </Button>
        <button
          onClick={onBack}
          className="font-label-md text-label-md text-[#62626C] hover:text-on-surface transition-colors cursor-pointer"
        >
          {t("back")}
        </button>
      </div>
    </div>
  );
}

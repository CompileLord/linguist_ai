import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";

interface Props {
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export function PlacementSelectionStep({ onNext, onSkip, onBack }: Props) {
  const t = useTranslations("Onboarding.PlacementSelection");

  return (
    <div className="w-full max-w-[480px] flex flex-col gap-lg text-center px-sm sm:px-0">
      <h1 className="font-display text-display text-on-surface">
        {t("title")}
      </h1>
      <p className="font-body-lg text-on-surface-variant">{t("description")}</p>

      <div className="flex flex-col gap-sm">
        <Button variant="primary" onClick={onNext} className="w-full">
          {t("take_test")}
        </Button>
        <Button variant="outline" onClick={onSkip} className="w-full">
          {t("skip")}
        </Button>
      </div>

      <button
        onClick={onBack}
        className="font-label-md text-label-md text-[#62626C] hover:text-on-surface pt-md"
      >
        {t("back")}
      </button>
    </div>
  );
}

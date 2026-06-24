import { useState } from "react";
import { useUpdateGoalsMutation } from "@/services/onboardingApi";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface Props {
  onBack: () => void;
}

export function GoalSelectionStep({ onBack }: Props) {
  const router = useRouter();
  const t = useTranslations("Onboarding.GoalSelection");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [updateGoals, { isLoading }] = useUpdateGoalsMutation();

  const goals = [
    { id: 'travel', icon: 'flight_takeoff', span: true },
    { id: 'work', icon: 'work', span: false },
    { id: 'programming', icon: 'terminal', span: false },
    { id: 'business', icon: 'domain', span: false },
    { id: 'ielts', icon: 'school', span: false },
    { id: 'toefl', icon: 'description', span: false },
    { id: 'school', icon: 'local_library', span: true },
    { id: 'university', icon: 'account_balance', span: true },
    { id: 'daily_communication', icon: 'chat', span: false },
  ];

  const handleToggle = (id: string) => {
    setSelectedGoals(prev => {
      if (prev.includes(id)) {
        return prev.filter(g => g !== id);
      }
      if (prev.length < 3) {
        return [...prev, id];
      }
      return prev;
    });
  };

  const handleContinue = async () => {
    if (selectedGoals.length === 0) return;
    try {
      await updateGoals(selectedGoals).unwrap();
      // Assume routing to dashboard on success
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
    }
  };


  return (
    <div className="max-w-[800px] w-full mx-auto flex flex-col items-center p-md">
      <div className="text-center mb-xl w-full">
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">{t("title")}</h1>
        <p className="font-body-md text-body-md text-[#9A9AA5]">{t("subtitle")}</p>
      </div>

      <div className="bento-grid mb-xl">
        {goals.map((goal) => {
          const isSelected = selectedGoals.includes(goal.id);
          return (
            <div
              key={goal.id}
              onClick={() => handleToggle(goal.id)}
              className={`goal-card ${goal.span ? "goal-card-span-2" : ""} ${isSelected ? "selected" : ""}`}
            >
              <span
                className="material-symbols-outlined icon-container"
                style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
              >
                {goal.icon}
              </span>
              <span className="font-label-md text-label-md text-on-surface">
                {t(`goals.${goal.id}`)}
              </span>
            </div>
          );
        })}
      </div>


      <div className="w-full flex flex-col items-center mt-auto md:mt-0 gap-md">
        <button
          disabled={selectedGoals.length === 0 || isLoading}
          onClick={handleContinue}
          className={`font-label-md text-label-md px-xl py-sm rounded-lg border transition-colors duration-200 w-full md:w-auto min-w-[200px]
            ${selectedGoals.length > 0
              ? 'bg-primary-container text-white border-transparent hover:opacity-90'
              : 'bg-surface-container-highest text-on-surface-variant border-[#2A2A32]'
            }`}
        >
          {isLoading ? t("saving") : t("continue")}
        </button>
        <button onClick={onBack} className="font-label-md text-label-md text-[#62626C] hover:text-on-surface">{t("back")}</button>
      </div>
    </div>
  );
}

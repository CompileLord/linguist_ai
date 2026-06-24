"use client";

import { useState, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { LanguageSetupStep } from "@/features/onboarding/LanguageSetupStep";
import { PlacementSelectionStep } from "@/features/onboarding/PlacementSelectionStep";
import { DiagnosticTestStep } from "@/features/onboarding/DiagnosticTestStep";
import { PlacementResultStep } from "@/features/onboarding/PlacementResultStep";
import { GoalSelectionStep } from "@/features/onboarding/GoalSelectionStep";

export type OnboardingStep =
  | "language"
  | "selection"
  | "diagnostic"
  | "result"
  | "goals";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStep =
    (searchParams.get("step") as OnboardingStep) || "language";
  const [direction, setDirection] = useState(1);

  const goToStep = (step: OnboardingStep, dir = 1) => {
    setDirection(dir);
    router.push(`/onboarding?step=${step}`);
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  const renderStep = () => {
    switch (currentStep) {
      case "language":
        return (
          <LanguageSetupStep
            onNext={() => goToStep("selection", 1)}
            onBack={() => router.push("/register")}
          />
        );
      case "selection":
        return (
          <PlacementSelectionStep
            onNext={() => goToStep("diagnostic", 1)}
            onSkip={() => goToStep("goals", 1)}
            onBack={() => goToStep("language", -1)}
          />
        );
      // here
      case "diagnostic":
        return (
          <DiagnosticTestStep
            onComplete={() => goToStep("result", 1)}
            onSkip={() => goToStep("goals", 1)}
          />
        );
      case "result":
        return <PlacementResultStep onNext={() => goToStep("goals", 1)} />;
      case "goals":
        return <GoalSelectionStep onBack={() => goToStep("result", -1)} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full relative overflow-hidden flex flex-col items-center min-h-[500px]">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="w-full flex-1 flex flex-col justify-center items-center"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-on-surface">
          <div className="text-lg">Loading onboarding...</div>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}

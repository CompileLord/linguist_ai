"use client";

import { useState, Suspense, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "@/i18n/navigation";
import { useGetProfileQuery } from "@/services/onboardingApi";
import { useSearchParams } from "next/navigation";
import { LanguageSetupStep } from "@/features/onboarding/LanguageSetupStep";
import { PlacementSelectionStep } from "@/features/onboarding/PlacementSelectionStep";
import { DiagnosticTestStep } from "@/features/onboarding/DiagnosticTestStep";
import { PlacementResultStep } from "@/features/onboarding/PlacementResultStep";
import { SelfLevelSelectionStep } from "@/features/onboarding/SelfLevelSelectionStep";
import { GoalSelectionStep } from "@/features/onboarding/GoalSelectionStep";

export type OnboardingStep =
  | "language"
  | "selection"
  | "diagnostic"
  | "result"
  | "self-select"
  | "goals";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStep =
    (searchParams.get("step") as OnboardingStep) || "language";
  const [direction, setDirection] = useState(1);

  const { data: profile } = useGetProfileQuery();

  useEffect(() => {
    if (profile?.onboarding_completed) {
      router.replace("/dashboard");
    }
  }, [profile, router]);

  const prevStep = searchParams.get("prev") as OnboardingStep | null;

  const goToStep = (step: OnboardingStep, dir = 1, prev?: OnboardingStep) => {
    setDirection(dir);
    const params = new URLSearchParams({ step });
    if (prev) params.set("prev", prev);
    router.push(`/onboarding?${params.toString()}`);
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
            onSkip={() => goToStep("self-select", 1)}
            onBack={() => goToStep("language", -1)}
          />
        );
      case "diagnostic":
        return (
          <DiagnosticTestStep
            onComplete={() => goToStep("result", 1)}
            onSkip={() => goToStep("self-select", 1)}
          />
        );
      case "result":
        return <PlacementResultStep onNext={() => goToStep("goals", 1, "result")} />;
      case "self-select":
        return (
          <SelfLevelSelectionStep
            onComplete={() => goToStep("goals", 1, "self-select")}
            onBack={() => goToStep("selection", -1)}
          />
        );
      case "goals":
        return (
          <GoalSelectionStep
            onBack={() => goToStep(prevStep ?? "self-select", -1)}
          />
        );
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

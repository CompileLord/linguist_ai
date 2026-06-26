import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { useStartPlacementTestMutation, useAnswerPlacementQuestionMutation } from "@/services/onboardingApi";

interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

export function DiagnosticTestStep({ onComplete, onSkip }: Props) {
  const t = useTranslations("Onboarding.DiagnosticTest");
  
  const [startPlacement, { isLoading: isStarting }] = useStartPlacementTestMutation();
  const [answerQuestion, { isLoading: isAnswering }] = useAnswerPlacementQuestionMutation();

  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [questionCount, setQuestionCount] = useState(1);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [stepResult, setStepResult] = useState<any>(null);

  useEffect(() => {
    startPlacement()
      .unwrap()
      .then((q) => {
        setCurrentQuestion(q);
      })
      .catch((err) => {
        console.error("Failed to start placement test:", err);
      });
  }, [startPlacement]);

  const handleSelect = (index: number) => {
    if (isChecked) return; // Prevent changing answer after check
    setSelectedOption(index);
  };

  const handleCheck = async () => {
    if (selectedOption === null || currentQuestion === null) return;
    try {
      const res = await answerQuestion({ answer_index: selectedOption }).unwrap();
      setStepResult(res);
      setIsChecked(true);
    } catch (err) {
      console.error("Failed to answer question:", err);
    }
  };

  const handleNext = () => {
    if (stepResult && stepResult.next_question) {
      setCurrentQuestion(stepResult.next_question);
      setSelectedOption(null);
      setIsChecked(false);
      setStepResult(null);
      setQuestionCount((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  if (isStarting || !currentQuestion) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <div className="text-lg animate-pulse">{t("loading")}</div>
      </div>
    );
  }

  const isCorrect = stepResult?.is_correct;

  // Format question text with the blank
  const textParts = currentQuestion.question_text.split("_____");
  const formattedText =
    textParts.length > 1 ? (
      <>
        {textParts[0]}
        <span className="text-primary-container border-b-2 border-primary-container inline-block w-32 translate-y-2 opacity-50"></span>
        {textParts[1]}
      </>
    ) : (
      currentQuestion.question_text
    );

  const letters = ["A", "B", "C", "D"];

  return (
    <div className="flex-grow flex flex-col items-center justify-start pt-md pb-md md:pt-lg md:pb-xl px-sm sm:px-lg max-w-[800px] w-full overflow-hidden">
      {/* Progress Indicator */}
      <div className="w-full flex justify-between items-center mb-md md:mb-xl max-w-[480px]">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-sm flex-1 mx-[2px] ${i < questionCount ? "bg-primary-container" : "bg-[#2A2A32]"}`}
          ></div>
        ))}
      </div>

      <div className="w-full flex-grow flex flex-col items-center justify-start max-w-[480px] relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={questionCount}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="w-full flex flex-col items-center justify-start"
          >
            <div className="w-full text-center mb-md md:mb-lg">
              <h1 className="font-display text-headline-lg md:text-display text-on-surface tracking-tight leading-tight">
                {formattedText}
              </h1>
            </div>

            {/* Answer Options */}
            <div className="w-full flex flex-col gap-sm">
              {currentQuestion.options.map((opt: string, idx: number) => {
                const isSelected = selectedOption === idx;
                const isCorrectOption = idx === currentQuestion.correct_answer_index;
                
                let cardStyle = "border-[#2A2A32] hover:border-primary-container hover:bg-[#1E1E24]";
                let circleStyle = "border-outline-variant text-on-surface-variant group-hover:border-primary-container group-hover:text-primary-container";

                if (isChecked) {
                  if (isCorrectOption) {
                    cardStyle = "border-[#34A853] bg-[#1A2E20]";
                    circleStyle = "border-[#34A853] text-[#34A853] bg-[#34A853]/10";
                  } else if (isSelected) {
                    cardStyle = "border-[#EA4335] bg-[#2E1A1A]";
                    circleStyle = "border-[#EA4335] text-[#EA4335] bg-[#EA4335]/10";
                  } else {
                    cardStyle = "border-[#2A2A32] opacity-40";
                    circleStyle = "border-outline-variant text-on-surface-variant";
                  }
                } else if (isSelected) {
                  cardStyle = "border-primary-container bg-[#1E1E24]";
                  circleStyle = "border-primary-container text-primary-container bg-primary-container/10";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    disabled={isChecked || isAnswering}
                    className={`p-sm text-left flex items-center gap-sm group bg-[#15151A] border rounded-[10px] transition-all duration-200 ${cardStyle}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center text-label-md font-label-md transition-colors ${circleStyle}`}
                    >
                      {letters[idx]}
                    </div>
                    <span className="font-body-lg text-body-lg text-on-surface">
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Explanation / Reasoning Box */}
            {isChecked && (
              <div
                className={`w-full mt-md p-md rounded-[10px] border text-left transition-all duration-300
                  ${isCorrect 
                    ? "bg-[#1A2E20]/30 border-[#34A853]/40 text-[#a3e2b7]" 
                    : "bg-[#2E1A1A]/30 border-[#EA4335]/40 text-[#f5b8b5]"
                  }`}
              >
                <h4 className="font-bold text-base mb-xs flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[20px]">
                    {isCorrect ? "check_circle" : "cancel"}
                  </span>
                  {isCorrect ? "Correct!" : "Incorrect"}
                </h4>
                <p className="font-body-sm text-body-sm opacity-90 leading-relaxed">
                  {stepResult.explanation}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Check / Next / Skip Actions */}
        <div className="mt-lg w-full flex flex-col gap-sm items-center z-10">
          {!isChecked ? (
            <button
              onClick={handleCheck}
              disabled={selectedOption === null || isAnswering}
              className={`font-label-md text-label-md px-xl py-sm rounded-lg border transition-colors duration-200 w-full
                ${selectedOption !== null && !isAnswering
                  ? 'bg-primary-container text-white border-transparent hover:opacity-90 cursor-pointer'
                  : 'bg-surface-container-highest text-on-surface-variant border-[#2A2A32] cursor-not-allowed opacity-55'
                }`}
            >
              {isAnswering ? t("loading") : t("check")}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="bg-primary-container text-white border-transparent hover:opacity-90 font-label-md text-label-md px-xl py-sm rounded-lg border transition-colors duration-200 w-full cursor-pointer"
            >
              {t("next")}
            </button>
          )}

          {!isChecked && (
            <button
              onClick={onSkip}
              disabled={isAnswering}
              className="font-label-md text-label-md text-[#62626C] hover:text-on-surface transition-colors duration-200 px-md py-sm cursor-pointer disabled:opacity-50"
            >
              {t("skip")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


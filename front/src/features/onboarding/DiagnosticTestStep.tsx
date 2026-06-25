import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

const QUESTIONS = [
  {
    id: "q1",
    text: "I _____ to the store yesterday.",
    options: ["go", "went", "gone", "going"],
    correctIndex: 1,
    reasoning: '"Yesterday" indicates a completed action in the past, which requires the Past Simple tense ("went").'
  },
  {
    id: "q2",
    text: "She _____ English for five years before she moved to London.",
    options: ["studies", "is studying", "had been studying", "has studied"],
    correctIndex: 2,
    reasoning: 'The Past Perfect Continuous ("had been studying") is used to emphasize the duration of an action that was completed before another action in the past.'
  },
  {
    id: "q3",
    text: "If it _____ tomorrow, we will cancel the picnic.",
    options: ["rains", "will rain", "rained", "is raining"],
    correctIndex: 0,
    reasoning: 'In a first conditional sentence, the "if" clause uses the Present Simple tense ("rains") to refer to a future possibility.'
  },
  {
    id: "q4",
    text: "By this time next year, I _____ my degree.",
    options: ["will finish", "will have finished", "am finishing", "have finished"],
    correctIndex: 1,
    reasoning: 'The Future Perfect tense ("will have finished") is used to describe an action that will be completed by a specific time in the future.'
  },
  {
    id: "q5",
    text: "I wish I _____ harder when I was at university.",
    options: ["study", "studied", "have studied", "had studied"],
    correctIndex: 3,
    reasoning: 'To express regret about a past situation, "wish" is followed by the Past Perfect tense ("had studied").'
  },
  {
    id: "q6",
    text: "The meeting _____ by the time he arrived.",
    options: ["already started", "had already started", "has already started", "starts"],
    correctIndex: 1,
    reasoning: 'When two past actions are related, the earlier action uses the Past Perfect tense ("had already started").'
  },
  {
    id: "q7",
    text: "Neither the teacher nor the students _____ present at the meeting.",
    options: ["was", "were", "is", "are"],
    correctIndex: 1,
    reasoning: 'When two subjects are joined by "neither/nor", the verb agrees with the subject closer to it ("students" is plural, so we use "were").'
  },
  {
    id: "q8",
    text: "He suggested _____ to the museum instead of the zoo.",
    options: ["to go", "go", "going", "for going"],
    correctIndex: 2,
    reasoning: 'The verb "suggest" is followed by a gerund ("going") when it does not have a direct noun/pronoun object.'
  },
  {
    id: "q9",
    text: "I look forward to _____ from you soon.",
    options: ["hearing", "hear", "to hear", "heard"],
    correctIndex: 0,
    reasoning: 'The phrase "look forward to" requires a gerund ("hearing") because "to" acts as a preposition in this idiom.'
  },
  {
    id: "q10",
    text: "This is the house _____ Jack built.",
    options: ["who", "whom", "whose", "that"],
    correctIndex: 3,
    reasoning: 'The relative pronoun "that" is used to refer to a thing ("the house") that is the object of the relative clause.'
  }
];

export function DiagnosticTestStep({ onComplete, onSkip }: Props) {
  const t = useTranslations("Onboarding.DiagnosticTest");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isChecked, setIsChecked] = useState(false);

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const isCorrect = selectedOption === currentQuestion.correctIndex;

  const handleSelect = (index: number) => {
    if (isChecked) return; // Prevent changing answer after check
    setSelectedOption(index);
  };

  const handleCheck = () => {
    if (selectedOption === null) return;
    setIsChecked(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setSelectedOption(null);
      setIsChecked(false);
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  // Format question text with the blank
  const textParts = currentQuestion.text.split("_____");
  const formattedText =
    textParts.length > 1 ? (
      <>
        {textParts[0]}
        <span className="text-primary-container border-b-2 border-primary-container inline-block w-32 translate-y-2 opacity-50"></span>
        {textParts[1]}
      </>
    ) : (
      currentQuestion.text
    );

  const letters = ["A", "B", "C", "D"];

  return (
    <div className="flex-grow flex flex-col items-center justify-start pt-lg pb-xl px-md sm:px-lg max-w-[800px] w-full overflow-hidden">
      {/* Progress Indicator */}
      <div className="w-full flex justify-between items-center mb-xl max-w-[480px]">
        {QUESTIONS.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-sm flex-1 mx-[2px] ${i <= currentQuestionIndex ? "bg-primary-container" : "bg-[#2A2A32]"}`}
          ></div>
        ))}
      </div>

      <div className="w-full flex-grow flex flex-col items-center justify-start max-w-[480px] relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="w-full flex flex-col items-center justify-start"
          >
            <div className="w-full text-center mb-lg">
              <h1 className="font-display text-display text-on-surface tracking-tight leading-tight">
                {formattedText}
              </h1>
            </div>

            {/* Answer Options */}
            <div className="w-full flex flex-col gap-sm">
              {currentQuestion.options.map((opt: string, idx: number) => {
                const isSelected = selectedOption === idx;
                const isCorrectOption = idx === currentQuestion.correctIndex;
                
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
                    disabled={isChecked}
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
                  {currentQuestion.reasoning}
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
              disabled={selectedOption === null}
              className={`font-label-md text-label-md px-xl py-sm rounded-lg border transition-colors duration-200 w-full
                ${selectedOption !== null
                  ? 'bg-primary-container text-white border-transparent hover:opacity-90 cursor-pointer'
                  : 'bg-surface-container-highest text-on-surface-variant border-[#2A2A32] cursor-not-allowed opacity-55'
                }`}
            >
              {t("check")}
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
              className="font-label-md text-label-md text-[#62626C] hover:text-on-surface transition-colors duration-200 px-md py-sm cursor-pointer"
            >
              {t("skip")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

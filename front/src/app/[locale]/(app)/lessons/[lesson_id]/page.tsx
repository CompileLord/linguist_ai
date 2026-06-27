"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetLessonByIdQuery,
  useCompleteLessonMutation,
  LessonExercise,
  LessonTestQuestion,
} from "@/services/lessonApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function LessonDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("Lessons");
  
  const lessonId = params.lesson_id as string;
  const { data: lesson, isLoading, error } = useGetLessonByIdQuery(lessonId);
  const [completeLesson, { isLoading: isSubmitting }] = useCompleteLessonMutation();

  // Navigation steps
  // 0: Theory, 1: Vocabulary, 2: Exercises, 3: Quiz/Test, 4: Summary/Success
  const [step, setStep] = useState(0);

  // Audio refs to prevent overlap
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingTheoryAudio, setIsPlayingTheoryAudio] = useState(false);
  const [playingVocabIndex, setPlayingVocabIndex] = useState<number | null>(null);

  // Exercises states
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [selectedExAnswer, setSelectedExAnswer] = useState<string>("");
  const [exChecked, setExChecked] = useState(false);
  const [exCorrect, setExCorrect] = useState<boolean | null>(null);
  const [exerciseAnswers, setExerciseAnswers] = useState<string[]>([]);
  const [exerciseCorrectCount, setExerciseCorrectCount] = useState(0);

  // Quiz/Test states
  const [testIndex, setTestIndex] = useState(0);
  const [selectedTestAnswer, setSelectedTestAnswer] = useState<number | null>(null);
  const [testAnswers, setTestAnswers] = useState<number[]>([]);
  const [testCorrectCount, setTestCorrectCount] = useState(0);

  // Timing
  const [timeStarted] = useState<number>(Date.now());
  const [completionData, setCompletionData] = useState<any>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-md">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-on-surface-variant animate-pulse">{t("loading")}</div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-md text-center">
        <span className="material-symbols-outlined text-error text-5xl">error</span>
        <h2 className="text-headline-md font-bold text-on-surface">Failed to load lesson</h2>
        <p className="text-on-surface-variant max-w-sm">
          Please check your connection or return to the dashboard.
        </p>
        <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  const { content } = lesson;
  const theory = content.theory;
  const examples = content.examples || [];
  const vocabulary = content.vocabulary || [];
  const exercises = content.exercises || [];
  const quiz = content.test || [];

  // Audio helper
  const handlePlayAudio = (url: string, type: "theory" | "vocab", index?: number) => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
      setIsPlayingTheoryAudio(false);
      setPlayingVocabIndex(null);
    }

    const audio = new Audio(url);
    activeAudioRef.current = audio;

    if (type === "theory") {
      setIsPlayingTheoryAudio(true);
    } else if (type === "vocab" && typeof index === "number") {
      setPlayingVocabIndex(index);
    }

    audio.play().catch((err) => {
      console.error("Audio playback error:", err);
      setIsPlayingTheoryAudio(false);
      setPlayingVocabIndex(null);
    });

    audio.onended = () => {
      setIsPlayingTheoryAudio(false);
      setPlayingVocabIndex(null);
    };
  };

  // Step calculations for progress bar
  const totalSteps = 4; // Theory, Vocabulary, Exercises, Quiz
  const progressPercent = ((step + 1) / totalSteps) * 100;

  // Exercises actions
  const currentExercise: LessonExercise | undefined = exercises[exerciseIndex];

  const handleSelectExOption = (option: string) => {
    if (exChecked) return;
    setSelectedExAnswer(option);
  };

  const handleCheckExercise = () => {
    if (!selectedExAnswer || !currentExercise) return;

    const isAnswerCorrect =
      selectedExAnswer.trim().toLowerCase() ===
      currentExercise.correct_answer.trim().toLowerCase();

    setExCorrect(isAnswerCorrect);
    setExChecked(true);

    if (isAnswerCorrect) {
      setExerciseCorrectCount((prev) => prev + 1);
    }
  };

  const handleNextExercise = () => {
    // Save current answer
    setExerciseAnswers((prev) => [...prev, selectedExAnswer]);

    if (exerciseIndex + 1 < exercises.length) {
      setExerciseIndex((prev) => prev + 1);
      setSelectedExAnswer("");
      setExChecked(false);
      setExCorrect(null);
    } else {
      // Transition to next module section
      setStep(3); // Go to Quiz
    }
  };

  // Quiz actions
  const currentQuizQuestion: LessonTestQuestion | undefined = quiz[testIndex];

  const handleSelectQuizOption = (optionIndex: number) => {
    setSelectedTestAnswer(optionIndex);
  };

  const handleNextQuizQuestion = async () => {
    if (selectedTestAnswer === null || !currentQuizQuestion) return;

    const isCorrect = selectedTestAnswer === currentQuizQuestion.correct_index;
    if (isCorrect) {
      setTestCorrectCount((prev) => prev + 1);
    }

    const updatedTestAnswers = [...testAnswers, selectedTestAnswer];
    setTestAnswers(updatedTestAnswers);

    if (testIndex + 1 < quiz.length) {
      setTestIndex((prev) => prev + 1);
      setSelectedTestAnswer(null);
    } else {
      // Finalize and submit lesson
      const timeSpent = Math.round((Date.now() - timeStarted) / 1000);
      try {
        const payload = {
          exercise_answers: [...exerciseAnswers, selectedExAnswer],
          test_answers: updatedTestAnswers,
          time_spent_seconds: timeSpent,
        };
        const response = await completeLesson({
          lessonId,
          body: payload,
        }).unwrap();
        setCompletionData(response);
        setStep(4); // Go to Summary/Complete
      } catch (err) {
        console.error("Failed to complete lesson:", err);
      }
    }
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-start w-full pb-12">
      {/* Top Header Progress Bar */}
      <div className="w-full h-1 bg-surface-container-high z-10 sticky top-16 shrink-0">
        <div
          className="h-full bg-primary progress-bar-fill"
          style={{ width: `${Math.min(progressPercent, 100)}%` }}
        ></div>
      </div>

      <div className="w-full max-w-[800px] mx-auto px-sm md:px-xl py-xl flex flex-col flex-grow">
        <AnimatePresence mode="wait">
          {/* Step 0: THEORY */}
          {step === 0 && (
            <motion.div
              key="theory"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-lg"
            >
              <div className="flex justify-between items-start border-b border-outline-variant pb-sm">
                <div>
                  <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">
                    {theory.title}
                  </h1>
                  <p className="text-on-surface-variant font-label-md text-sm uppercase tracking-wider">
                    {lesson.topic} • {lesson.cefr_level}
                  </p>
                </div>
                {lesson.audio_urls?.theory && (
                  <Button
                    onClick={() => handlePlayAudio(lesson.audio_urls!.theory!, "theory")}
                    className="flex items-center gap-xs"
                    variant="outline"
                  >
                    <span className="material-symbols-outlined">
                      {isPlayingTheoryAudio ? "pause" : "volume_up"}
                    </span>
                    {isPlayingTheoryAudio ? "Playing" : "Listen"}
                  </Button>
                )}
              </div>

              <div className="bg-surface-container border border-outline rounded-xl p-md flex flex-col gap-sm">
                <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">
                  {theory.explanation}
                </p>
                
                {theory.key_points && theory.key_points.length > 0 && (
                  <div className="mt-md flex flex-col gap-sm">
                    <h3 className="font-headline-md text-md text-primary font-bold">Key Points</h3>
                    <ul className="list-disc pl-md flex flex-col gap-xs text-on-surface-variant font-body-md">
                      {theory.key_points.map((point, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {theory.grammar_notes && (
                  <div className="mt-md p-sm bg-background/50 border-l-4 border-primary rounded-r-lg">
                    <span className="font-label-md text-xs text-primary uppercase font-bold tracking-wider">Grammar Notes</span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                      {theory.grammar_notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Example Sentences */}
              <div className="flex flex-col gap-sm mt-md">
                <h2 className="font-headline-md text-xl font-bold text-on-surface">Examples</h2>
                <div className="flex flex-col gap-sm">
                  {examples.map((ex, idx) => (
                    <div
                      key={idx}
                      className="group flex items-start gap-md py-sm border-b border-outline-variant last:border-0 hover:bg-surface-container transition-colors duration-200 px-sm -mx-sm rounded-lg"
                    >
                      <span
                        className="material-symbols-outlined text-primary mt-1 shrink-0"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        trip_origin
                      </span>
                      <div className="flex-1">
                        <p className="font-body-lg text-body-lg text-on-surface font-medium leading-relaxed">
                          {ex.source_text}
                        </p>
                        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                          {ex.translation}
                        </p>
                        {ex.context && (
                          <span className="inline-block mt-2 text-xs text-text-tertiary bg-surface-container-high px-2 py-0.5 rounded font-mono">
                            {ex.context}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next navigation action */}
              <div className="mt-lg">
                <Button
                  onClick={() => setStep(1)}
                  className="w-full py-3 flex items-center justify-center gap-xs text-md"
                >
                  {t("next")}
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 1: VOCABULARY */}
          {step === 1 && (
            <motion.div
              key="vocabulary"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-lg"
            >
              <div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">
                  Lesson Vocabulary
                </h1>
                <p className="text-on-surface-variant font-body-md">
                  Review new key words and listen to their pronunciation before moving on.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                {vocabulary.map((vocab, idx) => (
                  <Card key={idx} className="p-sm flex flex-col gap-xs hover:border-primary/40 transition-all duration-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-headline-md text-lg font-bold text-on-surface">
                          {vocab.word}
                        </h3>
                        {vocab.pronunciation && (
                          <span className="font-mono text-xs text-on-surface-variant font-normal">
                            {vocab.pronunciation}
                          </span>
                        )}
                      </div>
                      {vocab.audio_url && (
                        <button
                          onClick={() => handlePlayAudio(vocab.audio_url!, "vocab", idx)}
                          className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center active:scale-[0.93] transition-all duration-100"
                        >
                          <span className="material-symbols-outlined text-lg">
                            {playingVocabIndex === idx ? "pause" : "volume_up"}
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-xs">
                      <span className="text-xs font-mono uppercase bg-surface-container-high px-2 py-0.5 rounded text-text-tertiary">
                        {vocab.part_of_speech || "word"}
                      </span>
                      <span className="text-body-sm text-on-surface font-semibold">
                        {vocab.translation}
                      </span>
                    </div>
                    {vocab.example_sentence && (
                      <p className="text-xs text-on-surface-variant italic mt-2 border-l-2 border-outline-variant pl-2">
                        "{vocab.example_sentence}"
                      </p>
                    )}
                  </Card>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-md mt-lg">
                <Button onClick={() => setStep(0)} variant="outline" className="flex-1 py-3 flex items-center justify-center gap-xs">
                  <span className="material-symbols-outlined">arrow_back</span>
                  {t("back")}
                </Button>
                <Button onClick={() => setStep(2)} className="flex-1 py-3 flex items-center justify-center gap-xs">
                  {t("next")}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: EXERCISES */}
          {step === 2 && currentExercise && (
            <motion.div
              key={`exercise-${exerciseIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-lg max-w-[560px] mx-auto w-full"
            >
              <div>
                <span className="text-xs uppercase font-label-md text-primary font-semibold tracking-widest">
                  Practice Exercise {exerciseIndex + 1} of {exercises.length}
                </span>
                <h1 className="font-headline-lg text-headline-lg text-on-surface mt-xs mb-sm">
                  {currentExercise.type === "fill_blank"
                    ? "Fill in the blank:"
                    : "Choose the correct form:"}
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface bg-surface-container border border-outline rounded-xl p-md leading-relaxed">
                  {currentExercise.question}
                </p>
              </div>

              {/* Options Selection */}
              <div className="flex flex-col gap-sm">
                {currentExercise.options.map((option, idx) => {
                  const isSelected = selectedExAnswer === option;
                  let btnStyle =
                    "w-full bg-surface border border-outline rounded-xl p-sm flex items-center justify-between text-left transition-all duration-200 active:scale-[0.98] focus:outline-none";

                  if (exChecked) {
                    if (option === currentExercise.correct_answer) {
                      btnStyle =
                        "w-full bg-success/10 border border-success rounded-xl p-sm flex items-center justify-between text-left transition-all duration-200 focus:outline-none";
                    } else if (isSelected) {
                      btnStyle =
                        "w-full bg-error/10 border border-error rounded-xl p-sm flex items-center justify-between text-left transition-all duration-200 focus:outline-none";
                    } else {
                      btnStyle =
                        "w-full bg-surface border border-outline opacity-40 rounded-xl p-sm flex items-center justify-between text-left focus:outline-none";
                    }
                  } else if (isSelected) {
                    btnStyle =
                      "w-full bg-primary/10 border border-primary rounded-xl p-sm flex items-center justify-between text-left transition-all duration-200 focus:outline-none";
                  } else {
                    btnStyle += " hover:border-primary hover:bg-surface-container-high";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectExOption(option)}
                      disabled={exChecked}
                      className={btnStyle}
                    >
                      <span className="font-body-md text-body-md text-on-surface">{option}</span>
                      {exChecked && option === currentExercise.correct_answer && (
                        <span className="material-symbols-outlined text-success">check_circle</span>
                      )}
                      {exChecked && isSelected && option !== currentExercise.correct_answer && (
                        <span className="material-symbols-outlined text-error">cancel</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback and Explanation */}
              {exChecked && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col gap-xs p-md border rounded-xl shadow-sm ${
                    exCorrect
                      ? "bg-success/5 border-success/20 text-success"
                      : "bg-error/5 border-error/20 text-error"
                  }`}
                >
                  <div className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[18px]">
                      {exCorrect ? "check_circle" : "info"}
                    </span>
                    <span className="font-label-md text-label-md font-bold uppercase tracking-wider">
                      {exCorrect ? t("correct") : t("incorrect")}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                    {currentExercise.explanation}
                  </p>
                </motion.div>
              )}

              {/* Active Action Button */}
              <div className="mt-md">
                {!exChecked ? (
                  <Button
                    onClick={handleCheckExercise}
                    disabled={!selectedExAnswer}
                    className="w-full py-3"
                  >
                    {t("check")}
                  </Button>
                ) : (
                  <Button onClick={handleNextExercise} className="w-full py-3">
                    {t("continue")}
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 3: QUIZ / TEST */}
          {step === 3 && currentQuizQuestion && (
            <motion.div
              key={`test-${testIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-lg max-w-[560px] mx-auto w-full"
            >
              <div>
                <span className="text-xs uppercase font-label-md text-warning font-semibold tracking-widest">
                  Assessment Quiz Question {testIndex + 1} of {quiz.length}
                </span>
                <h1 className="font-headline-lg text-headline-lg text-on-surface mt-xs mb-sm">
                  Test your understanding:
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface bg-surface-container border border-outline rounded-xl p-md leading-relaxed">
                  {currentQuizQuestion.question}
                </p>
              </div>

              {/* Options Grid */}
              <div className="flex flex-col gap-sm">
                {currentQuizQuestion.options.map((option, idx) => {
                  const isSelected = selectedTestAnswer === idx;
                  const btnStyle = `w-full border rounded-xl p-sm flex items-center justify-between text-left transition-all duration-200 active:scale-[0.98] focus:outline-none ${
                    isSelected
                      ? "bg-warning/10 border-warning text-warning"
                      : "bg-surface border-outline hover:border-warning hover:bg-surface-container-high"
                  }`;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectQuizOption(idx)}
                      className={btnStyle}
                    >
                      <span className="font-body-md text-body-md text-on-surface">{option}</span>
                      <span className="font-mono text-xs opacity-50">Option {idx + 1}</span>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Action Footer */}
              <div className="mt-md">
                <Button
                  onClick={handleNextQuizQuestion}
                  disabled={selectedTestAnswer === null || isSubmitting}
                  className="w-full py-3 bg-warning hover:bg-warning/95 border-warning/30 hover:border-warning/60 text-background font-bold"
                >
                  {isSubmitting ? "Scoring Lesson..." : "Submit Answer"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: LESSON COMPLETION SUMMARY SUCCESS */}
          {step === 4 && completionData && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center text-center gap-lg max-w-[480px] mx-auto w-full pt-lg"
            >
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-success/15 border-2 border-success flex items-center justify-center animate-bounce shadow-[0_0_24px_rgba(61,214,140,0.2)]">
                  <span className="material-symbols-outlined text-success text-5xl font-bold">
                    celebration
                  </span>
                </div>
                {completionData.level_up && (
                  <span className="absolute -top-2 -right-4 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse shadow-md">
                    {t("level_up")}
                  </span>
                )}
              </div>

              <div>
                <h1 className="font-display text-4xl font-bold tracking-tight text-on-surface mb-2">
                  Lesson Completed!
                </h1>
                <p className="text-on-surface-variant font-body-md max-w-xs mx-auto">
                  You completed "{lesson.title}" topic successfully and earned your rewards!
                </p>
              </div>

              {/* Performance Card */}
              <Card className="w-full p-md bg-surface-container border-outline-variant flex flex-col gap-sm">
                <div className="flex justify-between items-center border-b border-outline-variant pb-xs">
                  <span className="text-on-surface-variant font-body-sm">{t("xp_earned")}</span>
                  <span className="text-primary font-headline-md text-lg font-bold">
                    +{completionData.xp_earned} XP
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-outline-variant pb-xs">
                  <span className="text-on-surface-variant font-body-sm">{t("accuracy")}</span>
                  <span className="text-on-surface font-headline-md text-lg font-bold">
                    {Math.round(completionData.accuracy * 100)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant font-body-sm">Questions Correct</span>
                  <span className="text-on-surface font-headline-md text-lg font-bold">
                    {completionData.exercises_correct} / {completionData.exercises_total}
                  </span>
                </div>
              </Card>

              {/* Continue button */}
              <Button
                onClick={() => {
                  router.push("/dashboard");
                  router.refresh();
                }}
                className="w-full py-3 mt-md"
              >
                Go to Dashboard
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

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
import { MarkdownContent } from "@/components/MarkdownContent";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

// Steps: 0=Theory, 1=Vocabulary, 2=Reading, 3=Listening, 4=Exercises, 5=Quiz, 6=Complete
const STEPS = ["Theory", "Vocabulary", "Reading", "Listening", "Exercises", "Quiz", "Complete"];
const STEP_ICONS = ["menu_book", "translate", "article", "headphones", "edit", "quiz", "celebration"];

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.25 },
} as const;

export default function LessonDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("Lessons");

  const lessonId = params.lesson_id as string;
  const { data: lesson, isLoading, error } = useGetLessonByIdQuery(lessonId);
  const [completeLesson, { isLoading: isSubmitting }] = useCompleteLessonMutation();

  const [step, setStep] = useState(0);

  // Audio
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingTheory, setIsPlayingTheory] = useState(false);
  const [playingVocabIdx, setPlayingVocabIdx] = useState<number | null>(null);
  const [isPlayingListening, setIsPlayingListening] = useState(false);

  // Exercises
  const [exIdx, setExIdx] = useState(0);
  const [selectedEx, setSelectedEx] = useState("");
  const [exChecked, setExChecked] = useState(false);
  const [exCorrect, setExCorrect] = useState<boolean | null>(null);
  const [exAnswers, setExAnswers] = useState<string[]>([]);

  // Quiz
  const [quizIdx, setQuizIdx] = useState(0);
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [completionData, setCompletionData] = useState<any>(null);

  // Timing
  const [timeStarted] = useState(Date.now());

  useEffect(() => () => { activeAudioRef.current?.pause(); }, []);

  const playAudio = (url: string, type: "theory" | "vocab" | "listening", idx?: number) => {
    activeAudioRef.current?.pause();
    activeAudioRef.current = null;
    setIsPlayingTheory(false);
    setPlayingVocabIdx(null);
    setIsPlayingListening(false);

    const audio = new Audio(url);
    activeAudioRef.current = audio;
    if (type === "theory") setIsPlayingTheory(true);
    else if (type === "vocab" && idx !== undefined) setPlayingVocabIdx(idx);
    else if (type === "listening") setIsPlayingListening(true);

    audio.play().catch(() => {
      setIsPlayingTheory(false);
      setPlayingVocabIdx(null);
      setIsPlayingListening(false);
    });
    audio.onended = () => {
      setIsPlayingTheory(false);
      setPlayingVocabIdx(null);
      setIsPlayingListening(false);
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-md">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-on-surface-variant animate-pulse">{t("loading")}</p>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-md text-center">
        <span className="material-symbols-outlined text-error text-5xl">error</span>
        <h2 className="text-headline-md font-bold text-on-surface">Failed to load lesson</h2>
        <p className="text-on-surface-variant max-w-sm">Please check your connection or return to the dashboard.</p>
        <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  const { content } = lesson;
  const exercises = content.exercises || [];
  const quiz = content.test || [];
  const vocabulary = content.vocabulary || [];
  const examples = content.examples || [];

  // Progress: Complete step is excluded from the bar
  const totalSteps = STEPS.length - 1; // don't count Complete
  const progressPct = Math.min(((step) / (totalSteps - 1)) * 100, 100);

  // ----- Exercise handlers -----
  const currentEx: LessonExercise | undefined = exercises[exIdx];

  const checkExercise = () => {
    if (!selectedEx || !currentEx) return;
    const correct = selectedEx.trim().toLowerCase() === currentEx.correct_answer.trim().toLowerCase();
    setExCorrect(correct);
    setExChecked(true);
  };

  const nextExercise = () => {
    setExAnswers((prev) => [...prev, selectedEx]);
    if (exIdx + 1 < exercises.length) {
      setExIdx((p) => p + 1);
      setSelectedEx("");
      setExChecked(false);
      setExCorrect(null);
    } else {
      setStep(5); // go to quiz
    }
  };

  // ----- Quiz handlers -----
  const currentQ: LessonTestQuestion | undefined = quiz[quizIdx];

  const nextQuiz = async () => {
    if (selectedQuiz === null || !currentQ) return;
    const isCorrect = selectedQuiz === currentQ.correct_index;
    const updatedAnswers = [...quizAnswers, selectedQuiz];
    setQuizAnswers(updatedAnswers);
    if (isCorrect) setQuizCorrect((p) => p + 1);

    if (quizIdx + 1 < quiz.length) {
      setQuizIdx((p) => p + 1);
      setSelectedQuiz(null);
    } else {
      const timeSpent = Math.round((Date.now() - timeStarted) / 1000);
      try {
        const result = await completeLesson({
          lessonId,
          body: {
            exercise_answers: [...exAnswers, selectedEx],
            test_answers: updatedAnswers,
            time_spent_seconds: timeSpent,
          },
        }).unwrap();
        setCompletionData(result);
        setStep(6);
      } catch (err) {
        console.error("Failed to complete lesson:", err);
      }
    }
  };

  const goNext = () => setStep((s) => Math.min(s + 1, 6));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="flex-grow flex flex-col w-full pb-16">

      {/* Progress bar */}
      {step < 6 && (
        <div className="w-full h-1 bg-[#1E1E24] sticky top-16 z-20 shrink-0">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-[#8B7CFF] rounded-full"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      )}

      {/* Step pills */}
      {step < 6 && (
        <div className="w-full max-w-[800px] mx-auto px-sm pt-md pb-0 flex items-center gap-xs overflow-x-auto no-scrollbar">
          {STEPS.slice(0, 6).map((label, i) => (
            <button
              key={i}
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold shrink-0 border transition-all duration-200 ${
                i === step
                  ? "bg-primary text-white border-primary shadow-[0_0_12px_rgba(110,91,255,0.3)]"
                  : i < step
                  ? "bg-[#1E1E24] border-[#2A2A32] text-primary cursor-pointer hover:border-primary/50"
                  : "bg-transparent border-transparent text-on-surface-variant/40 cursor-not-allowed"
              }`}
            >
              <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {i < step ? "check" : STEP_ICONS[i]}
              </span>
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="w-full max-w-[800px] mx-auto px-sm md:px-xl py-lg flex flex-col flex-grow">
        <AnimatePresence mode="wait">

          {/* ── STEP 0: THEORY ── */}
          {step === 0 && (
            <motion.div key="theory" {...slide} className="flex flex-col gap-lg">
              <div className="flex justify-between items-start border-b border-[#2A2A32] pb-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                    {lesson.topic} · {lesson.cefr_level}
                  </p>
                  <h1 className="text-2xl font-bold text-on-surface">{content.theory.title}</h1>
                </div>
                {lesson.audio_urls?.theory && (
                  <Button
                    variant="outline"
                    onClick={() => playAudio(lesson.audio_urls!.theory!, "theory")}
                    className="flex items-center gap-xs text-sm shrink-0"
                  >
                    <span className="material-symbols-outlined text-base">
                      {isPlayingTheory ? "pause" : "volume_up"}
                    </span>
                    {isPlayingTheory ? "Playing" : "Listen"}
                  </Button>
                )}
              </div>

              {/* Main explanation — rich markdown */}
              <div className="bg-[#15151A] border border-[#2A2A32] rounded-xl p-md">
                <MarkdownContent content={content.theory.explanation} />
              </div>

              {/* Grammar notes */}
              {content.theory.grammar_notes && (
                <div className="border-l-4 border-primary rounded-r-xl bg-primary/5 p-md">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Grammar Notes</p>
                  <MarkdownContent content={content.theory.grammar_notes} className="text-sm" />
                </div>
              )}

              {/* Key points */}
              {content.theory.key_points?.length > 0 && (
                <div className="bg-[#15151A] border border-[#2A2A32] rounded-xl p-md">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">Key Rules</p>
                  <ul className="space-y-2">
                    {content.theory.key_points.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-primary text-[16px] mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                          chevron_right
                        </span>
                        <MarkdownContent content={pt} className="text-sm flex-1" />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Examples */}
              {examples.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">Examples</p>
                  <div className="space-y-sm">
                    {examples.map((ex, i) => (
                      <div key={i} className="flex gap-sm py-sm border-b border-[#2A2A32] last:border-0 group">
                        <span className="material-symbols-outlined text-primary text-[16px] mt-1 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                          trip_origin
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-on-surface leading-relaxed">{ex.source_text}</p>
                          <p className="text-sm text-on-surface-variant mt-0.5">{ex.translation}</p>
                          {ex.context && (
                            <span className="inline-block mt-1 text-[11px] text-on-surface-variant bg-[#1E1E24] border border-[#2A2A32] px-2 py-0.5 rounded font-mono">
                              {ex.context}
                            </span>
                          )}
                        </div>
                        {ex.difficulty && (
                          <span className="text-[10px] font-mono text-on-surface-variant/50 shrink-0 mt-1">
                            {ex.difficulty}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={goNext} className="w-full py-3 flex items-center justify-center gap-xs">
                {t("next")} <span className="material-symbols-outlined">arrow_forward</span>
              </Button>
            </motion.div>
          )}

          {/* ── STEP 1: VOCABULARY ── */}
          {step === 1 && (
            <motion.div key="vocabulary" {...slide} className="flex flex-col gap-lg">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Vocabulary</p>
                <h1 className="text-2xl font-bold text-on-surface mb-1">New Words</h1>
                <p className="text-on-surface-variant text-sm">{vocabulary.length} words from this lesson — review before practicing.</p>
              </div>

              {/* Vocabulary table for easy scanning */}
              <div className="overflow-x-auto rounded-xl border border-[#2A2A32]">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#1E1E24] border-b border-[#2A2A32]">
                      <th className="px-4 py-3 text-left font-semibold text-on-surface">Word</th>
                      <th className="px-4 py-3 text-left font-semibold text-on-surface">Pronunciation</th>
                      <th className="px-4 py-3 text-left font-semibold text-on-surface">Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-on-surface">Translation</th>
                      <th className="px-4 py-3 text-center font-semibold text-on-surface w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {vocabulary.map((v, i) => (
                      <tr key={i} className={`border-b border-[#2A2A32] last:border-0 hover:bg-[#1E1E24]/50 transition-colors ${i % 2 === 1 ? "bg-[#15151A]/50" : ""}`}>
                        <td className="px-4 py-3 font-bold text-on-surface">{v.word}</td>
                        <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{v.pronunciation}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] uppercase font-bold bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded">
                            {v.part_of_speech}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant">{v.translation}</td>
                        <td className="px-4 py-3 text-center">
                          {v.audio_url && (
                            <button
                              onClick={() => playAudio(v.audio_url!, "vocab", i)}
                              className="w-7 h-7 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center mx-auto transition-colors"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {playingVocabIdx === i ? "pause" : "volume_up"}
                              </span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Example sentence cards */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">Example Sentences</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                  {vocabulary.filter((v) => v.example_sentence).map((v, i) => (
                    <div key={i} className="bg-[#15151A] border border-[#2A2A32] rounded-xl p-sm">
                      <p className="font-bold text-primary text-sm mb-1">{v.word}</p>
                      <p className="text-on-surface-variant text-xs italic">"{v.example_sentence}"</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-sm">
                <Button variant="outline" onClick={goBack} className="flex-1 flex items-center justify-center gap-xs py-3">
                  <span className="material-symbols-outlined">arrow_back</span> {t("back")}
                </Button>
                <Button onClick={goNext} className="flex-1 flex items-center justify-center gap-xs py-3">
                  {t("next")} <span className="material-symbols-outlined">arrow_forward</span>
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: READING ── */}
          {step === 2 && (
            <motion.div key="reading" {...slide} className="flex flex-col gap-lg">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Reading</p>
                <h1 className="text-2xl font-bold text-on-surface">{content.reading_text?.title || "Reading Passage"}</h1>
              </div>

              {content.reading_text ? (
                <>
                  <div className="bg-[#15151A] border border-[#2A2A32] rounded-xl p-md">
                    <MarkdownContent content={content.reading_text.content} />
                  </div>

                  {(content.reading_text.comprehension_questions?.length ?? 0) > 0 && (
                    <div className="bg-[#15151A] border border-[#2A2A32] rounded-xl p-md">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                        Comprehension Questions
                      </p>
                      <ol className="space-y-3 list-decimal pl-5">
                        {content.reading_text.comprehension_questions?.map((q, i) => (
                          <li key={i} className="text-on-surface-variant text-sm leading-relaxed">
                            {q}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-on-surface-variant text-sm">No reading passage for this lesson.</p>
              )}

              <div className="flex gap-sm">
                <Button variant="outline" onClick={goBack} className="flex-1 flex items-center justify-center gap-xs py-3">
                  <span className="material-symbols-outlined">arrow_back</span> {t("back")}
                </Button>
                <Button onClick={goNext} className="flex-1 flex items-center justify-center gap-xs py-3">
                  {t("next")} <span className="material-symbols-outlined">arrow_forward</span>
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: LISTENING ── */}
          {step === 3 && (
            <motion.div key="listening" {...slide} className="flex flex-col gap-lg">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Listening</p>
                <h1 className="text-2xl font-bold text-on-surface">Listen & Understand</h1>
              </div>

              {content.listening_script ? (
                <>
                  {/* Audio player */}
                  {content.listening_script.audio_url ? (
                    <div className="bg-[#15151A] border border-[#2A2A32] rounded-xl p-md flex items-center gap-md">
                      <button
                        onClick={() => playAudio(content.listening_script!.audio_url!, "listening")}
                        className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(110,91,255,0.3)] hover:bg-primary/90 transition-colors"
                      >
                        <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {isPlayingListening ? "pause" : "play_arrow"}
                        </span>
                      </button>
                      <div>
                        <p className="font-semibold text-on-surface text-sm">Audio Recording</p>
                        <p className="text-on-surface-variant text-xs mt-0.5">Listen carefully, then answer the questions below.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#15151A] border border-[#2A2A32] rounded-xl p-md">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Script</p>
                      <p className="text-on-surface leading-relaxed text-sm">{content.listening_script.script_text}</p>
                    </div>
                  )}

                  {/* Listening questions */}
                  {content.listening_script.questions?.length > 0 && (
                    <div className="space-y-md">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Questions</p>
                      {content.listening_script.questions.map((q, qi) => (
                        <div key={qi} className="bg-[#15151A] border border-[#2A2A32] rounded-xl p-md">
                          <p className="font-semibold text-on-surface text-sm mb-3">
                            <span className="text-primary mr-2">{qi + 1}.</span>{q.question}
                          </p>
                          <div className="grid grid-cols-1 gap-xs">
                            {q.options.map((opt, oi) => (
                              <div key={oi} className={`flex items-center gap-sm px-sm py-xs rounded-lg border text-sm ${oi === q.correct_index ? "border-success/40 bg-success/5 text-success" : "border-[#2A2A32] text-on-surface-variant"}`}>
                                <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${oi === q.correct_index ? "border-success bg-success/20 text-success" : "border-[#2A2A32]"}`}>
                                  {oi === q.correct_index ? "✓" : String.fromCharCode(65 + oi)}
                                </span>
                                {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-on-surface-variant text-sm">No listening exercise for this lesson.</p>
              )}

              <div className="flex gap-sm">
                <Button variant="outline" onClick={goBack} className="flex-1 flex items-center justify-center gap-xs py-3">
                  <span className="material-symbols-outlined">arrow_back</span> {t("back")}
                </Button>
                <Button onClick={goNext} className="flex-1 flex items-center justify-center gap-xs py-3">
                  {t("next")} <span className="material-symbols-outlined">arrow_forward</span>
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: EXERCISES ── */}
          {step === 4 && currentEx && (
            <motion.div key={`ex-${exIdx}`} {...slide} className="flex flex-col gap-lg max-w-[560px] mx-auto w-full">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Exercise {exIdx + 1} of {exercises.length}
                </span>
                <div className="h-1 bg-[#1E1E24] rounded-full mt-2 mb-4">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${((exIdx + 1) / exercises.length) * 100}%` }}
                  />
                </div>
                <h2 className="text-lg font-bold text-on-surface mb-1">
                  {currentEx.type === "fill_blank" ? "Fill in the blank" :
                   currentEx.type === "translation" ? "Translate this sentence" :
                   currentEx.type === "reorder" ? "Put the words in order" :
                   "Choose the correct answer"}
                </h2>
                <div className="bg-[#15151A] border border-[#2A2A32] rounded-xl p-md mt-2">
                  <p className="text-on-surface leading-relaxed">{currentEx.question}</p>
                  {(currentEx.hints?.length ?? 0) > 0 && (
                    <p className="text-xs text-on-surface-variant mt-2 italic">
                      Hint: {currentEx.hints?.[0]}
                    </p>
                  )}
                </div>
              </div>

              {currentEx.options && currentEx.options.length > 0 ? (
                <div className="flex flex-col gap-sm">
                  {currentEx.options.map((opt, i) => {
                    const isSelected = selectedEx === opt;
                    const isCorrectOpt = opt.trim().toLowerCase() === currentEx.correct_answer.trim().toLowerCase();
                    let cls = "w-full border rounded-xl p-sm flex items-center justify-between text-left text-sm transition-all active:scale-[0.98] focus:outline-none ";
                    if (exChecked) {
                      if (isCorrectOpt) cls += "bg-success/10 border-success text-on-surface";
                      else if (isSelected) cls += "bg-error/10 border-error text-on-surface";
                      else cls += "bg-[#15151A] border-[#2A2A32] text-on-surface-variant opacity-50";
                    } else if (isSelected) {
                      cls += "bg-primary/10 border-primary text-on-surface";
                    } else {
                      cls += "bg-[#15151A] border-[#2A2A32] text-on-surface hover:border-primary/40";
                    }
                    return (
                      <button key={i} onClick={() => !exChecked && setSelectedEx(opt)} disabled={exChecked} className={cls}>
                        <span>{opt}</span>
                        {exChecked && isCorrectOpt && <span className="material-symbols-outlined text-success">check_circle</span>}
                        {exChecked && isSelected && !isCorrectOpt && <span className="material-symbols-outlined text-error">cancel</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  type="text"
                  value={selectedEx}
                  onChange={(e) => !exChecked && setSelectedEx(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !exChecked && checkExercise()}
                  disabled={exChecked}
                  placeholder="Type your answer…"
                  className="w-full bg-[#15151A] border border-[#2A2A32] rounded-xl px-md py-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                />
              )}

              {exChecked && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-md rounded-xl border ${exCorrect ? "bg-success/5 border-success/30 text-success" : "bg-error/5 border-error/30 text-error"}`}
                >
                  <div className="flex items-center gap-xs mb-1">
                    <span className="material-symbols-outlined text-[18px]">{exCorrect ? "check_circle" : "info"}</span>
                    <span className="font-bold text-sm uppercase tracking-wide">{exCorrect ? t("correct") : t("incorrect")}</span>
                  </div>
                  <p className="text-on-surface-variant text-sm mt-1">{currentEx.explanation}</p>
                </motion.div>
              )}

              <div>
                {!exChecked ? (
                  <Button onClick={checkExercise} disabled={!selectedEx} className="w-full py-3">{t("check")}</Button>
                ) : (
                  <Button onClick={nextExercise} className="w-full py-3">{t("continue")}</Button>
                )}
              </div>
            </motion.div>
          )}

          {/* ── STEP 5: QUIZ ── */}
          {step === 5 && currentQ && (
            <motion.div key={`q-${quizIdx}`} {...slide} className="flex flex-col gap-lg max-w-[560px] mx-auto w-full">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-warning">
                  Quiz {quizIdx + 1} of {quiz.length}
                </span>
                <div className="h-1 bg-[#1E1E24] rounded-full mt-2 mb-4">
                  <div
                    className="h-full bg-warning rounded-full transition-all duration-300"
                    style={{ width: `${((quizIdx + 1) / quiz.length) * 100}%` }}
                  />
                </div>
                <h2 className="text-lg font-bold text-on-surface mb-1">Test your knowledge</h2>
                <div className="bg-[#15151A] border border-[#2A2A32] rounded-xl p-md mt-2">
                  <p className="text-on-surface leading-relaxed">{currentQ.question}</p>
                </div>
              </div>

              <div className="flex flex-col gap-sm">
                {currentQ.options.map((opt, i) => {
                  const isSelected = selectedQuiz === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedQuiz(i)}
                      className={`w-full border rounded-xl p-sm text-left text-sm flex items-center gap-sm transition-all active:scale-[0.98] ${
                        isSelected
                          ? "bg-warning/10 border-warning text-on-surface"
                          : "bg-[#15151A] border-[#2A2A32] text-on-surface hover:border-warning/40"
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${isSelected ? "border-warning bg-warning/20 text-warning" : "border-[#2A2A32] text-on-surface-variant"}`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              <Button
                onClick={nextQuiz}
                disabled={selectedQuiz === null || isSubmitting}
                className="w-full py-3 bg-warning hover:bg-warning/90 text-[#0A0A0C] font-bold border-warning/30"
              >
                {isSubmitting ? "Scoring…" : "Submit Answer"}
              </Button>
            </motion.div>
          )}

          {/* ── STEP 6: COMPLETE ── */}
          {step === 6 && completionData && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center justify-center text-center gap-lg max-w-[480px] mx-auto w-full pt-lg"
            >
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-success/15 border-2 border-success flex items-center justify-center shadow-[0_0_32px_rgba(61,214,140,0.2)]">
                  <span className="material-symbols-outlined text-success text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    celebration
                  </span>
                </div>
                {completionData.level_up && (
                  <span className="absolute -top-2 -right-4 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                    {t("level_up")}
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-3xl font-bold text-on-surface mb-2">Lesson Complete!</h1>
                <p className="text-on-surface-variant text-sm max-w-xs mx-auto">
                  You finished "{lesson.title}" and earned your rewards.
                </p>
              </div>

              <Card className="w-full p-md flex flex-col gap-sm">
                {[
                  { label: t("xp_earned"), value: `+${completionData.xp_earned} XP`, color: "text-primary" },
                  { label: t("accuracy"), value: `${Math.round(completionData.accuracy * 100)}%`, color: "text-on-surface" },
                  { label: "Score", value: `${Math.round(completionData.score * 100)}%`, color: "text-on-surface" },
                  { label: "Correct answers", value: `${completionData.exercises_correct} / ${completionData.exercises_total}`, color: "text-on-surface" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between items-center border-b border-[#2A2A32] last:border-0 pb-sm last:pb-0">
                    <span className="text-on-surface-variant text-sm">{label}</span>
                    <span className={`font-bold text-lg ${color}`}>{value}</span>
                  </div>
                ))}
              </Card>

              <div className="flex gap-sm w-full">
                <Button
                  variant="outline"
                  onClick={() => router.push("/lessons")}
                  className="flex-1 py-3"
                >
                  All Lessons
                </Button>
                <Button
                  onClick={() => { router.push("/dashboard"); router.refresh(); }}
                  className="flex-1 py-3"
                >
                  Dashboard
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

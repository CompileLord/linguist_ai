"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetReviewQueueQuery,
  useRespondToReviewItemMutation,
  SpacedRepetitionItemResponse,
} from "@/services/reviewApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function ReviewPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = useTranslations("Lessons");

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [completedItemsCount, setCompletedItemsCount] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  
  // Audio playback
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Fetch review queue
  const { data: queue, isLoading, error, refetch } = useGetReviewQueueQuery({
    batch_size: 20,
  });

  const [respondToReviewItem, { isLoading: isSubmitting }] = useRespondToReviewItemMutation();

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading || !queue || currentIndex >= queue.length) return;

      if (e.code === "Space" && !isRevealed) {
        e.preventDefault();
        setIsRevealed(true);
      } else if (isRevealed) {
        if (e.key === "1") submitRating(1);      // Again
        else if (e.key === "2") submitRating(3); // Hard
        else if (e.key === "3") submitRating(4); // Good
        else if (e.key === "4") submitRating(5); // Easy
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, queue, currentIndex, isRevealed]);

  // Audio helper
  const handlePlayAudio = (url: string) => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    const audio = new Audio(url);
    activeAudioRef.current = audio;
    setIsPlayingAudio(true);
    
    audio.play().catch(err => {
      console.error("Audio playback error:", err);
      setIsPlayingAudio(false);
    });

    audio.onended = () => {
      setIsPlayingAudio(false);
    };
  };

  const submitRating = async (quality: number) => {
    if (!queue || currentIndex >= queue.length || isSubmitting) return;

    const currentItem = queue[currentIndex];
    try {
      await respondToReviewItem({
        itemId: currentItem.id,
        quality,
      }).unwrap();

      // Successful review adds 10 XP
      setXpEarned((prev) => prev + 10);
      setCompletedItemsCount((prev) => prev + 1);

      // Advance
      setIsRevealed(false);
      setCurrentIndex((prev) => prev + 1);
    } catch (err) {
      console.error("Failed to submit review response:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-md">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-on-surface-variant animate-pulse">Loading review queue...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-md text-center">
        <span className="material-symbols-outlined text-error text-5xl">error</span>
        <h2 className="text-headline-md font-bold text-on-surface">Queue Fetch Failed</h2>
        <p className="text-on-surface-variant max-w-sm">
          Failed to fetch the spaced repetition reviews list. Please try again.
        </p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const reviewItemsList = queue || [];
  const hasItems = reviewItemsList.length > 0;
  const isFinished = !hasItems || currentIndex >= reviewItemsList.length;

  if (isFinished) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center px-gutter pt-xl pb-24 max-w-[800px] w-full mx-auto relative z-10 text-center space-y-lg">
        {/* Confetti Animation Effect / Celebration Circle */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="w-24 h-24 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto shadow-[0_0_24px_rgba(61,214,140,0.15)]"
        >
          <span className="material-symbols-outlined text-success text-5xl">task_alt</span>
        </motion.div>
        
        <div className="space-y-sm">
          <h2 className="font-headline-lg text-3xl font-bold text-on-surface">Review Session Completed!</h2>
          <p className="font-body-md text-on-surface-variant max-w-sm mx-auto text-pretty">
            {completedItemsCount > 0 
              ? `You have successfully completed all ${completedItemsCount} due spaced repetition reviews for today.`
              : "Awesome! You have no pending spaced repetition review cards for today. Come back tomorrow!"}
          </p>
        </div>

        {completedItemsCount > 0 && (
          <Card className="grid grid-cols-2 gap-md max-w-xs w-full mx-auto p-sm bg-[#15151A] border-outline">
            <div className="text-center">
              <p className="font-label-md text-xs font-semibold text-on-surface-variant">XP Earned</p>
              <p className="text-2xl font-bold text-primary mt-1">+{xpEarned} XP</p>
            </div>
            <div className="text-center">
              <p className="font-label-md text-xs font-semibold text-on-surface-variant">Completed</p>
              <p className="text-2xl font-bold text-success mt-1">{completedItemsCount}</p>
            </div>
          </Card>
        )}

        <div className="pt-lg">
          <Button onClick={() => router.push("/dashboard")} className="px-8 py-3">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const currentItem = reviewItemsList[currentIndex];
  const vocab = currentItem.detail;
  const itemType = currentItem.item_type === "grammar" ? "Grammar" : "Vocabulary";
  const itemTitle = vocab?.word || "Grammar Rule";
  const itemTranslation = vocab?.translation_context[locale] || vocab?.translation_context["en"] || "";
  const itemClue = vocab?.cefr_level ? `Difficulty: ${vocab.cefr_level}` : "Review this grammar pattern";
  const itemExplanation = vocab?.transcription 
    ? `[${vocab.transcription}]` 
    : "Review explanation for correct memory association.";

  const progressPercent = (currentIndex / reviewItemsList.length) * 100;

  return (
    <div className="flex-grow flex flex-col items-center justify-start w-full pb-12">
      {/* Top progress indicators */}
      <div className="w-full h-1 bg-surface-container-high z-10 sticky top-16 shrink-0">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent-glow transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center px-gutter pt-xl pb-32 max-w-[800px] mx-auto w-full relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="bg-[#15151A] border border-outline rounded-xl w-full max-w-md p-8 flex flex-col items-center justify-center relative shadow-lg hover:border-primary/20 transition-all duration-300 min-h-[360px]"
          >
            {/* Item Type Badge */}
            <span
              className={`absolute top-4 left-4 px-2 py-0.5 border text-xs font-label-md rounded-full ${
                itemType === "Grammar"
                  ? "bg-warning/10 border-warning/20 text-warning"
                  : "bg-primary/10 border-primary/20 text-primary"
              }`}
            >
              {itemType}
            </span>

            {/* Front Word */}
            <h1 className="font-display text-4xl font-bold text-on-surface text-center mb-6 tracking-tight break-words w-full select-none mt-4">
              {itemTitle}
            </h1>

            {/* Context Clue */}
            {itemClue && (
              <p className="font-body-md text-sm text-on-surface-variant text-center max-w-[90%] mb-4 text-pretty italic select-none">
                "{itemClue}"
              </p>
            )}

            {/* Interactive Reveal Area */}
            <div className="w-full flex flex-col items-center relative mt-sm">
              {!isRevealed ? (
                <button
                  onClick={() => setIsRevealed(true)}
                  className="py-2.5 px-6 rounded-full border border-outline text-on-surface-variant hover:border-primary hover:text-primary active:scale-[0.96] transition-all duration-150 font-label-md text-sm flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">
                    visibility
                  </span>
                  Tap to reveal answer
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="w-full flex flex-col items-center"
                >
                  <div className="h-[1px] w-1/2 bg-outline mb-6"></div>
                  <div className="flex items-center gap-sm mb-2 text-center justify-center">
                    <span className="font-headline-lg text-2xl font-bold text-on-surface">
                      {itemTranslation}
                    </span>
                    {vocab?.audio_url && (
                      <button
                        onClick={() => handlePlayAudio(vocab.audio_url!)}
                        className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center active:scale-[0.93] transition-all duration-100"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {isPlayingAudio ? "pause" : "volume_up"}
                        </span>
                      </button>
                    )}
                  </div>
                  <p className="font-body-sm text-xs text-on-surface-variant text-center max-w-[85%] leading-relaxed text-pretty mt-2">
                    {itemExplanation}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Card indicators / dots */}
        <div className="mt-8 flex flex-col items-center gap-2 select-none">
          <span className="font-label-md text-sm text-on-surface-variant tabular-nums font-medium">
            {currentIndex + 1} / {reviewItemsList.length}
          </span>
          <div className="flex gap-2">
            {reviewItemsList.map((_, idx) => (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? "bg-primary w-3" : "bg-outline-variant"
                }`}
              ></div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Evaluation Action Bar Footer (Hidden until revealed) */}
      <div
        className={`fixed bottom-0 left-0 md:left-64 right-0 z-30 flex justify-center items-center gap-sm px-md py-4 bg-surface border-t border-outline transition-transform duration-300 shadow-2xl ${
          isRevealed ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <button
          onClick={() => submitRating(1)}
          disabled={isSubmitting}
          className="flex-1 max-w-[120px] bg-error/10 hover:bg-error/20 border border-error/30 text-error font-medium py-2 rounded-lg text-sm active:scale-[0.95] transition-all cursor-pointer text-center"
        >
          Again <span className="hidden sm:inline opacity-40 text-xs font-mono ml-1">(1)</span>
        </button>
        <button
          onClick={() => submitRating(3)}
          disabled={isSubmitting}
          className="flex-1 max-w-[120px] bg-warning/10 hover:bg-warning/20 border border-warning/30 text-warning font-medium py-2 rounded-lg text-sm active:scale-[0.95] transition-all cursor-pointer text-center"
        >
          Hard <span className="hidden sm:inline opacity-40 text-xs font-mono ml-1">(2)</span>
        </button>
        <button
          onClick={() => submitRating(4)}
          disabled={isSubmitting}
          className="flex-1 max-w-[120px] bg-primary/10 hover:bg-primary/25 border border-primary/30 text-primary font-medium py-2 rounded-lg text-sm active:scale-[0.95] transition-all cursor-pointer text-center"
        >
          Good <span className="hidden sm:inline opacity-40 text-xs font-mono ml-1">(3)</span>
        </button>
        <button
          onClick={() => submitRating(5)}
          disabled={isSubmitting}
          className="flex-1 max-w-[120px] bg-success/10 hover:bg-success/20 border border-success/30 text-success font-medium py-2 rounded-lg text-sm active:scale-[0.95] transition-all cursor-pointer text-center"
        >
          Easy <span className="hidden sm:inline opacity-40 text-xs font-mono ml-1">(4)</span>
        </button>
      </div>
    </div>
  );
}

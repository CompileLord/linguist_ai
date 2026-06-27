"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetReviewQueueQuery,
  useRespondToReviewItemMutation,
} from "@/services/reviewApi";
import { MarkdownContent } from "@/components/MarkdownContent";

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/api\/?$/, "");

function resolveAudioUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_ORIGIN}${url}`;
}

const RATINGS = [
  { label: "Again", key: "1", quality: 1, scheme: "error" as const },
  { label: "Hard",  key: "2", quality: 3, scheme: "warning" as const },
  { label: "Good",  key: "3", quality: 4, scheme: "primary" as const },
  { label: "Easy",  key: "4", quality: 5, scheme: "success" as const },
] as const;

const schemeClasses = {
  error:   "bg-red-500/10   hover:bg-red-500/20   border-red-500/30   text-red-400",
  warning: "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400",
  primary: "bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30 text-violet-400",
  success: "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400",
};

export default function ReviewPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "en";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const { data: queue, isLoading, error, refetch } = useGetReviewQueueQuery({ batch_size: 20 });
  const [respondToReviewItem, { isLoading: isSubmitting }] = useRespondToReviewItemMutation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading || !queue || currentIndex >= queue.length) return;
      if (e.code === "Space" && !isRevealed) {
        e.preventDefault();
        setIsRevealed(true);
        return;
      }
      if (isRevealed) {
        const r = RATINGS.find((r) => r.key === e.key);
        if (r) submitRating(r.quality);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, queue, currentIndex, isRevealed]);

  const handlePlayAudio = (url: string) => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    const audio = new Audio(url);
    activeAudioRef.current = audio;
    setIsPlayingAudio(true);
    audio.play().catch(() => setIsPlayingAudio(false));
    audio.onended = () => setIsPlayingAudio(false);
  };

  const submitRating = async (quality: number) => {
    if (!queue || currentIndex >= queue.length || isSubmitting) return;
    try {
      await respondToReviewItem({ itemId: queue[currentIndex].id, quality }).unwrap();
      setXpEarned((p) => p + 10);
      setCompletedCount((p) => p + 1);
      setIsRevealed(false);
      setCurrentIndex((p) => p + 1);
    } catch (err) {
      console.error("Review submit failed:", err);
    }
  };

  /* ── Loading ─────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-on-surface-variant animate-pulse">Loading review queue…</p>
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <span className="material-symbols-outlined text-red-400 text-5xl">error</span>
        <h2 className="text-xl font-bold text-on-surface">Queue Fetch Failed</h2>
        <p className="text-on-surface-variant max-w-sm text-sm">
          Could not load review cards. Check your connection and try again.
        </p>
        <button
          onClick={() => refetch()}
          className="bg-violet-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-violet-500 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const reviewItems = queue ?? [];
  const isFinished = reviewItems.length === 0 || currentIndex >= reviewItems.length;

  /* ── Finished ────────────────────────────────────────────── */
  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center gap-8">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 14 }}
          className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_32px_rgba(16,185,129,0.15)]"
        >
          <span className="material-symbols-outlined text-emerald-400 text-5xl">task_alt</span>
        </motion.div>

        <div>
          <h2 className="text-2xl font-bold text-on-surface mb-2">Session Complete!</h2>
          <p className="text-on-surface-variant text-sm max-w-xs mx-auto leading-relaxed">
            {completedCount > 0
              ? `You reviewed ${completedCount} card${completedCount !== 1 ? "s" : ""} today. Great work!`
              : "No cards due right now. Come back tomorrow!"}
          </p>
        </div>

        {completedCount > 0 && (
          <div className="grid grid-cols-2 gap-4 w-56 p-5 rounded-2xl border border-[#2A2A32] bg-[#15151A]">
            <div className="text-center">
              <p className="text-xs font-semibold text-on-surface-variant mb-1">XP Earned</p>
              <p className="text-2xl font-bold text-violet-400">+{xpEarned}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-on-surface-variant mb-1">Reviewed</p>
              <p className="text-2xl font-bold text-emerald-400">{completedCount}</p>
            </div>
          </div>
        )}

        <button
          onClick={() => router.push("/dashboard")}
          className="bg-violet-600 text-white text-sm font-semibold px-8 py-3 rounded-xl hover:bg-violet-500 transition-colors shadow-[0_0_16px_rgba(124,58,237,0.3)]"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  /* ── Active Card ─────────────────────────────────────────── */
  const currentItem = reviewItems[currentIndex];
  const vocab = currentItem.detail;
  const isGrammar = currentItem.item_type === "grammar";
  const itemTitle = vocab?.word ?? "Grammar Rule";
  const itemTranslation =
    vocab?.translation_context?.[locale] ?? vocab?.translation_context?.["en"] ?? "";
  const itemTranscription = vocab?.transcription ? `/${vocab.transcription}/` : null;
  const cefrLevel = vocab?.cefr_level ?? "";
  const masteryPct = Math.round(currentItem.mastery_percent ?? 0);
  const progressPct = Math.round((currentIndex / reviewItems.length) * 100);

  const explanationMd = [
    itemTranscription ? `*Transcription:* \`${itemTranscription}\`` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <div className="w-full">
      {/* ── Top progress bar ── */}
      <div className="h-1.5 w-full bg-[#1E1E24] mb-8">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-600 to-violet-400"
          initial={false}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* ── Center layout ── */}
      <div className="flex flex-col items-center pb-32">
        {/* Counter */}
        <p className="text-xs font-medium text-on-surface-variant mb-5 tabular-nums">
          {currentIndex + 1} <span className="opacity-50">/</span> {reviewItems.length}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ width: "100%", maxWidth: "520px" }}
          >
            {/* ── Card ── */}
            <div className="bg-[#15151A] border border-[#2A2A32] rounded-2xl overflow-hidden shadow-2xl">
              {/* Card header strip */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#2A2A32] bg-[#1A1A21]">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    isGrammar
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      : "bg-violet-500/10 border-violet-500/20 text-violet-400"
                  }`}
                >
                  {isGrammar ? "Grammar" : "Vocabulary"}
                </span>

                <div className="flex items-center gap-3">
                  {cefrLevel && (
                    <span className="text-xs font-mono text-on-surface-variant">{cefrLevel}</span>
                  )}
                  {/* Mastery mini-bar */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-14 h-1.5 bg-[#2A2A32] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500/60 rounded-full transition-all duration-500"
                        style={{ width: `${masteryPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-on-surface-variant tabular-nums">
                      {masteryPct}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Front face */}
              <div
                style={{ minHeight: "200px" }}
                className="px-8 pt-10 pb-6 flex flex-col items-center justify-center gap-3"
              >
                <p
                  className="text-4xl font-bold text-on-surface text-center leading-snug"
                  style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                >
                  {itemTitle}
                </p>
                {cefrLevel && (
                  <span className="text-xs italic text-on-surface-variant">
                    Difficulty: {cefrLevel}
                  </span>
                )}
              </div>

              {/* Reveal / Answer area */}
              <div className="px-6 pb-6">
                {!isRevealed ? (
                  <button
                    onClick={() => setIsRevealed(true)}
                    className="w-full py-3 rounded-xl border border-[#2A2A32] hover:border-violet-500/40 text-on-surface-variant hover:text-violet-400 transition-all duration-150 text-sm font-medium flex items-center justify-center gap-2 group"
                  >
                    <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">
                      visibility
                    </span>
                    Reveal Answer
                    <kbd className="text-[10px] font-mono opacity-30 ml-1 border border-current rounded px-1">
                      Space
                    </kbd>
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {/* Divider */}
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-[#2A2A32] to-transparent mb-5" />

                    {/* Translation */}
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <p className="text-2xl font-bold text-on-surface text-center">
                        {itemTranslation}
                      </p>
                      {vocab?.audio_url && (
                        <button
                          onClick={() => handlePlayAudio(resolveAudioUrl(vocab.audio_url!))}
                          className="shrink-0 w-9 h-9 rounded-full bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 flex items-center justify-center transition-all"
                          aria-label="Play audio"
                        >
                          <span className="material-symbols-outlined text-lg">
                            {isPlayingAudio ? "pause" : "volume_up"}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Transcription / markdown notes */}
                    {itemTranscription && (
                      <p className="text-sm text-center text-on-surface-variant font-mono mb-4">
                        {itemTranscription}
                      </p>
                    )}

                    {explanationMd && (
                      <div className="mt-2 pt-4 border-t border-[#2A2A32]">
                        <MarkdownContent content={explanationMd} className="text-sm" />
                      </div>
                    )}

                    {/* Keyboard hint */}
                    <div className="flex items-center justify-center gap-2 mt-5 opacity-50">
                      <span className="text-[10px] text-on-surface-variant">Rate:</span>
                      {RATINGS.map((r) => (
                        <kbd
                          key={r.key}
                          className="text-[10px] font-mono bg-[#1A1A21] border border-[#2A2A32] text-on-surface-variant px-1.5 py-0.5 rounded"
                        >
                          {r.key}
                        </kbd>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Dot progress */}
            <div className="flex justify-center gap-1.5 mt-5 flex-wrap">
              {reviewItems.slice(0, 30).map((_, idx) => (
                <div
                  key={idx}
                  className={`rounded-full transition-all duration-300 ${
                    idx < currentIndex
                      ? "w-1.5 h-1.5 bg-emerald-500/50"
                      : idx === currentIndex
                      ? "w-3 h-1.5 bg-violet-500"
                      : "w-1.5 h-1.5 bg-[#2A2A32]"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom rating bar ── */}
      <AnimatePresence>
        {isRevealed && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-0 left-0 md:left-64 right-0 z-50 bg-[#15151A]/95 backdrop-blur-md border-t border-[#2A2A32] px-4 py-3 shadow-2xl"
          >
            <div
              style={{ maxWidth: "520px" }}
              className="flex gap-2 mx-auto"
            >
              {RATINGS.map(({ label, key, quality, scheme }) => (
                <button
                  key={label}
                  onClick={() => submitRating(quality)}
                  disabled={isSubmitting}
                  className={`flex-1 flex flex-col items-center py-3 rounded-xl border text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 cursor-pointer ${schemeClasses[scheme]}`}
                >
                  {label}
                  <span className="text-[10px] font-mono opacity-40 mt-0.5">{key}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

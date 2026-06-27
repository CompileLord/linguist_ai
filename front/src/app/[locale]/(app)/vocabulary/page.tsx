"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";
import {
  useGetVocabularyListQuery,
  useGetUserVocabularyQuery,
  useAddUserWordMutation,
  useGenerateAudioMutation,
} from "@/services/vocabularyApi";
import { useGetNextLessonQuery } from "@/services/lessonApi";
import { Card } from "@/components/ui/Card";
import { motion, AnimatePresence } from "framer-motion";

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');

export default function VocabularyPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";

  const [activeTab, setActiveTab] = useState<"deck" | "dictionary">("deck");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCefr, setSelectedCefr] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: nextLesson } = useGetNextLessonQuery();
  const { data: userVocabResponse, isLoading: isLoadingUserVocab } = useGetUserVocabularyQuery({
    sort_by: "last_reviewed_at",
    page: 1,
    per_page: 50,
  });

  const userVocabItems = userVocabResponse?.items || [];
  const extractedLanguageId =
    userVocabItems[0]?.vocabulary?.language_id ||
    (nextLesson as any)?.language_id ||
    "f28abcfd-773a-446d-9b1e-b85fc92eb09c";

  const { data: dictionaryResponse, isLoading: isLoadingDict } = useGetVocabularyListQuery(
    {
      language_id: extractedLanguageId,
      search: searchTerm || undefined,
      cefr_level: selectedCefr === "all" ? undefined : selectedCefr,
      page: 1,
      per_page: 50,
    },
    { skip: activeTab !== "dictionary" }
  );

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generateAudio] = useGenerateAudioMutation();

  const resolveAudioUrl = (url: string) =>
    url.startsWith('http') ? url : `${API_ORIGIN}${url}`;

  const handlePlayAudio = (url: string, id: string) => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
      setPlayingId(null);
    }
    const audio = new Audio(resolveAudioUrl(url));
    activeAudioRef.current = audio;
    setPlayingId(id);
    audio.play().catch(() => setPlayingId(null));
    audio.onended = () => setPlayingId(null);
  };

  const handleGenerateAudio = async (vocabId: string, wordId: string) => {
    setGeneratingId(wordId);
    try {
      const result = await generateAudio({ vocabularyId: vocabId }).unwrap();
      if (result.audio_url) {
        handlePlayAudio(result.audio_url, wordId);
      }
    } catch {
      // ignore
    } finally {
      setGeneratingId(null);
    }
  };

  // Filter items in My Deck by search term and selected level locally for performance
  const filteredUserItems = userVocabItems.filter((item) => {
    const vocab = item.vocabulary;
    if (!vocab) return false;
    
    const matchesSearch =
      vocab.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vocab.translation_context[locale] || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesCefr = selectedCefr === "all" || vocab.cefr_level === selectedCefr;

    return matchesSearch && matchesCefr;
  });

  const displayItems = activeTab === "deck" ? filteredUserItems : dictionaryResponse?.items || [];
  const isLoading = activeTab === "deck" ? isLoadingUserVocab : isLoadingDict;

  return (
    <>
    <div className="animate-fade-in space-y-lg pb-12">
      {/* Header Row */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-display text-[#F5F5F7]">Vocabulary Library</h1>
          <p className="text-on-surface-variant font-body-sm">
            Search dictionary words, add custom vocab, and track your spaced repetition stats.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-4 py-2 rounded-xl active:scale-[0.97] transition-all shadow-[0_0_10px_rgba(110,91,255,0.25)]"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Word
        </button>
      </div>

      {/* Tabs Selection */}
      <div className="flex border-b border-outline gap-sm">
        <button
          onClick={() => {
            setActiveTab("deck");
            setSearchTerm("");
          }}
          className={`pb-sm px-xs font-label-md text-sm border-b-2 active:scale-[0.96] transition-all ${
            activeTab === "deck"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          My Deck ({userVocabItems.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("dictionary");
            setSearchTerm("");
          }}
          className={`pb-sm px-xs font-label-md text-sm border-b-2 active:scale-[0.96] transition-all ${
            activeTab === "dictionary"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Dictionary
        </button>
      </div>

      {/* Search Bar & CEFR Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
        <div className="relative w-full max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
            search
          </span>
          <input
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#15151A] border border-[#2A2A32] rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/60 transition-all"
            placeholder={activeTab === "deck" ? "Search my deck..." : "Search dictionary..."}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", "A1", "A2", "B1", "B2", "C1", "C2"].map((level) => (
            <button
              key={level}
              onClick={() => setSelectedCefr(level)}
              className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                selectedCefr === level
                  ? "bg-primary text-white border-primary"
                  : "bg-surface border-outline text-on-surface-variant hover:border-primary hover:text-primary"
              }`}
            >
              {level === "all" ? "All" : level}
            </button>
          ))}
        </div>
      </div>

      {/* Vocabulary Display list container */}
      <Card className="overflow-hidden bg-[#15151A] border-outline shadow-md">
        {isLoading ? (
          <div className="p-xl flex flex-col items-center justify-center gap-sm">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-on-surface-variant animate-pulse">Loading words...</p>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="p-xl text-center flex flex-col items-center justify-center gap-xs">
            <span className="material-symbols-outlined text-on-surface-variant text-4xl">
              translate
            </span>
            <p className="text-sm font-semibold text-on-surface mt-sm">No words found</p>
            <p className="text-xs text-on-surface-variant max-w-[280px]">
              Try adjusting your search criteria or add a custom word to start practicing.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1C1C24] border-b border-outline text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  <th className="p-4 pl-md">Word</th>
                  <th className="p-4">Translation</th>
                  <th className="p-4">CEFR</th>
                  {activeTab === "deck" && (
                    <>
                      <th className="p-4 text-center">Reviews</th>
                      <th className="p-4 text-center">Mistakes</th>
                    </>
                  )}
                  <th className="p-4 pr-md text-right">Pronounce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A32] bg-surface">
                {displayItems.map((item: any) => {
                  const vocab = activeTab === "deck" ? item.vocabulary : item;
                  if (!vocab) return null;

                  const wordId = activeTab === "deck" ? item.id : vocab.id;
                  const wordTranslation =
                    vocab.translation_context[locale] || vocab.translation_context["en"] || "";

                  return (
                    <tr key={item.id} className="hover:bg-surface-raised/20 transition-colors group">
                      <td className="p-4 pl-md">
                        <div className="font-bold text-on-surface group-hover:text-primary transition-colors">
                          {vocab.word}
                        </div>
                        {vocab.transcription && (
                          <div className="text-xs text-on-surface-variant font-mono mt-0.5">
                            {vocab.transcription}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-sm text-on-surface-variant">{wordTranslation}</td>
                      <td className="p-4 text-xs font-bold text-primary tabular-nums">
                        {vocab.cefr_level}
                      </td>
                      {activeTab === "deck" && (
                        <>
                          <td className="p-4 text-center text-sm font-semibold tabular-nums text-on-surface">
                            {item.repetitions_count}
                          </td>
                          <td className="p-4 text-center text-sm font-semibold tabular-nums text-error">
                            {item.errors_count}
                          </td>
                        </>
                      )}
                      <td className="p-4 pr-md text-right">
                        {vocab.audio_url ? (
                          <button
                            onClick={() => handlePlayAudio(vocab.audio_url, wordId)}
                            className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary inline-flex items-center justify-center active:scale-[0.96] transition-transform"
                          >
                            <span className="material-symbols-outlined text-lg">
                              {playingId === wordId ? "pause" : "volume_up"}
                            </span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleGenerateAudio(vocab.id, wordId)}
                            disabled={generatingId === wordId}
                            title="Generate pronunciation"
                            className="w-8 h-8 rounded-full bg-surface-bright hover:bg-primary/10 text-on-surface-variant hover:text-primary inline-flex items-center justify-center active:scale-[0.96] transition-all disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-lg">
                              {generatingId === wordId ? "hourglass_empty" : "record_voice_over"}
                            </span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
    <AddWordModal
      open={showAddModal}
      locale={locale}
      languageId={extractedLanguageId}
      onClose={() => setShowAddModal(false)}
    />
    </>
  );
}

function AddWordModal({
  open,
  locale,
  languageId,
  onClose,
}: {
  open: boolean;
  locale: string;
  languageId: string;
  onClose: () => void;
}) {
  const [newWord, setNewWord] = useState("");
  const [newTranslation, setNewTranslation] = useState("");
  const [newCefr, setNewCefr] = useState("A1");
  const [addUserWord, { isLoading: isAdding }] = useAddUserWordMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !newTranslation.trim()) return;
    try {
      await addUserWord({
        language_id: languageId,
        word: newWord.trim(),
        translation_context: { [locale]: newTranslation.trim() },
        cefr_level: newCefr,
      }).unwrap();
      setNewWord("");
      setNewTranslation("");
      setNewCefr("A1");
      onClose();
    } catch (err) {
      console.error("Failed to add word:", err);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="add-word-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(5,5,8,0.82)", backdropFilter: "blur(8px)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            key="add-word-panel"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md rounded-2xl border border-[#2A2A32] shadow-2xl overflow-hidden"
            style={{ backgroundColor: "#15151A" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A32] bg-[#1A1A21]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-violet-400 text-[18px]">add_circle</span>
                </div>
                <h2 className="text-base font-bold text-on-surface">Add Word to Deck</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-[#2A2A32] transition-colors"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant">Word *</label>
                <input
                  required
                  autoFocus
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  placeholder="e.g. delicious"
                  className="w-full bg-[#1E1E24] border border-[#2A2A32] rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-[#6B6B7A] focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/15 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant">Translation *</label>
                <input
                  required
                  value={newTranslation}
                  onChange={(e) => setNewTranslation(e.target.value)}
                  placeholder="e.g. восхитительный"
                  className="w-full bg-[#1E1E24] border border-[#2A2A32] rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-[#6B6B7A] focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/15 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant">CEFR Level</label>
                <div className="flex gap-2 flex-wrap">
                  {["A1", "A2", "B1", "B2", "C1", "C2"].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setNewCefr(lvl)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        newCefr === lvl
                          ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                          : "bg-[#1E1E24] border-[#2A2A32] text-on-surface-variant hover:border-[#3A3A44] hover:text-on-surface"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-[#2A2A32] mt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[#2A2A32] text-sm font-medium text-on-surface-variant hover:bg-[#1E1E24] hover:text-on-surface active:scale-[0.97] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding || !newWord.trim() || !newTranslation.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-500 disabled:opacity-40 active:scale-[0.97] transition-all shadow-[0_0_12px_rgba(124,58,237,0.3)]"
                >
                  {isAdding ? "Adding…" : "Add Word"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

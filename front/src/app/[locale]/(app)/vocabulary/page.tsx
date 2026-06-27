"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useGetVocabularyListQuery,
  useGetUserVocabularyQuery,
  useAddUserWordMutation,
  UserVocabularyItem,
} from "@/services/vocabularyApi";
import { useGetNextLessonQuery } from "@/services/dashboardApi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function VocabularyPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = useTranslations("Lessons"); // Reusing check/back/etc

  const [activeTab, setActiveTab] = useState<"deck" | "dictionary">("deck");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCefr, setSelectedCefr] = useState<string>("all");

  // Query next lesson to obtain language_id as a fallback
  const { data: nextLesson } = useGetNextLessonQuery();
  // Fetch user vocabulary (My Deck)
  const { data: userVocabResponse, isLoading: isLoadingUserVocab } = useGetUserVocabularyQuery({
    sort_by: "last_reviewed_at",
    page: 1,
    per_page: 50,
  });

  // Extract language_id from first item in user vocabulary or fallback to lesson language_id or known default
  const userVocabItems = userVocabResponse?.items || [];
  const extractedLanguageId =
    userVocabItems[0]?.vocabulary?.language_id ||
    (nextLesson as any)?.language_id ||
    "f28abcfd-773a-446d-9b1e-b85fc92eb09c"; // System default UUID fallback

  // Fetch dictionary (All Words)
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

  // Audio elements refs to prevent overlaps
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Custom Word Creation State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newTranslation, setNewTranslation] = useState("");
  const [newCefr, setNewCefr] = useState("A1");
  const [addUserWord, { isLoading: isAddingWord }] = useAddUserWordMutation();

  const handlePlayAudio = (url: string, id: string) => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
      setPlayingId(null);
    }

    const audio = new Audio(url);
    activeAudioRef.current = audio;
    setPlayingId(id);

    audio.play().catch((err) => {
      console.error("Audio playback error:", err);
      setPlayingId(null);
    });

    audio.onended = () => {
      setPlayingId(null);
    };
  };

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord || !newTranslation) return;
    try {
      const translationCtx: Record<string, string> = {};
      translationCtx[locale] = newTranslation;

      await addUserWord({
        language_id: extractedLanguageId,
        word: newWord,
        translation_context: translationCtx,
        cefr_level: newCefr,
      }).unwrap();

      setNewWord("");
      setNewTranslation("");
      setNewCefr("A1");
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to add custom word:", err);
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
    <div className="animate-fade-in space-y-lg pb-12">
      {/* Header Row */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-display text-[#F5F5F7]">Vocabulary Library</h1>
          <p className="text-on-surface-variant font-body-sm">
            Search dictionary words, add custom vocab, and track your spaced repetition stats.
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-xs">
          <span className="material-symbols-outlined text-sm">add</span>
          Add Word
        </Button>
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
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
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

      {/* Add Custom Word Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0C]/80 backdrop-blur-sm flex items-center justify-center p-md animate-fade-in">
          <Card className="w-full max-w-md p-md bg-surface border-outline shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="font-headline-md text-xl font-bold text-on-surface mb-md">
              Add Word to Deck
            </h2>
            <form onSubmit={handleAddWord} className="flex flex-col gap-md">
              <div className="flex flex-col gap-xs">
                <label className="text-xs font-semibold text-on-surface-variant">Word</label>
                <Input
                  required
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  placeholder="e.g. delicious"
                />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="text-xs font-semibold text-on-surface-variant">Translation</label>
                <Input
                  required
                  value={newTranslation}
                  onChange={(e) => setNewTranslation(e.target.value)}
                  placeholder="e.g. восхитительный"
                />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="text-xs font-semibold text-on-surface-variant">CEFR Level</label>
                <select
                  value={newCefr}
                  onChange={(e) => setNewCefr(e.target.value)}
                  className="w-full bg-[#1E1E24] border border-[#2A2A32] rounded-lg py-2 px-3 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                >
                  {["A1", "A2", "B1", "B2", "C1", "C2"].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-sm mt-sm">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isAddingWord} className="flex-1">
                  {isAddingWord ? "Adding..." : "Add Word"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

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
                        {vocab.audio_url && (
                          <button
                            onClick={() => handlePlayAudio(vocab.audio_url, wordId)}
                            className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary inline-flex items-center justify-center active:scale-[0.96] transition-transform"
                          >
                            <span className="material-symbols-outlined text-lg">
                              {playingId === wordId ? "pause" : "volume_up"}
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
  );
}

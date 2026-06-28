"use client";

import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { useGetLessonByIdQuery, useGenerateLessonTtsMutation } from "@/services/lessonApi";
import { MarkdownContent } from "@/components/MarkdownContent";
import { Button } from "@/components/ui/Button";
import { resolveAudioUrl } from "../lessonUtils";

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -24 },
  transition: { duration: 0.25 },
} as const;

export default function VocabularyPage() {
  const params   = useParams();
  const router   = useRouter();
  const lessonId = params.lesson_id as string;

  const { data: lesson, isLoading, error } = useGetLessonByIdQuery(lessonId);
  const [generateTts] = useGenerateLessonTtsMutation();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingIdx, setPlayingIdx]   = useState<number | null>(null);
  const [vocabUrls, setVocabUrls]     = useState<Record<number, string>>({});
  const [loadingIdx, setLoadingIdx]   = useState<Record<number, boolean>>({});

  if (isLoading) return <PageLoader />;
  if (error || !lesson) return <PageError router={router} />;

  const vocabulary = lesson.content.vocabulary || [];

  const handlePlay = async (word: string, audioUrl: string | undefined, idx: number) => {
    const resolved = vocabUrls[idx] || (audioUrl ? resolveAudioUrl(audioUrl) : undefined);
    if (resolved) {
      playUrl(resolved, idx);
      return;
    }
    setLoadingIdx((p) => ({ ...p, [idx]: true }));
    try {
      const res = await generateTts({ text: word, language_code: "en" }).unwrap();
      if (res.audio_url) {
        const url = resolveAudioUrl(res.audio_url);
        setVocabUrls((p) => ({ ...p, [idx]: url }));
        playUrl(url, idx);
      }
    } catch { /* silent */ } finally {
      setLoadingIdx((p) => ({ ...p, [idx]: false }));
    }
  };

  const playUrl = (url: string, idx: number) => {
    audioRef.current?.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingIdx(idx);
    audio.play().catch(() => setPlayingIdx(null));
    audio.onended = () => setPlayingIdx(null);
  };

  return (
    <motion.div {...slide} className="flex flex-col gap-lg max-w-[800px] mx-auto w-full px-sm md:px-xl py-lg">

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Vocabulary</p>
        <h1 className="text-2xl font-bold text-on-surface mb-1">New Words</h1>
        <p className="text-on-surface-variant text-sm">{vocabulary.length} words from this lesson — review before practicing.</p>
      </div>

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
                  <button
                    onClick={() => handlePlay(v.word, v.audio_url, i)}
                    disabled={loadingIdx[i]}
                    className="w-7 h-7 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center mx-auto transition-colors disabled:opacity-50"
                  >
                    {loadingIdx[i] ? (
                      <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin block" />
                    ) : (
                      <span className="material-symbols-outlined text-[14px]">
                        {playingIdx === i ? "pause" : "volume_up"}
                      </span>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {vocabulary.filter((v) => v.example_sentence).length > 0 && (
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
      )}

      <div className="flex gap-sm">
        <Button variant="outline" onClick={() => router.push(`/lessons/${lessonId}/theory` as any)} className="flex-1 flex items-center justify-center gap-xs py-3">
          <span className="material-symbols-outlined">arrow_back</span> Back
        </Button>
        <Button onClick={() => router.push(`/lessons/${lessonId}/reading` as any)} className="flex-1 flex items-center justify-center gap-xs py-3">
          Next <span className="material-symbols-outlined">arrow_forward</span>
        </Button>
      </div>
    </motion.div>
  );
}

function PageLoader() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-md py-20">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
function PageError({ router }: { router: any }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-md py-20 text-center">
      <span className="material-symbols-outlined text-error text-5xl">error</span>
      <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
    </div>
  );
}

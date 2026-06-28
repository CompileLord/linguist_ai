"use client";

import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { useGetLessonByIdQuery } from "@/services/lessonApi";
import { MarkdownContent } from "@/components/MarkdownContent";
import { Button } from "@/components/ui/Button";
import { resolveAudioUrl } from "../lessonUtils";

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -24 },
  transition: { duration: 0.25 },
} as const;

export default function TheoryPage() {
  const params   = useParams();
  const router   = useRouter();
  const lessonId = params.lesson_id as string;

  const { data: lesson, isLoading, error } = useGetLessonByIdQuery(lessonId);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playTheory = (url: string) => {
    audioRef.current?.pause();
    const audio = new Audio(resolveAudioUrl(url));
    audioRef.current = audio;
    setIsPlaying(true);
    audio.play().catch(() => setIsPlaying(false));
    audio.onended = () => setIsPlaying(false);
  };

  if (isLoading) return <PageLoader />;
  if (error || !lesson) return <PageError router={router} />;

  const { content } = lesson;
  const examples = content.examples || [];

  return (
    <motion.div {...slide} className="flex flex-col gap-lg max-w-[800px] mx-auto w-full px-sm md:px-xl py-lg">

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
            onClick={() => playTheory(lesson.audio_urls!.theory!)}
            className="flex items-center gap-xs text-sm shrink-0"
          >
            <span className="material-symbols-outlined text-base">
              {isPlaying ? "pause" : "volume_up"}
            </span>
            {isPlaying ? "Playing" : "Listen"}
          </Button>
        )}
      </div>

      <div className="bg-[#15151A] border border-[#2A2A32] rounded-xl p-md">
        <MarkdownContent content={content.theory.explanation} />
      </div>

      {content.theory.grammar_notes && (
        <div className="border-l-4 border-primary rounded-r-xl bg-primary/5 p-md">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Grammar Notes</p>
          <MarkdownContent content={content.theory.grammar_notes} className="text-sm" />
        </div>
      )}

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

      {examples.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">Examples</p>
          <div className="space-y-sm">
            {examples.map((ex, i) => (
              <div key={i} className="flex gap-sm py-sm border-b border-[#2A2A32] last:border-0">
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
                  <span className="text-[10px] font-mono text-on-surface-variant/50 shrink-0 mt-1">{ex.difficulty}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        onClick={() => router.push(`/lessons/${lessonId}/vocabulary` as any)}
        className="w-full py-3 flex items-center justify-center gap-xs"
      >
        Next <span className="material-symbols-outlined">arrow_forward</span>
      </Button>
    </motion.div>
  );
}

function PageLoader() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-md py-20">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-on-surface-variant animate-pulse">Loading lesson…</p>
    </div>
  );
}

function PageError({ router }: { router: any }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-md text-center py-20">
      <span className="material-symbols-outlined text-error text-5xl">error</span>
      <h2 className="text-headline-md font-bold text-on-surface">Failed to load lesson</h2>
      <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
    </div>
  );
}

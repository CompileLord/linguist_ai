"use client";

import { createContext, useContext, useState, useRef } from "react";

interface LessonContextValue {
  exAnswers: string[];
  addExAnswer: (answer: string) => void;
  completionData: any | null;
  setCompletionData: (data: any) => void;
  timeStartedRef: React.MutableRefObject<number>;
}

const LessonContext = createContext<LessonContextValue | null>(null);

export function LessonProvider({ children }: { children: React.ReactNode }) {
  const [exAnswers, setExAnswers] = useState<string[]>([]);
  const [completionData, setCompletionData] = useState<any>(null);
  const timeStartedRef = useRef<number>(Date.now());

  const addExAnswer = (answer: string) =>
    setExAnswers((prev) => [...prev, answer]);

  return (
    <LessonContext.Provider
      value={{ exAnswers, addExAnswer, completionData, setCompletionData, timeStartedRef }}
    >
      {children}
    </LessonContext.Provider>
  );
}

export function useLessonContext() {
  const ctx = useContext(LessonContext);
  if (!ctx) throw new Error("useLessonContext must be inside LessonProvider");
  return ctx;
}

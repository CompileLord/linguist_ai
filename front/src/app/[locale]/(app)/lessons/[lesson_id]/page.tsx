"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";

export default function LessonRootPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.lesson_id as string;

  useEffect(() => {
    router.replace(`/lessons/${lessonId}/theory` as any);
  }, [lessonId, router]);

  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

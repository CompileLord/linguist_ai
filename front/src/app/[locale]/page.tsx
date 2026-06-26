"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";

export default function Home() {
  const router = useRouter();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-on-surface">
      <div className="animate-pulse text-sm">Loading...</div>
    </div>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useLoginMutation } from "@/services/authApi";
import { useLazyGetProfileQuery } from "@/services/onboardingApi";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { setCredentials } from "@/store/authSlice";
import { getApiErrorMessage } from "@/lib/apiError";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const MeshBackground = dynamic(() => import("@/components/MeshBackground"), {
  ssr: false,
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useDispatch();
  const t = useTranslations("Auth.Login");
  const [loginApi, { isLoading }] = useLoginMutation();
  const [triggerGetProfile] = useLazyGetProfileQuery();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );
  const isInitialized = useSelector(
    (state: RootState) => state.auth.isInitialized,
  );

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isInitialized, isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setErrorMsg(null);
    try {
      const currentLocale = (params?.locale as "en" | "ru" | "tg") || "en";

      // Submit credentials to backend
      const result = await loginApi({
        email: data.email,
        password: data.password,
      }).unwrap();

      // Store credentials in localStorage and Redux
      if (typeof window !== "undefined") {
        localStorage.setItem("access_token", result.access_token);
        if (result.refresh_token)
          localStorage.setItem("refresh_token", result.refresh_token);
        localStorage.setItem("ui_language", currentLocale);
      }

      dispatch(
        setCredentials({
          token: result.access_token,
          refreshToken: result.refresh_token,
          user: {
            id: result.user.id,
            username: result.user.full_name || result.user.email,
            ui_language: currentLocale,
          },
        }),
      );

      // Fetch user profile to check onboarding status
      try {
        const profile = await triggerGetProfile().unwrap();
        if (profile?.onboarding_completed) {
          router.push("/dashboard");
        } else {
          router.push("/onboarding");
        }
      } catch (profileErr) {
        console.error(
          "Failed to load user profile, redirecting to onboarding:",
          profileErr,
        );
        router.push("/onboarding");
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      setErrorMsg(getApiErrorMessage(err, "Login failed"));
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row text-on-surface bg-background font-body-sm text-body-sm antialiased selection:bg-primary/20 selection:text-primary">
      {/* Form Section */}
      <div
        className="flex-1 flex items-center justify-center p-6 order-1 relative"
        style={{
          background: "#050507",
          backgroundImage:
            "linear-gradient(to right,rgba(110,91,255,.03) 1px,transparent 1px),linear-gradient(to bottom,rgba(110,91,255,.03) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      >
        <div className="absolute inset-0 z-0">
          <MeshBackground />
        </div>
        <main className="w-full max-w-[420px] flex flex-col gap-sm animate-fade-in relative z-10 backdrop-blur-xs">
          {/* Card Container */}
          <div className="bg-black/25  border border-outline rounded-xl p-8 w-full flex flex-col gap-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col gap-1 items-center text-center">
              <span className="font-bold text-xs text-primary uppercase tracking-widest mb-2">
                Linguist AI
              </span>
              <h1 className="font-display text-2xl font-bold text-on-surface tracking-tight text-balance">
                {t("title")}
              </h1>
              <p className="font-body-md text-sm text-on-surface-variant text-pretty">
                {t("subtitle")}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-error/10 border border-error/30 text-error rounded-lg text-sm text-center">
                {errorMsg}
              </div>
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label
                  className="font-label-md text-xs font-semibold text-on-surface-variant"
                  htmlFor="email"
                >
                  {t("email")}
                </label>
                <div className="border border-[#2A2A32] rounded-lg bg-[#15151A] transition-all duration-200 focus-within:border-primary focus-within:shadow-[0_0_14px_rgba(110,91,255,0.15)]">
                  <input
                    {...register("email")}
                    className="w-full bg-transparent border-none text-on-surface font-body-md text-body-md px-3.5 py-2.5 focus:ring-0 focus:outline-none placeholder:text-on-surface-variant/40"
                    id="email"
                    placeholder="name@company.com"
                    type="email"
                  />
                </div>
                {errors.email && (
                  <span className="text-error text-xs mt-1">
                    {errors.email.message}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label
                    className="font-label-md text-xs font-semibold text-on-surface-variant"
                    htmlFor="password"
                  >
                    {t("password")}
                  </label>
                  <Link
                    className="font-label-md text-xs text-primary hover:text-accent-glow hover:underline transition-colors duration-150"
                    href="/forgot-password"
                  >
                    {t("forgot")}
                  </Link>
                </div>
                <div className="border border-[#2A2A32] rounded-lg bg-[#15151A] transition-all duration-200 focus-within:border-primary focus-within:shadow-[0_0_14px_rgba(110,91,255,0.15)]">
                  <input
                    {...register("password")}
                    className="w-full bg-transparent border-none text-on-surface font-body-md text-body-md px-3.5 py-2.5 focus:ring-0 focus:outline-none placeholder:text-on-surface-variant/40"
                    id="password"
                    placeholder="••••••••"
                    type="password"
                  />
                </div>
                {errors.password && (
                  <span className="text-error text-xs mt-1">
                    {errors.password.message}
                  </span>
                )}
              </div>

              <button
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/95 text-white font-medium py-2.5 px-4 rounded-lg active:scale-[0.96] transition-[transform,background-color,border-color,box-shadow] duration-150 mt-2 flex items-center justify-center border border-primary/30 hover:border-[#8B7CFF]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 shadow-[0_0_12px_rgba(110,91,255,0.25)] cursor-pointer disabled:opacity-50"
                type="submit"
              >
                {isLoading ? t("submitting") : t("submit")}
              </button>
            </form>

            <div className="flex items-center gap-sm my-1">
              <div className="h-[1px] flex-1 bg-outline"></div>
              <span className="font-code-sm text-xs text-on-surface-variant uppercase tracking-wider">
                {t("or")}
              </span>
              <div className="h-[1px] flex-1 bg-outline"></div>
            </div>

            <button
              type="button"
              disabled
              title="Coming soon"
              className="w-full bg-[#000] border border-outline text-[#fff ] font-medium py-2.5 px-4 rounded-lg cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none opacity-50"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                ></path>
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                ></path>
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                ></path>
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                ></path>
              </svg>
              {t("login_google")}
              <span className="text-xs text-on-surface-variant/60 ml-1">
                (coming soon)
              </span>
            </button>
            <div className="text-center font-body-sm text-sm text-on-surface-variant">
              {t.rich("no_account", {
                signup: (chunks) => (
                  <Link
                    href="/register"
                    className="text-primary hover:text-accent-glow hover:underline transition-colors duration-150 font-medium ml-1"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Video Section */}
      <div className="flex-1 relative overflow-hidden order-2 min-h-screen">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="https://storage.googleapis.com/linguistai-assets/scenes/scene1-poster.jpg"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source
            src="https://storage.googleapis.com/linguistai-assets/scenes/scene1.webm"
            type="video/webm"
          />
          <source
            src="https://storage.googleapis.com/linguistai-assets/scenes/scene1.mp4"
            type="video/mp4"
          />
        </video>
      </div>
    </div>
  );
}

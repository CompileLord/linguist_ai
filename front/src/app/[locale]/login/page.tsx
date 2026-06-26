"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLoginMutation } from "@/services/authApi";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials } from "@/store/authSlice";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { RootState } from "@/store/store";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useDispatch();
  const t = useTranslations("Auth.Login");
  const [loginApi, { isLoading }] = useLoginMutation();

  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (token) {
      router.replace("/dashboard");
    } else {
      setIsRedirecting(false);
    }
  }, [router]);

  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const emailValue = watch("email", "");
  const passwordValue = watch("password", "");

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim());
  const isPasswordValid = passwordValue.length >= 6;

  const onSubmit = async (data: LoginFormValues) => {
    setLoginError(null);
    try {
      const result = await loginApi({
        email: data.email,
        password: data.password,
      }).unwrap();

      const currentLocale = (params?.locale as "en" | "ru" | "tg") || "ru";

      if (typeof window !== "undefined") {
        localStorage.setItem("access_token", result.access_token);
        localStorage.setItem("refresh_token", result.refresh_token);
        localStorage.setItem("ui_language", currentLocale);
      }

      dispatch(
        setCredentials({
          token: result.access_token,
          user: {
            id: result.user?.id || "1",
            username: result.user?.full_name || data.email.split("@")[0],
            ui_language: currentLocale,
          },
        }),
      );
      router.push("/dashboard");
    } catch (err) {
      console.error("Login failed:", err);
      const apiError = err as { data?: { detail?: { msg?: string }[] | string } };
      if (apiError?.data?.detail) {
        const detail = apiError.data.detail;
        setLoginError(
          Array.isArray(detail) ? detail[0]?.msg || "Login failed" : detail,
        );
      } else {
        setLoginError(t("failed"));
      }
    }
  };

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-surface">
        <div className="text-lg animate-pulse">{t("submitting")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-sm md:p-md text-on-surface font-body-md antialiased selection:bg-primary-container selection:text-white bg-background">
      <main className="w-full max-w-[420px] flex flex-col gap-lg animate-[fadeIn_0.5s_ease-out_forwards]">
        <header className="flex flex-col items-center text-center gap-sm">
          <div className="flex justify-between items-center w-full">
            <div className="font-display text-body-md font-bold text-on-surface tracking-wider">
              LINGUIST AI
            </div>
            <div className="flex gap-2">
              <Link href="/login" locale="en" className={`text-sm ${params?.locale === 'en' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}>EN</Link>
              <Link href="/login" locale="ru" className={`text-sm ${params?.locale === 'ru' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}>RU</Link>
              <Link href="/login" locale="tg" className={`text-sm ${params?.locale === 'tg' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}>TG</Link>
            </div>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-inverse-surface mt-xs">
            {t("title")}
          </h1>
          <p className="font-body-md text-body-md text-[#9A9AA5]">
            {t("subtitle")}
          </p>
        </header>

        {loginError && (
          <div className="bg-error/10 text-error p-sm rounded-lg text-center font-body-sm text-body-sm">
            {loginError}
          </div>
        )}

        <div className="flex flex-col gap-md">
          <Button variant="social" type="button" className="w-full py-3">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {t("signin_google")}
          </Button>

          <div className="relative flex items-center justify-center my-xs">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2A2A32]"></div>
            </div>
            <div className="relative bg-background px-md text-[#62626C] text-label-sm font-label-sm uppercase tracking-wider">
              {t("or")}
            </div>
          </div>
        </div>

        <form className="flex flex-col gap-sm" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-base">
            <label htmlFor="email" className="font-label-md text-label-md text-on-surface-variant sr-only">
              {t("email")}
            </label>
            <Input
              id="email"
              type="email"
              placeholder={t("email_placeholder")}
              {...register("email")}
              disabled={isLoading}
            />
            {errors.email && (
              <span className="text-error text-sm">{t("email_err")}</span>
            )}
          </div>
          <div className="flex flex-col gap-base">
            <label htmlFor="password" className="font-label-md text-label-md text-on-surface-variant sr-only">
              {t("password")}
            </label>
            <Input
              id="password"
              type="password"
              placeholder={t("password_placeholder")}
              {...register("password")}
              disabled={isLoading}
            />
            {errors.password && (
              <span className="text-error text-sm">{t("password_min_err")}</span>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full py-3 mt-xs text-label-lg"
            disabled={isLoading || !isEmailValid || !isPasswordValid}
          >
            {isLoading ? t("submitting") : t("submit")}
          </Button>
        </form>

        <p className="text-center font-body-sm text-body-sm text-[#9A9AA5] mt-sm">
          {t.rich("dont_have_account", {
            signup: (chunks) => (
              <Link
                href="/register"
                className="text-primary hover:text-primary-container transition-colors font-medium cursor-pointer"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </main>

      <div className="fixed bottom-0 w-full overflow-hidden pointer-events-none -z-10 h-64">
        <div className="absolute bottom-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary-container opacity-[0.15] blur-[100px] rounded-[100%] mix-blend-screen"></div>
        <div className="absolute bottom-[-50px] left-[30%] w-[400px] h-[200px] bg-[#6E5BFF] opacity-[0.1] blur-[80px] rounded-[100%] mix-blend-screen"></div>
        <div className="absolute bottom-[-50px] right-[30%] w-[400px] h-[200px] bg-[#B0A6FF] opacity-[0.1] blur-[80px] rounded-[100%] mix-blend-screen"></div>
      </div>
    </div>
  );
}

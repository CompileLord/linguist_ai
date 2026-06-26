"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useRegisterMutation } from "@/services/authApi";
import { useDispatch } from "react-redux";
import { setCredentials } from "@/store/authSlice";
import { useTranslations } from "next-intl";
import { useState } from "react";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useDispatch();
  const t = useTranslations("Auth.Register");
  const [registerApi, { isLoading }] = useRegisterMutation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const passwordValue = watch("password", "");
  const passwordLength = passwordValue.length;
  const hasNum = /\d/.test(passwordValue);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(passwordValue);

  const isReq1 = passwordLength >= 8;
  const isReq2 = passwordLength >= 8 && hasNum;
  const isReq3 = passwordLength >= 8 && hasNum && hasSpecial;

  const onSubmit = async (data: RegisterFormValues) => {
    setErrorMsg(null);
    try {
      const currentLocale = (params?.locale as "en" | "ru" | "tg") || "en";
      const result = await registerApi({
        email: data.email,
        password: data.password,
        full_name: data.name,
        voice_name: "hfc_female", // default voice
      }).unwrap();

      dispatch(
        setCredentials({
          token: result.access_token,
          user: {
            id: result.user.id,
            username: result.user.full_name || data.name,
            ui_language: currentLocale,
          },
        }),
      );
      router.push("/onboarding");
    } catch (err: any) {
      console.error("Registration failed:", err);
      const detail = err?.data?.detail || err?.data || err?.error || err?.message || "Registration failed";
      setErrorMsg(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-sm md:p-md text-on-surface bg-background font-body-md antialiased selection:bg-primary/20 selection:text-primary">
      <main className="w-full max-w-[420px] flex flex-col gap-sm animate-fade-in">
        {/* Card Container */}
        <div className="bg-surface rounded-xl border border-outline p-8 w-full flex flex-col gap-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col gap-1 items-center text-center">
            <span className="font-bold text-xs text-primary uppercase tracking-widest mb-2">Linguist AI</span>
            <h1 className="font-display text-2xl font-bold text-on-surface tracking-tight text-balance">
              {t("title")}
            </h1>
            <p className="font-body-md text-sm text-on-surface-variant text-pretty">
              {t("subtitle")}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-surface-raised border border-outline text-on-surface font-medium hover:bg-[#1E1E24] active:scale-[0.96] transition-[transform,background-color,border-color] duration-150 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
              </svg>
              {t("signup_google")}
            </button>

            <div className="flex items-center gap-sm my-1">
              <div className="h-[1px] flex-1 bg-outline"></div>
              <span className="font-code-sm text-xs text-on-surface-variant uppercase tracking-wider">{t("or")}</span>
              <div className="h-[1px] flex-1 bg-outline"></div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-error/10 border border-error/30 text-error rounded-lg text-sm text-center">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-xs font-semibold text-on-surface-variant" htmlFor="name">
                  {t("full_name")}
                </label>
                <input
                  {...register("name")}
                  className="w-full bg-surface-raised border border-outline rounded-lg text-on-surface placeholder:text-on-surface-variant/40 font-body-md text-body-md px-3.5 py-2.5 focus:border-primary focus:ring-0 focus:outline-none transition-all duration-200 focus:shadow-[0_0_14px_rgba(110,91,255,0.15)]"
                  id="name"
                  placeholder={t("full_name")}
                  type="text"
                />
                {errors.name && <span className="text-error text-xs mt-1">{t("name_min_err")}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-xs font-semibold text-on-surface-variant" htmlFor="email">
                  {t("email")}
                </label>
                <input
                  {...register("email")}
                  className="w-full bg-surface-raised border border-outline rounded-lg text-on-surface placeholder:text-on-surface-variant/40 font-body-md text-body-md px-3.5 py-2.5 focus:border-primary focus:ring-0 focus:outline-none transition-all duration-200 focus:shadow-[0_0_14px_rgba(110,91,255,0.15)]"
                  id="email"
                  placeholder="name@example.com"
                  type="email"
                />
                {errors.email && <span className="text-error text-xs mt-1">{t("email_err")}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-xs font-semibold text-on-surface-variant" htmlFor="password">
                  {t("password")}
                </label>
                <input
                  {...register("password")}
                  className="w-full bg-surface-raised border border-[#2A2A32] rounded-lg text-on-surface placeholder:text-on-surface-variant/40 font-body-md text-body-md px-3.5 py-2.5 focus:border-primary focus:ring-0 focus:outline-none transition-all duration-200 focus:shadow-[0_0_14px_rgba(110,91,255,0.15)]"
                  id="password"
                  placeholder="••••••••"
                  type="password"
                />
                <div className="flex gap-1.5 mt-1.5 px-0.5">
                  <div
                    className={`h-1 w-full max-w-[24px] rounded-full transition-colors duration-300 ${
                      isReq1 ? "bg-primary opacity-70" : "bg-outline"
                    }`}
                  ></div>
                  <div
                    className={`h-1 w-full max-w-[24px] rounded-full transition-colors duration-300 ${
                      isReq2 ? "bg-primary opacity-70" : "bg-outline"
                    }`}
                  ></div>
                  <div
                    className={`h-1 w-full max-w-[24px] rounded-full transition-colors duration-300 ${
                      isReq3 ? "bg-primary opacity-70" : "bg-outline"
                    }`}
                  ></div>
                </div>
                {errors.password && <span className="text-error text-xs mt-1">{t("password_min_err")}</span>}
              </div>

              <div className="text-[11px] text-on-surface-variant/80 mt-1 leading-relaxed text-pretty">
                {t.rich("terms", {
                  terms: (chunks) => (
                    <a href="#" className="text-primary hover:text-accent-glow hover:underline transition-colors font-medium">
                      {chunks}
                    </a>
                  ),
                  privacy: (chunks) => (
                    <a href="#" className="text-primary hover:text-accent-glow hover:underline transition-colors font-medium">
                      {chunks}
                    </a>
                  ),
                })}
              </div>

              <button
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/95 text-white font-medium py-2.5 px-4 rounded-lg active:scale-[0.96] transition-[transform,background-color,border-color,box-shadow] duration-150 mt-2 flex items-center justify-center border border-primary/30 hover:border-[#8B7CFF]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 shadow-[0_0_12px_rgba(110,91,255,0.25)] cursor-pointer disabled:opacity-50"
                type="submit"
              >
                {isLoading ? t("submitting") : t("submit")}
              </button>
            </form>
          </div>
        </div>

        <div className="text-center font-body-sm text-sm text-on-surface-variant">
          {t.rich("already_have_account", {
            login: (chunks) => (
              <Link
                href="/login"
                className="text-primary hover:text-accent-glow hover:underline transition-colors duration-150 font-medium ml-1"
              >
                {chunks}
              </Link>
            ),
          })}
        </div>
      </main>
    </div>
  );
}

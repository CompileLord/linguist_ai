"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRegisterMutation } from "@/services/authApi";
import { useDispatch } from "react-redux";
import { setCredentials } from "@/store/authSlice";
import { useTranslations } from "next-intl";

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

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const nameValue = watch("name", "");
  const emailValue = watch("email", "");
  const passwordValue = watch("password", "");

  const isNameValid = nameValue.trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim());
  const isPasswordValid = passwordValue.length >= 8;

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      const result = await registerApi({
        email: data.email,
        password: data.password,
        full_name: data.name,
      }).unwrap();
      
      const currentLocale = (params?.locale as "en" | "ru" | "tg") || "ru";

      dispatch(
        setCredentials({
          token: result.access_token,
          user: { id: "1", username: data.name, ui_language: currentLocale },
        }),
      );
      router.push("/onboarding");
    } catch (err) {
      console.error("Registration failed:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-sm md:p-md text-on-surface font-body-md antialiased selection:bg-primary-container selection:text-white bg-background">
      <main className="w-full max-w-[420px] flex flex-col gap-lg">
        <header className="flex flex-col items-center text-center gap-sm">
          <div className="font-display text-body-md font-bold text-on-surface tracking-wider">
            LINGUIST AI
          </div>
          <h1 className="font-headline-lg text-headline-lg text-inverse-surface mt-xs">
            {t("title")}
          </h1>
          <p className="font-body-md text-body-md text-[#9A9AA5]">
            {t("subtitle")}
          </p>
        </header>

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
            {t("signup_google")}
          </Button>

          <div className="flex items-center gap-4 w-full">
            <div className="h-px flex-1 bg-[#2A2A32]"></div>
            <span className="font-label-md text-label-md text-[#9A9AA5]">
              {t("or")}
            </span>
            <div className="h-px flex-1 bg-[#2A2A32]"></div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-sm"
          >
            <div className="flex flex-col gap-base">
              <label
                htmlFor="name"
                className="font-label-md text-label-md text-on-surface-variant sr-only"
              >
                {t("full_name")}
              </label>
              <Input
                id="name"
                placeholder={t("full_name")}
                type="text"
                {...register("name")}
              />
              {errors.name && (
                <span className="text-error text-sm">{t("name_min_err")}</span>
              )}
            </div>

            <div className="flex flex-col gap-base">
              <label
                htmlFor="email"
                className="font-label-md text-label-md text-on-surface-variant sr-only"
              >
                {t("email")}
              </label>
              <Input
                id="email"
                placeholder={t("email")}
                type="email"
                {...register("email")}
              />
              {errors.email && (
                <span className="text-error text-sm">{t("email_err")}</span>
              )}
            </div>

            <div className="flex flex-col gap-base">
              <label
                htmlFor="password"
                className="font-label-md text-label-md text-on-surface-variant sr-only"
              >
                {t("password")}
              </label>
              <Input
                id="password"
                placeholder={t("password")}
                type="password"
                {...register("password")}
              />
              {errors.password && (
                <span className="text-error text-sm">
                  {t("password_min_err")}
                </span>
              )}

              <div className="flex gap-1 mt-1 px-1">
                <div
                  className="h-1 w-full max-w-[24px] rounded-full transition-colors duration-300"
                  style={{
                    backgroundColor: isNameValid ? "#6E5BFF" : "#2A2A32",
                  }}
                />
                <div
                  className="h-1 w-full max-w-[24px] rounded-full transition-colors duration-300"
                  style={{
                    backgroundColor: isEmailValid ? "#6E5BFF" : "#2A2A32",
                  }}
                />
                <div
                  className="h-1 w-full max-w-[24px] rounded-full transition-colors duration-300"
                  style={{
                    backgroundColor: isPasswordValid ? "#6E5BFF" : "#2A2A32",
                  }}
                />
              </div>
            </div>

            <p className="text-[12px] leading-[16px] text-[#62626C] mt-2">
              {t.rich("terms", {
                terms: (chunks) => (
                  <a
                    href="#"
                    className="underline decoration-[#474555] hover:text-on-surface transition-colors"
                  >
                    {chunks}
                  </a>
                ),
                privacy: (chunks) => (
                  <a
                    href="#"
                    className="underline decoration-[#474555] hover:text-on-surface transition-colors"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </p>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              disabled={isLoading}
            >
              {isLoading ? t("submitting") : t("submit")}
            </Button>
          </form>
        </div>

        <div className="text-center">
          <p className="font-body-sm text-body-sm text-[#9A9AA5]">
            {t.rich("already_have_account", {
              login: (chunks) => (
                <a
                  href="#"
                  className="font-label-md text-label-md text-primary-container hover:underline"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>
      </main>
    </div>
  );
}


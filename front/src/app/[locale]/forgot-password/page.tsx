"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, Link } from "@/i18n/navigation";
import { useState } from "react";

const forgotSchema = z.object({
  username: z.string().min(1, "Username is required"),
  answer: z.string().min(1, "Answer is required"),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = (data: ForgotFormValues) => {
    setSuccess(true);
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-sm md:p-md text-on-surface bg-background font-body-md antialiased selection:bg-primary/20 selection:text-primary">
      <main className="w-full max-w-[420px] flex flex-col gap-sm">
        {/* Card Container */}
        <div className="bg-surface rounded-xl border border-outline p-8 w-full flex flex-col gap-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col gap-1 items-center text-center">
            <span className="font-bold text-xs text-primary uppercase tracking-widest mb-2">
              Linguist AI
            </span>
            <h1 className="font-display text-2xl font-bold text-on-surface tracking-tight text-balance">
              Reset Password
            </h1>
            <p className="font-body-md text-sm text-on-surface-variant text-pretty">
              Enter your account details to recover access
            </p>
          </div>

          {success ? (
            <div className="p-4 bg-success/10 border border-success/30 text-success rounded-lg text-sm text-center">
              Recovery details validated. Redirecting to login...
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label
                  className="font-label-md text-xs font-semibold text-on-surface-variant"
                  htmlFor="username"
                >
                  Username / Email
                </label>
                <input
                  {...register("username")}
                  className="w-full bg-surface-raised border border-outline rounded-lg text-on-surface placeholder:text-on-surface-variant/40 font-body-md text-body-md px-3.5 py-2.5 focus:border-primary focus:ring-0 focus:outline-none transition-all duration-200 focus:shadow-[0_0_14px_rgba(110,91,255,0.15)]"
                  id="username"
                  placeholder="Enter your username or email"
                  type="text"
                />
                {errors.username && (
                  <span className="text-error text-xs mt-1">
                    {errors.username.message}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="font-label-md text-xs font-semibold text-on-surface-variant"
                  htmlFor="answer"
                >
                  Security Question: What was your first pet's name?
                </label>
                <input
                  {...register("answer")}
                  className="w-full bg-surface-raised border border-outline rounded-lg text-on-surface placeholder:text-on-surface-variant/40 font-body-md text-body-md px-3.5 py-2.5 focus:border-primary focus:ring-0 focus:outline-none transition-all duration-200 focus:shadow-[0_0_14px_rgba(110,91,255,0.15)]"
                  id="answer"
                  placeholder="Answer here"
                  type="text"
                />
                {errors.answer && (
                  <span className="text-error text-xs mt-1">
                    {errors.answer.message}
                  </span>
                )}
              </div>

              <button
                className="w-full bg-primary hover:bg-primary/95 text-white font-medium py-2.5 px-4 rounded-lg active:scale-[0.96] transition-[transform,background-color,border-color,box-shadow] duration-150 mt-2 flex items-center justify-center border border-primary/30 hover:border-[#8B7CFF]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 shadow-[0_0_12px_rgba(110,91,255,0.25)] cursor-pointer"
                type="submit"
              >
                Request Reset
              </button>
            </form>
          )}
        </div>

        <div className="text-center font-body-sm text-sm text-on-surface-variant">
          Remembered your password?{" "}
          <Link
            href="/login"
            className="text-primary hover:text-accent-glow hover:underline transition-colors duration-150 font-medium ml-1"
          >
            Log in
          </Link>
        </div>
      </main>
    </div>
  );
}

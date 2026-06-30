"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { logout, setUiLanguage } from "@/store/authSlice";
import { useRouter } from "@/i18n/navigation";
import { useGetQuotaStatusQuery } from "@/services/quotaApi";
import { useGetProfileQuery } from "@/services/onboardingApi";

const SECTION =
  "text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em] mb-2.5 pl-4";
const ROW =
  "flex items-center justify-between py-3.5 px-4 border-b border-outline last:border-0";
const LABEL = "font-label-md text-sm text-on-surface";
const HINT = "text-xs text-on-surface-variant mt-0.5";

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={`relative w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${checked ? "bg-primary" : "bg-outline"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const { data: profile } = useGetProfileQuery();
  const { data: quota } = useGetQuotaStatusQuery();

  const [notifications, setNotifications] = useState(true);
  const [streakReminders, setStreakReminders] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [autoplay, setAutoplay] = useState(false);
  const [lang, setLang] = useState<"en" | "ru" | "tg">(
    user?.ui_language ?? "en",
  );

  const handleLangChange = (l: "en" | "ru" | "tg") => {
    setLang(l);
    dispatch(setUiLanguage(l));
  };

  const handleLogout = () => {
    dispatch(logout());
    router.replace("/login");
  };
  console.log(quota);

  return (
    <div className="animate-fade-in max-w-[800px] mx-auto pb-24 flex flex-col gap-lg">
      {/* Account Profile */}
      <div>
        <div className={SECTION}>Account Profile</div>
        <div className="bg-surface border border-outline rounded-xl shadow-md overflow-hidden">
          <div className={ROW}>
            <div>
              <p className={LABEL}>Full Name</p>
              <p className={HINT}>{user?.username ?? "—"}</p>
            </div>
            <button className="text-xs text-primary hover:underline font-label-md">
              Edit
            </button>
          </div>
          <div className={ROW}>
            <div>
              <p className={LABEL}>Target Language</p>
              <p className={HINT}>
                {profile?.target_language_code?.toUpperCase() ?? "—"}
              </p>
            </div>
          </div>
          <div className={ROW}>
            <div>
              <p className={LABEL}>Current Level</p>
              <p className={HINT}>{profile?.current_level ?? "Not set"}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-label-md">
              {profile?.current_level ?? "—"}
            </span>
          </div>
          <div className={ROW}>
            <div>
              <p className={LABEL}>Daily Goal</p>
              <p className={HINT}>
                {profile?.daily_goal_minutes ?? 15} minutes per day
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* UI Language */}
      <div>
        <div className={SECTION}>Interface Language</div>
        <div className="bg-surface border border-outline rounded-xl shadow-md overflow-hidden">
          <div
            className={ROW.replace("border-b border-outline last:border-0", "")}
          >
            <p className={LABEL}>Language</p>
            <div className="flex gap-1">
              {(["en", "ru", "tg"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => handleLangChange(l)}
                  className={`px-3 py-1 rounded-full text-xs font-label-md border transition-all ${lang === l ? "bg-primary text-white border-[#8B7CFF]/40" : "bg-surface-raised border-outline text-on-surface-variant hover:border-primary/40"}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div>
        <div className={SECTION}>Notifications</div>
        <div className="bg-surface border border-outline rounded-xl shadow-md overflow-hidden">
          <div className={ROW}>
            <div>
              <p className={LABEL}>Push Notifications</p>
              <p className={HINT}>Lesson reminders and achievements</p>
            </div>
            <Toggle
              checked={notifications}
              onChange={() => setNotifications(!notifications)}
            />
          </div>
          <div className={ROW}>
            <div>
              <p className={LABEL}>Streak Reminders</p>
              <p className={HINT}>Daily reminder to keep your streak</p>
            </div>
            <Toggle
              checked={streakReminders}
              onChange={() => setStreakReminders(!streakReminders)}
            />
          </div>
        </div>
      </div>

      {/* Audio */}
      <div>
        <div className={SECTION}>Audio & Playback</div>
        <div className="bg-surface border border-outline rounded-xl shadow-md overflow-hidden">
          <div className={ROW}>
            <div>
              <p className={LABEL}>Sound Effects</p>
              <p className={HINT}>UI sounds and feedback tones</p>
            </div>
            <Toggle
              checked={soundEffects}
              onChange={() => setSoundEffects(!soundEffects)}
            />
          </div>
          <div className={ROW}>
            <div>
              <p className={LABEL}>Autoplay Audio</p>
              <p className={HINT}>Auto-play vocabulary pronunciations</p>
            </div>
            <Toggle
              checked={autoplay}
              onChange={() => setAutoplay(!autoplay)}
            />
          </div>
        </div>
      </div>

      {/* Daily Quotas */}
      {quota && quota.quotas.length > 0 && (
        <div>
          <div className={SECTION}>Daily Usage Quotas</div>
          <div className="bg-surface border border-outline rounded-xl shadow-md overflow-hidden">
            {quota.quotas.map((q) => {
              const pct =
                q.daily_limit > 0
                  ? Math.round((q.current_usage / q.daily_limit) * 100)
                  : 0;
              return (
                <div key={q.function_name} className={ROW}>
                  <div className="flex-1">
                    <p className={LABEL + " capitalize"}>
                      {q.function_name.replace(/_/g, " ")}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-outline rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-error" : pct >= 60 ? "bg-warning" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-on-surface-variant tabular-nums">
                        {q.current_usage}/{q.daily_limit}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div>
        <div className={SECTION}>Account Actions</div>
        <div className="bg-surface border border-outline rounded-xl shadow-md overflow-hidden">
          <div className={ROW}>
            <div>
              <p className={LABEL}>Sign Out</p>
              <p className={HINT}>Sign out of all devices</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-label-md text-error border border-error/30 px-3 py-1.5 rounded-lg hover:bg-error/10 active:scale-95 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

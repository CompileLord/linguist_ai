import { useTranslations } from "next-intl";
import { useDispatch } from "react-redux";
import { setUiLanguage } from "@/store/authSlice";
import { useRouter } from "@/i18n/navigation";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function LanguageSetupStep({ onNext, onBack }: Props) {
  const t = useTranslations("Onboarding.LanguageSetup");
  const t2 = useTranslations("Onboarding.PlacementSelection");

  const dispatch = useDispatch();
  const router = useRouter();

  const languages = [
    { code: "tg", name: "Тоҷикӣ" },
    { code: "ru", name: "Русский" },
    { code: "en", name: "English" },
  ] as const;

  const handleLanguageSelect = (code: "tg" | "ru" | "en") => {
    dispatch(setUiLanguage(code));
    router.replace("/onboarding?step=selection", { locale: code });
  };

  return (
    <div className="w-full max-w-container-max mx-auto px-gutter py-xl flex flex-col items-center justify-center">
      <header className="text-center mb-xl">
        <h1 className="font-display text-display text-[#F5F5F7]">
          {t("title")}
        </h1>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md w-full max-w-[960px]">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageSelect(lang.code)}
            className="group flex items-center justify-center py-xl px-lg bg-[#15151A] border border-[#2A2A32] rounded-[14px] transition-all duration-200 ease-out hover:scale-[1.02] hover:border-primary-container hover:shadow-[0_0_4px_0_rgba(139,124,255,0.2)] focus:outline-none"
          >
            <span className="font-headline-lg text-headline-lg text-[#F5F5F7]">
              {lang.name}
            </span>
          </button>
        ))}
      </div>
      <div>
        {" "}
        <button
          onClick={onBack}
          className="font-label-md text-label-md text-[#62626C] hover:text-on-surface pt-md"
        >
          {t2("back")}
        </button>
      </div>
    </div>
  );
}

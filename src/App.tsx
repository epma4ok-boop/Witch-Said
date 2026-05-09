import { useState, useCallback, useEffect } from "react";
import Home from "@/pages/Home";
import SplashScreen from "@/components/SplashScreen";
import LanguageSelect from "@/components/LanguageSelect";
import { LANG_KEY, type Lang } from "@/data/i18n";

type AppPhase = "splash" | "lang" | "home";

function getSavedLang(): Lang | null {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "ru" || v === "en") return v;
  } catch {}
  return null;
}

export default function App() {
  const [phase, setPhase] = useState<AppPhase>("splash");
  const [lang, setLang] = useState<Lang>("ru");

  const handleSplashDone = useCallback(() => {
    const saved = getSavedLang();
    if (saved) {
      setLang(saved);
      setPhase("home");
    } else {
      setPhase("lang");
    }
  }, []);

  const handleLangSelect = useCallback((chosen: Lang) => {
    try { localStorage.setItem(LANG_KEY, chosen); } catch {}
    setLang(chosen);
    setPhase("home");
  }, []);

  return (
    <>
      {phase === "splash" && <SplashScreen onDone={handleSplashDone} />}
      {phase === "lang" && <LanguageSelect onSelect={handleLangSelect} />}
      {phase === "home" && <Home lang={lang} />}
    </>
  );
}

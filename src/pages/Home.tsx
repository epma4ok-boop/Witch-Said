import { useState, useEffect, useCallback, useRef } from "react";
import EclipseCanvas, { type EclipseColor } from "@/components/EclipseCanvas";
import HistoryPanel, { type HistoryEntry } from "@/components/HistoryPanel";
import { PREDICTIONS } from "@/data/predictions";
import { useMysticSound } from "@/hooks/useMysticSound";

// Characteristic root frequency per category (used for switch sound tuning)
const CATEGORY_FREQ: Record<string, number> = {
  love: 415,  // Ab4 — warm, emotional
  work: 523,  // C5  — clear, decisive
  money: 659, // E5  — bright, hopeful
};

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        HapticFeedback?: {
          impactOccurred: (style: string) => void;
          notificationOccurred: (type: string) => void;
        };
        showPopup?: (params: object, callback: (btnId: string) => void) => void;
        openTelegramLink?: (url: string) => void;
        initDataUnsafe?: { user?: { username?: string } };
      };
    };
  }
}

type Category = "love" | "work" | "money";

const CATEGORY_CONFIG: Record<Category, {
  emoji: string; label: string; color: EclipseColor;
  accent: string; glow: string; border: string; activeBg: string;
}> = {
  love: {
    emoji: "💗", label: "ЛЮБОВЬ",
    color: { r: 220, g: 40, b: 80 },
    accent: "#ff4466", glow: "rgba(220,40,80,0.7)",
    border: "rgba(220,60,90,0.5)", activeBg: "rgba(180,30,60,0.75)",
  },
  work: {
    emoji: "⚙️", label: "РАБОТА",
    color: { r: 60, g: 140, b: 255 },
    accent: "#5599ff", glow: "rgba(60,140,255,0.7)",
    border: "rgba(80,150,255,0.5)", activeBg: "rgba(30,90,200,0.75)",
  },
  money: {
    emoji: "📊", label: "ДЕНЬГИ",
    color: { r: 40, g: 200, b: 100 },
    accent: "#33dd77", glow: "rgba(40,200,100,0.7)",
    border: "rgba(50,200,100,0.5)", activeBg: "rgba(20,140,60,0.75)",
  },
};

const HISTORY_KEY = "universe_history";
const MAX_HISTORY = 20;

function loadHistory(): HistoryEntry[] {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(-MAX_HISTORY)));
}

export default function Home() {
  const tg = window.Telegram?.WebApp;
  const referralCode = useRef("universe_" + Math.random().toString(36).substr(2, 8));

  const [category, setCategory] = useState<Category>("love");
  const [isCasting, setIsCasting] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [predictionText, setPredictionText] = useState("ВСЕЛЕННАЯ ГОВОРИТ");
  const [hintText, setHintText] = useState("КОСНИСЬ ЗАТМЕНИЯ · ОТКРОЙ ИСТИНУ");
  const [revealProgress, setRevealProgress] = useState(1);
  const [flashTrigger, setFlashTrigger] = useState(0);
  const [catPulseTrigger, setCatPulseTrigger] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());

  const revealRafRef = useRef<number>(0);
  const swipeStartYRef = useRef<number | null>(null);
  const cfg = CATEGORY_CONFIG[category];
  const { playInvoke, playReveal, playSwitch } = useMysticSound();

  useEffect(() => {
    if (tg) { tg.ready(); tg.expand(); }
  }, [tg]);

  // Global swipe-up to open history
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      swipeStartYRef.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (swipeStartYRef.current === null) return;
      const delta = swipeStartYRef.current - e.changedTouches[0].clientY;
      if (delta > 70 && !historyOpen) setHistoryOpen(true);
      swipeStartYRef.current = null;
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [historyOpen]);

  const animateReveal = useCallback((duration: number) => {
    cancelAnimationFrame(revealRafRef.current);
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      setRevealProgress(eased);
      if (p < 1) revealRafRef.current = requestAnimationFrame(tick);
    };
    revealRafRef.current = requestAnimationFrame(tick);
  }, []);

  const getReferralLink = useCallback(() => {
    const bot = tg?.initDataUnsafe?.user?.username ?? "universe_speaks_bot";
    return `https://t.me/${bot}?startapp=${referralCode.current}`;
  }, [tg]);

  const handleTap = useCallback(async () => {
    if (isCasting || historyOpen) return;

    setIsCasting(true);
    setFlashTrigger((n) => n + 1);
    tg?.HapticFeedback?.impactOccurred("medium");
    playInvoke();

    setRevealProgress(0);
    setPredictionText("");
    setHintText("ВСЕЛЕННАЯ ОТВЕЧАЕТ...");
    animateReveal(600);

    await new Promise((r) => setTimeout(r, 1300));

    const preds = PREDICTIONS[category];
    const answer = preds[Math.floor(Math.random() * preds.length)];
    setCurrentAnswer(answer);
    setPredictionText(answer);
    setRevealProgress(0);
    setFlashTrigger((n) => n + 1);
    tg?.HapticFeedback?.notificationOccurred("success");
    playReveal();
    setHintText("✦  ПОСЛАНИЕ ПОЛУЧЕНО  ✦");
    animateReveal(answer.length * 55);

    // Save to history
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      text: answer,
      category,
      date: new Date().toISOString(),
    };
    setHistory((prev) => {
      const updated = [...prev, entry].slice(-MAX_HISTORY);
      saveHistory(updated);
      return updated;
    });

    setIsCasting(false);
  }, [isCasting, historyOpen, category, tg, animateReveal]);

  const handleShare = useCallback(() => {
    if (!currentAnswer) { setHintText("СНАЧАЛА ПОЛУЧИ ПОСЛАНИЕ"); return; }
    const text = `🌌 ${currentAnswer} 🌌`;
    const link = getReferralLink();
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    } else { alert(`${text}\n${link}`); }
  }, [currentAnswer, getReferralLink, tg]);

  const handleInvite = useCallback(() => {
    const link = getReferralLink();
    const text = "🌌 Загляни в солнечное затмение — вселенная отвечает на твои вопросы";
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    } else { alert("👥 Пригласить: " + link); }
  }, [getReferralLink, tg]);

  const handleCategoryClick = (cat: Category) => {
    if (isCasting) return;
    setCategory(cat);
    setCatPulseTrigger((n) => n + 1);
    playSwitch(CATEGORY_FREQ[cat]);
    setPredictionText("ВСЕЛЕННАЯ ГОВОРИТ");
    setRevealProgress(1);
    setHintText("КОСНИСЬ ЗАТМЕНИЯ · ОТКРОЙ ИСТИНУ");
  };

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: "#030508" }}>
      <EclipseCanvas
        onTap={handleTap}
        isCasting={isCasting}
        flashTrigger={flashTrigger}
        catPulseTrigger={catPulseTrigger}
        color={cfg.color}
        predictionText={predictionText}
        revealProgress={revealProgress}
        hintText={hintText}
      />

      <div className="relative z-10 flex flex-col justify-between h-full px-4 pt-8 pb-8 max-w-lg mx-auto pointer-events-none">

        {/* TOP: category pills */}
        <div className="flex justify-center pointer-events-auto">
          <div className="flex gap-2">
            {(Object.keys(CATEGORY_CONFIG) as Category[]).map((cat) => {
              const c = CATEGORY_CONFIG[cat];
              const isActive = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryClick(cat)}
                  className="px-4 py-2 rounded-full text-[11px] font-bold tracking-widest border transition-all duration-300 backdrop-blur-md uppercase"
                  style={{
                    background: isActive ? c.activeBg : "rgba(5,8,18,0.75)",
                    border: `1px solid ${isActive ? c.accent : "rgba(255,255,255,0.07)"}`,
                    color: isActive ? "#fff" : "rgba(255,255,255,0.38)",
                    boxShadow: isActive ? `0 0 20px ${c.glow}, 0 0 6px ${c.glow}` : "none",
                    fontFamily: "monospace",
                    letterSpacing: "0.14em",
                  }}
                >
                  {c.emoji} {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* BOTTOM */}
        <div className="flex flex-col items-center gap-3 pointer-events-auto">

          {/* Swipe hint */}
          <button
            onClick={() => setHistoryOpen(true)}
            className="flex flex-col items-center gap-1 active:opacity-60 transition-opacity"
            style={{ pointerEvents: "auto" }}
          >
            <span
              className="text-[10px] tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.22)", fontFamily: "monospace" }}
            >
              {history.length > 0 ? `${history.length} посланий` : "История"}
            </span>
            <div
              className="flex flex-col items-center gap-0.5"
              style={{ color: `${cfg.accent}55` }}
            >
              <span style={{ fontSize: 10, lineHeight: 1 }}>▲</span>
              <span style={{ fontSize: 8, lineHeight: 1, opacity: 0.6 }}>▲</span>
            </div>
          </button>

          {/* Action buttons */}
          <div className="flex gap-2.5 justify-center w-full">
            {[
              { label: "📤 ПОДЕЛИТЬСЯ", onClick: handleShare },
              { label: "👥 ПРИГЛАСИТЬ", onClick: handleInvite },
            ].map(({ label, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="flex-1 max-w-[140px] text-center py-2.5 px-3 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all duration-200 active:scale-95"
                style={{
                  background: "rgba(3,5,12,0.82)",
                  backdropFilter: "blur(10px)",
                  border: `1px solid ${cfg.border}`,
                  color: "rgba(255,255,255,0.65)",
                  fontFamily: "monospace",
                  letterSpacing: "0.1em",
                  transition: "border-color 0.5s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History panel */}
      <HistoryPanel
        entries={history}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        accentColor={cfg.accent}
        accentGlow={cfg.glow}
      />
    </div>
  );
}

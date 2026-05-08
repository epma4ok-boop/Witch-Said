import { useState, useEffect, useCallback, useRef } from "react";
import EclipseCanvas, { type EclipseColor } from "@/components/EclipseCanvas";
import HistoryPanel, { type HistoryEntry } from "@/components/HistoryPanel";
import { PREDICTIONS } from "@/data/predictions";
import { useMysticSound } from "@/hooks/useMysticSound";

const CATEGORY_FREQ: Record<string, number> = {
  love: 415,
  work: 523,
  money: 659,
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
    <div className="relative w-full h-screen overflow-hidden" style={{ background: "#030508", height: "100dvh" }}>
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

      {/* Кнопки категорий — вверху, кнопки действий — приподняты */}
      <div className="absolute inset-x-0 top-5 z-10 flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto">
          <div className="category-panel-large">
            {(Object.keys(CATEGORY_CONFIG) as Category[]).map((cat) => {
              const isActive = category === cat;
              const label = CATEGORY_CONFIG[cat].label;
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryClick(cat)}
                  className={`category-btn-large ${isActive ? "active" : ""}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Кнопки действий и истории — подняты выше, прижаты к низу, но с отступом */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-8 pointer-events-none" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
        <div className="flex flex-col items-center gap-3 pointer-events-auto">
          <div className="flex gap-3 justify-center w-full">
            <button onClick={handleShare} className="action-btn-large">
              <span className="action-icon">↑</span>
              <span className="action-label">ПОДЕЛИТЬСЯ</span>
            </button>
            <button onClick={handleInvite} className="action-btn-large">
              <span className="action-icon">✦</span>
              <span className="action-label">ПРИГЛАСИТЬ</span>
            </button>
          </div>
          <button onClick={() => setHistoryOpen(true)} className="history-btn">
            <span className="history-icon">📜</span>
            <span className="history-label">ПОСЛЕДНИЕ {history.length} ПРЕДСКАЗАНИЙ</span>
            <span className="history-arrow">▲</span>
          </button>
        </div>
      </div>

      <HistoryPanel
        entries={history}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        accentColor={cfg.accent}
        accentGlow={cfg.glow}
      />

      <style>{`
        .category-panel-large {
          display: flex;
          justify-content: center;
          gap: 0.8rem;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(20px);
          border-radius: 60px;
          padding: 0.5rem 1rem;
          border: 0.5px solid rgba(255, 255, 255, 0.12);
        }
        .category-btn-large {
          background: transparent;
          border: none;
          padding: 0.6rem 1.2rem;
          border-radius: 40px;
          font-size: 0.85rem;
          font-weight: 500;
          letter-spacing: 3px;
          text-transform: uppercase;
          font-family: 'Raleway', monospace;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .category-btn-large.active {
          color: white;
          background: rgba(255, 255, 255, 0.1);
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.08);
        }
        .action-btn-large {
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(16px);
          border: 0.5px solid rgba(255, 255, 255, 0.15);
          border-radius: 50px;
          padding: 0.7rem 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          flex: 1;
          max-width: 150px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .action-btn-large:active {
          transform: scale(0.96);
          background: rgba(255, 255, 255, 0.15);
        }
        .action-icon {
          font-size: 0.9rem;
          opacity: 0.8;
        }
        .action-label {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          font-family: 'Raleway', monospace;
          color: rgba(255, 255, 255, 0.9);
        }
        .history-btn {
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
          border: 0.5px solid rgba(255, 255, 255, 0.1);
          border-radius: 40px;
          padding: 0.5rem 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .history-btn:active {
          transform: scale(0.96);
          background: rgba(255, 255, 255, 0.08);
        }
        .history-icon {
          font-size: 0.8rem;
          opacity: 0.6;
        }
        .history-label {
          font-size: 0.6rem;
          font-weight: 500;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          font-family: 'Raleway', monospace;
          color: rgba(255, 255, 255, 0.7);
        }
        .history-arrow {
          font-size: 0.6rem;
          opacity: 0.5;
          transform: rotate(180deg);
        }
      `}</style>
    </div>
  );
}

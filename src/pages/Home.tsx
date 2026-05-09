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
        viewportHeight: number;
        viewportStableHeight: number;
        isExpanded: boolean;
        onEvent: (event: string, handler: () => void) => void;
        offEvent: (event: string, handler: () => void) => void;
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

function getTgViewportHeight(): number {
  const tg = window.Telegram?.WebApp;
  if (tg && tg.viewportStableHeight && tg.viewportStableHeight > 100) {
    return tg.viewportStableHeight;
  }
  return window.innerHeight;
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
  const [viewportHeight, setViewportHeight] = useState(() => getTgViewportHeight());

  const revealRafRef = useRef<number>(0);
  const swipeStartYRef = useRef<number | null>(null);
  const cfg = CATEGORY_CONFIG[category];
  const { playInvoke, playReveal, playSwitch } = useMysticSound();

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }

    const updateHeight = () => setViewportHeight(getTgViewportHeight());

    if (tg) tg.onEvent("viewportChanged", updateHeight);
    window.addEventListener("resize", updateHeight);
    const t = setTimeout(updateHeight, 300);

    return () => {
      if (tg) tg.offEvent("viewportChanged", updateHeight);
      window.removeEventListener("resize", updateHeight);
      clearTimeout(t);
    };
  }, [tg]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => { swipeStartYRef.current = e.touches[0].clientY; };
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

  const { r: cr, g: cg, b: cb } = cfg.color;

  return (
    <div
      style={{
        background: "#030508",
        height: `${viewportHeight}px`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── Category tabs ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          paddingTop: 28,
          paddingBottom: 4,
          position: "relative",
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {(Object.keys(CATEGORY_CONFIG) as Category[]).map((cat) => {
            const c = CATEGORY_CONFIG[cat];
            const isActive = category === cat;
            return (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  fontFamily: "monospace",
                  textTransform: "uppercase",
                  border: `1px solid ${isActive ? c.accent : "rgba(255,255,255,0.07)"}`,
                  background: isActive ? c.activeBg : "rgba(5,8,18,0.75)",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.38)",
                  boxShadow: isActive ? `0 0 20px ${c.glow}, 0 0 6px ${c.glow}` : "none",
                  backdropFilter: "blur(12px)",
                  transition: "all 0.3s",
                  cursor: "pointer",
                }}
              >
                {c.emoji} {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Eclipse canvas (flex-1 so it takes remaining space) ── */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
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
      </div>

      {/* ── Bottom: history + share/invite ── */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          paddingBottom: 24,
          paddingTop: 6,
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* History trigger */}
        <button
          onClick={() => setHistoryOpen(true)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "2px 12px",
          }}
        >
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ color: `${cfg.accent}66`, fontSize: 9, lineHeight: 1 }}>▲</span>
            <span
              style={{
                color: "rgba(255,255,255,0.2)",
                fontSize: 9,
                letterSpacing: "0.2em",
                fontFamily: "'Raleway', sans-serif",
                fontWeight: 300,
                textTransform: "uppercase",
              }}
            >
              {history.length > 0 ? `${history.length} посланий` : "история"}
            </span>
            <span style={{ color: `${cfg.accent}66`, fontSize: 9, lineHeight: 1 }}>▲</span>
          </div>
        </button>

        {/* Share / Invite buttons */}
        <div style={{ display: "flex", gap: 12, paddingLeft: 20, paddingRight: 20, width: "100%", maxWidth: 380, boxSizing: "border-box" }}>
          {[
            { label: "Поделиться", sub: "ПОСЛАНИЕ", icon: "✦", onClick: handleShare },
            { label: "Пригласить", sub: "ДРУГА", icon: "☽", onClick: handleInvite },
          ].map(({ label, sub, icon, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                padding: "12px 8px",
                borderRadius: 16,
                background: `linear-gradient(160deg, rgba(${cr},${cg},${cb},0.12) 0%, rgba(2,3,10,0.9) 100%)`,
                border: `0.5px solid rgba(${cr},${cg},${cb},0.35)`,
                boxShadow: `0 0 22px rgba(${cr},${cg},${cb},0.15), inset 0 1px 0 rgba(255,255,255,0.05)`,
                backdropFilter: "blur(20px)",
                cursor: "pointer",
                transition: "all 0.25s",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <span style={{ fontSize: 14, color: `rgba(${cr},${cg},${cb},0.75)`, lineHeight: 1, marginBottom: 2 }}>
                {icon}
              </span>
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 15,
                  fontWeight: 400,
                  color: "rgba(255,252,245,0.9)",
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontFamily: "'Raleway', sans-serif",
                  fontWeight: 200,
                  fontSize: 8,
                  color: `rgba(${cr},${cg},${cb},0.55)`,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  lineHeight: 1,
                }}
              >
                {sub}
              </span>
            </button>
          ))}
        </div>
      </div>

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

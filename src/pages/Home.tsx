import { useState, useEffect, useCallback, useRef } from "react";
import EclipseCanvas, { type EclipseColor } from "@/components/EclipseCanvas";
import HistoryPanel, { type HistoryEntry } from "@/components/HistoryPanel";
import { PREDICTIONS } from "@/data/predictions";
import { PREDICTIONS_EN, UI, type Lang } from "@/data/i18n";
import { useMysticSound } from "@/hooks/useMysticSound";

const CATEGORY_FREQ: Record<string, number> = {
  love: 415, work: 523, money: 659,
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
        openTelegramLink?: (url: string) => void;
        initDataUnsafe?: { user?: { username?: string } };
      };
    };
  }
}

type Category = "love" | "work" | "money";

const CATEGORY_CONFIG: Record<Category, {
  color: EclipseColor;
  accent: string; glow: string; activeBg: string;
}> = {
  love:  { color: { r: 220, g: 40,  b: 80  }, accent: "#ff4466", glow: "rgba(220,40,80,0.7)",   activeBg: "rgba(180,30,60,0.6)"  },
  work:  { color: { r: 60,  g: 140, b: 255 }, accent: "#5599ff", glow: "rgba(60,140,255,0.7)",  activeBg: "rgba(30,90,200,0.6)"  },
  money: { color: { r: 40,  g: 200, b: 100 }, accent: "#33dd77", glow: "rgba(40,200,100,0.7)",  activeBg: "rgba(20,140,60,0.6)"  },
};

const HISTORY_KEY = "universe_history";
const MAX_HISTORY = 20;

function loadHistory(): HistoryEntry[] {
  try { const s = localStorage.getItem(HISTORY_KEY); if (s) return JSON.parse(s); } catch {}
  return [];
}
function saveHistory(e: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(e.slice(-MAX_HISTORY)));
}
function getTgViewportHeight(): number {
  const tg = window.Telegram?.WebApp;
  if (tg && tg.viewportStableHeight && tg.viewportStableHeight > 100) return tg.viewportStableHeight;
  return window.innerHeight;
}

interface HomeProps { lang: Lang; }

export default function Home({ lang }: HomeProps) {
  const t = UI[lang];
  const predictions = lang === "en" ? PREDICTIONS_EN : PREDICTIONS;

  const tg = window.Telegram?.WebApp;
  const referralCode = useRef("universe_" + Math.random().toString(36).substr(2, 8));

  const [category, setCategory] = useState<Category>("love");
  const [isCasting, setIsCasting] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [predictionText, setPredictionText] = useState<string>(t.oracle);
  const [hintText, setHintText] = useState<string>(t.hint);
  const [revealProgress, setRevealProgress] = useState(1);
  const [flashTrigger, setFlashTrigger] = useState(0);
  const [catPulseTrigger, setCatPulseTrigger] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [viewportHeight, setViewportHeight] = useState(() => getTgViewportHeight());
  const [question, setQuestion] = useState("");

  const revealRafRef = useRef<number>(0);
  const swipeStartYRef = useRef<number | null>(null);
  const cfg = CATEGORY_CONFIG[category];
  const { playInvoke, playReveal, playSwitch } = useMysticSound();
  const { r: cr, g: cg, b: cb } = cfg.color;

  // Update oracle text when language changes
  useEffect(() => {
    setPredictionText(t.oracle);
    setHintText(t.hint);
    setCurrentAnswer("");
  }, [lang, t.oracle, t.hint]);

  useEffect(() => {
    if (tg) { tg.ready(); tg.expand(); }
    const updateHeight = () => setViewportHeight(getTgViewportHeight());
    if (tg) tg.onEvent("viewportChanged", updateHeight);
    window.addEventListener("resize", updateHeight);
    const timer = setTimeout(updateHeight, 300);
    return () => { if (tg) tg.offEvent("viewportChanged", updateHeight); window.removeEventListener("resize", updateHeight); clearTimeout(timer); };
  }, [tg]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => { swipeStartYRef.current = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      if (swipeStartYRef.current === null) return;
      if (swipeStartYRef.current - e.changedTouches[0].clientY > 70 && !historyOpen) setHistoryOpen(true);
      swipeStartYRef.current = null;
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => { document.removeEventListener("touchstart", onTouchStart); document.removeEventListener("touchend", onTouchEnd); };
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
    setFlashTrigger(n => n + 1);
    tg?.HapticFeedback?.impactOccurred("medium");
    playInvoke();
    setRevealProgress(0);
    setPredictionText("");
    setHintText(t.answering);
    animateReveal(600);
    await new Promise(r => setTimeout(r, 1300));
    const preds = predictions[category];
    const answer = preds[Math.floor(Math.random() * preds.length)];
    setCurrentAnswer(answer);
    setPredictionText(answer);
    setRevealProgress(0);
    setFlashTrigger(n => n + 1);
    tg?.HapticFeedback?.notificationOccurred("success");
    playReveal();
    setHintText(t.received);
    animateReveal(answer.length * 55);
    const entry: HistoryEntry = { id: Date.now().toString(), text: answer, category, date: new Date().toISOString(), question: question.trim() || undefined };
    setHistory(prev => { const updated = [...prev, entry].slice(-MAX_HISTORY); saveHistory(updated); return updated; });
    setIsCasting(false);
  }, [isCasting, historyOpen, category, tg, animateReveal, predictions, t, question]);

  const handleShare = useCallback(() => {
    if (!currentAnswer) { setHintText(t.firstGet); return; }
    const link = getReferralLink();
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(currentAnswer)}`);
    } else { alert(`${currentAnswer}\n${link}`); }
  }, [currentAnswer, getReferralLink, tg, t]);

  const handleInvite = useCallback(() => {
    const link = getReferralLink();
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(t.inviteText)}`);
    } else { alert(link); }
  }, [getReferralLink, tg, t]);

  const handleCategoryClick = (cat: Category) => {
    if (isCasting) return;
    setCategory(cat);
    setCatPulseTrigger(n => n + 1);
    playSwitch(CATEGORY_FREQ[cat]);
    setPredictionText(t.oracle);
    setRevealProgress(1);
    setHintText(t.hint);
    setCurrentAnswer("");
  };

  const catLabels: Record<Category, string> = {
    love: t.catLove, work: t.catWork, money: t.catMoney,
  };

  return (
    <div style={{ background: "#030508", height: `${viewportHeight}px`, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>

      {/* ── Full-screen ambient glow (behind everything) ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 80% 70% at 50% 48%, rgba(${cr},${cg},${cb},0.13) 0%, rgba(${cr},${cg},${cb},0.05) 45%, transparent 75%)`,
        transition: "background 0.6s",
      }} />

      {/* ── Category tabs ── */}
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 28, paddingBottom: 4, position: "relative", zIndex: 10, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["love", "work", "money"] as Category[]).map((cat) => {
            const c = CATEGORY_CONFIG[cat];
            const isActive = category === cat;
            return (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                style={{
                  padding: "7px 18px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 400,
                  letterSpacing: "0.16em",
                  fontFamily: "'Raleway', sans-serif",
                  textTransform: "uppercase",
                  border: `1px solid ${isActive ? c.accent : "rgba(255,255,255,0.18)"}`,
                  background: isActive ? c.activeBg : "transparent",
                  color: isActive ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.52)",
                  boxShadow: isActive ? `0 0 16px ${c.glow}` : "none",
                  backdropFilter: "blur(12px)",
                  transition: "all 0.35s",
                  cursor: "pointer",
                }}
              >
                {catLabels[cat]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Question input ── */}
      <div style={{ display: "flex", justifyContent: "center", paddingBottom: 6, paddingLeft: 24, paddingRight: 24, position: "relative", zIndex: 10, flexShrink: 0 }}>
        <div style={{ position: "relative", width: "100%", maxWidth: 320 }}>
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder={t.questionPlaceholder}
            maxLength={120}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: `rgba(${cr},${cg},${cb},0.06)`,
              border: `0.5px solid rgba(${cr},${cg},${cb},0.22)`,
              borderRadius: 999,
              padding: "8px 36px 8px 18px",
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: 14,
              color: "rgba(255,252,245,0.75)",
              letterSpacing: "0.04em",
              outline: "none",
              backdropFilter: "blur(12px)",
              caretColor: `rgba(${cr},${cg},${cb},0.9)`,
            }}
          />
          {question && (
            <button
              onClick={() => setQuestion("")}
              style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: `rgba(${cr},${cg},${cb},0.6)`, fontSize: 13, padding: 2, lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Eclipse canvas ── */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        {/* Smooth bottom fade — blends canvas glow into bottom section */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
          background: `linear-gradient(to bottom, transparent 0%, rgba(3,5,8,0.7) 60%, rgba(3,5,8,1) 100%)`,
          zIndex: 5, pointerEvents: "none",
        }} />
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

      {/* ── Bottom ── */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingBottom: 28, paddingTop: 8, position: "relative", zIndex: 10 }}>

        {/* History trigger */}
        <button
          onClick={() => setHistoryOpen(true)}
          style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}
        >
          <div style={{ width: 24, height: 0.5, background: `rgba(${cr},${cg},${cb},0.35)` }} />
          <span style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 200, fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)" }}>
            {history.length > 0 ? t.historyCount(history.length) : t.history}
          </span>
        </button>

        {/* Share / Invite */}
        <div style={{ display: "flex", gap: 10, paddingLeft: 24, paddingRight: 24, width: "100%", maxWidth: 360, boxSizing: "border-box" }}>
          {[
            { label: t.share, onClick: handleShare },
            { label: t.invite, onClick: handleInvite },
          ].map(({ label, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              style={{
                flex: 1,
                padding: "13px 8px",
                borderRadius: 14,
                background: `rgba(${cr},${cg},${cb},0.07)`,
                border: `1px solid rgba(${cr},${cg},${cb},0.4)`,
                boxShadow: `0 0 20px rgba(${cr},${cg},${cb},0.12)`,
                backdropFilter: "blur(16px)",
                cursor: "pointer",
                transition: "all 0.25s",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontStyle: "italic",
                fontWeight: 500,
                fontSize: 17,
                color: "rgba(255,252,245,0.9)",
                letterSpacing: "0.06em",
              }}
            >
              {label}
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
        accentRgb={{ r: cr, g: cg, b: cb }}
        lang={lang}
      />
    </div>
  );
}

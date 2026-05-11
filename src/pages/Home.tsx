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

// ── Daily limit system ──────────────────────────────────────────────────────
const LIMITS_KEY = "universe_limits_v2";
const DAILY_LIMIT = 1;

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

type LimitEntry = { date: string; count: number; bonus: number };
type LimitsData = Record<Category, LimitEntry>;

function loadLimits(): LimitsData {
  try {
    const s = localStorage.getItem(LIMITS_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return {
    love:  { date: "", count: 0, bonus: 0 },
    work:  { date: "", count: 0, bonus: 0 },
    money: { date: "", count: 0, bonus: 0 },
  };
}

function saveLimits(l: LimitsData) {
  localStorage.setItem(LIMITS_KEY, JSON.stringify(l));
}

function getRemainingToday(limits: LimitsData, cat: Category): number {
  const today = getTodayStr();
  const entry = limits[cat];
  const usedToday = entry.date === today ? entry.count : 0;
  const bonusToday = entry.date === today ? entry.bonus : 0;
  return Math.max(0, DAILY_LIMIT + bonusToday - usedToday);
}
// ───────────────────────────────────────────────────────────────────────────

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

// ── Share image generation ──────────────────────────────────────────────────
async function generateShareImage(
  text: string,
  color: EclipseColor,
  watermark: string,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const size = 1080;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(null); return; }

      const { r, g, b } = color;

      // Background
      ctx.fillStyle = "#030508";
      ctx.fillRect(0, 0, size, size);

      // Ambient glow
      const ambient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.75);
      ambient.addColorStop(0, `rgba(${r},${g},${b},0.20)`);
      ambient.addColorStop(0.5, `rgba(${r},${g},${b},0.07)`);
      ambient.addColorStop(1, "transparent");
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = ambient;
      ctx.fillRect(0, 0, size, size);
      ctx.restore();

      // Eclipse placement
      const eclipseCx = size / 2;
      const eclipseCy = size * 0.38;
      const eclipseR = size * 0.26;

      // Halo
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(eclipseCx, eclipseCy, eclipseR * 0.9, eclipseCx, eclipseCy, eclipseR * 3.0);
      halo.addColorStop(0, `rgba(${r},${g},${b},0.38)`);
      halo.addColorStop(0.25, `rgba(${r},${g},${b},0.15)`);
      halo.addColorStop(0.6, `rgba(${r},${g},${b},0.04)`);
      halo.addColorStop(1, "transparent");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(eclipseCx, eclipseCy, eclipseR * 3.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Disc (dark)
      ctx.fillStyle = "#010203";
      ctx.beginPath();
      ctx.arc(eclipseCx, eclipseCy, eclipseR * 0.958, 0, Math.PI * 2);
      ctx.fill();

      // Ring layers
      const rings = [
        { width: eclipseR * 0.30, alpha: 0.06 },
        { width: eclipseR * 0.13, alpha: 0.16 },
        { width: eclipseR * 0.055, alpha: 0.38 },
        { width: eclipseR * 0.022, alpha: 0.72 },
        { width: eclipseR * 0.008, alpha: 0.96 },
      ];
      for (const ring of rings) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.beginPath();
        ctx.arc(eclipseCx, eclipseCy, eclipseR, 0, Math.PI * 2);
        const wh = 1 - ring.alpha * 0.5;
        const rr = Math.min(255, r + Math.round((255 - r) * wh));
        const gg = Math.min(255, g + Math.round((255 - g) * wh));
        const bb = Math.min(255, b + Math.round((255 - b) * wh));
        ctx.strokeStyle = `rgba(${rr},${gg},${bb},${ring.alpha})`;
        ctx.lineWidth = ring.width;
        ctx.stroke();
        ctx.restore();
      }

      // Stars inside disc
      ctx.save();
      ctx.beginPath();
      ctx.arc(eclipseCx, eclipseCy, eclipseR * 0.93, 0, Math.PI * 2);
      ctx.clip();
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * eclipseR * 0.88;
        const sx = eclipseCx + Math.cos(angle) * dist;
        const sy = eclipseCy + Math.sin(angle) * dist;
        const sa = 0.08 + Math.random() * 0.28;
        const ss = 0.4 + Math.random() * 1.4;
        ctx.globalAlpha = sa;
        ctx.shadowBlur = ss * 5;
        ctx.shadowColor = `rgb(${r},${g},${b})`;
        ctx.fillStyle = `rgba(255,252,248,${sa})`;
        ctx.beginPath();
        ctx.arc(sx, sy, ss, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;

      // ── Prediction text ─────────────────────────────────
      const textAreaTop = eclipseCy + eclipseR * 1.35;
      const textAreaBottom = size - 80;
      const textAreaH = textAreaBottom - textAreaTop;
      const maxTextWidth = size * 0.82;

      function wrapWords(txt: string, maxW: number, fs: number): string[] {
        ctx.font = `italic 700 ${fs}px Georgia, serif`;
        const words = txt.split(" ");
        const lines: string[] = [];
        let cur = "";
        for (const w of words) {
          const test = cur ? cur + " " + w : w;
          if (ctx.measureText(test).width <= maxW) { cur = test; }
          else { if (cur) lines.push(cur); cur = w; }
        }
        if (cur) lines.push(cur);
        return lines;
      }

      let fontSize = 72;
      let lines: string[] = [];
      for (let attempt = 0; attempt < 6; attempt++) {
        lines = wrapWords(text, maxTextWidth, fontSize);
        const totalH = lines.length * (fontSize * 1.48);
        if (lines.length <= 5 && totalH <= textAreaH) break;
        fontSize = Math.max(38, fontSize * 0.84);
      }

      ctx.font = `italic 700 ${fontSize}px Georgia, serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const lineH = fontSize * 1.48;
      const totalH = lines.length * lineH;
      const startY = textAreaTop + (textAreaH - totalH) / 2;

      // Backdrop behind text
      const textCy = startY + totalH / 2;
      ctx.save();
      ctx.globalAlpha = 0.55;
      const textBg = ctx.createRadialGradient(size / 2, textCy, 0, size / 2, textCy, size * 0.45);
      textBg.addColorStop(0, "rgba(0,1,3,0.88)");
      textBg.addColorStop(0.6, "rgba(0,1,3,0.60)");
      textBg.addColorStop(1, "transparent");
      ctx.fillStyle = textBg;
      ctx.fillRect(0, textAreaTop - 20, size, textAreaH + 40);
      ctx.restore();

      // Coloured glow layer
      ctx.save();
      ctx.font = `italic 700 ${fontSize}px Georgia, serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.45;
      ctx.shadowBlur = 32;
      ctx.shadowColor = `rgb(${r},${g},${b})`;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      lines.forEach((line, i) => {
        ctx.fillText(line, size / 2, startY + i * lineH + lineH / 2);
      });
      ctx.restore();

      // Main white text
      ctx.save();
      ctx.font = `italic 700 ${fontSize}px Georgia, serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.96;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(0,0,0,0.95)";
      ctx.fillStyle = "rgba(255,253,248,0.97)";
      lines.forEach((line, i) => {
        ctx.fillText(line, size / 2, startY + i * lineH + lineH / 2);
      });
      ctx.restore();

      // Watermark
      ctx.save();
      ctx.font = `200 24px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillText(watermark, size / 2, size - 44);
      ctx.restore();

      canvas.toBlob((blob) => resolve(blob), "image/png");
    } catch {
      resolve(null);
    }
  });
}
// ───────────────────────────────────────────────────────────────────────────

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
  const [limits, setLimits] = useState<LimitsData>(() => loadLimits());
  const [sharingImage, setSharingImage] = useState(false);

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
    return () => {
      if (tg) tg.offEvent("viewportChanged", updateHeight);
      window.removeEventListener("resize", updateHeight);
      clearTimeout(timer);
    };
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

    const remaining = getRemainingToday(limits, category);
    if (remaining <= 0) {
      setFlashTrigger(n => n + 1);
      tg?.HapticFeedback?.notificationOccurred("error");
      setHintText(t.limitReached);
      return;
    }

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

    // Update limits
    const today = getTodayStr();
    setLimits(prev => {
      const updated = { ...prev };
      const entry = updated[category];
      if (entry.date !== today) {
        updated[category] = { date: today, count: 1, bonus: 0 };
      } else {
        updated[category] = { ...entry, count: entry.count + 1 };
      }
      saveLimits(updated);
      return updated;
    });

    const entry: HistoryEntry = {
      id: Date.now().toString(),
      text: answer,
      category,
      date: new Date().toISOString(),
    };
    setHistory(prev => {
      const updated = [...prev, entry].slice(-MAX_HISTORY);
      saveHistory(updated);
      return updated;
    });
    setIsCasting(false);
  }, [isCasting, historyOpen, category, tg, animateReveal, predictions, t, limits]);

  const handleShare = useCallback(async () => {
    if (!currentAnswer) { setHintText(t.firstGet); return; }
    if (sharingImage) return;

    setSharingImage(true);
    const watermark = lang === "ru" ? "ВСЕЛЕННАЯ ГОВОРИТ" : "THE UNIVERSE SPEAKS";

    try {
      const blob = await generateShareImage(currentAnswer, cfg.color, watermark);
      if (blob) {
        const file = new File([blob], "universe.png", { type: "image/png" });
        // Try native share with image (works on iOS/Android)
        if (
          navigator.share &&
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({ files: [file], title: watermark });
          setSharingImage(false);
          return;
        }
        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "universe.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setSharingImage(false);
        return;
      }
    } catch {
      // Sharing cancelled or failed — fall through to text share
    }

    // Final fallback: text share via Telegram
    const link = getReferralLink();
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(currentAnswer)}`
      );
    } else {
      alert(`${currentAnswer}\n${link}`);
    }
    setSharingImage(false);
  }, [currentAnswer, getReferralLink, tg, t, cfg.color, lang, sharingImage]);

  const handleInvite = useCallback(() => {
    // Grant +1 bonus prediction per category today
    const today = getTodayStr();
    setLimits(prev => {
      const updated = { ...prev };
      (["love", "work", "money"] as Category[]).forEach(cat => {
        const entry = updated[cat];
        if (entry.date !== today) {
          updated[cat] = { date: today, count: 0, bonus: 1 };
        } else {
          updated[cat] = { ...entry, bonus: Math.min(entry.bonus + 1, 5) };
        }
      });
      saveLimits(updated);
      return updated;
    });

    setHintText(t.inviteBonus);
    tg?.HapticFeedback?.notificationOccurred("success");

    const link = getReferralLink();
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(t.inviteText)}`
      );
    } else {
      alert(link);
    }
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

  const remaining = getRemainingToday(limits, category);

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

      {/* ── Limit reached notice ── */}
      {remaining === 0 && (
        <div style={{ display: "flex", justifyContent: "center", paddingBottom: 4, position: "relative", zIndex: 10, flexShrink: 0 }}>
          <span style={{
            fontFamily: "'Raleway', sans-serif",
            fontWeight: 200,
            fontSize: 9,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: `rgba(${cr},${cg},${cb},0.45)`,
          }}>
            {t.limitReached}
          </span>
        </div>
      )}

      {/* ── Eclipse canvas ── */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        {/* Smooth bottom fade */}
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
            { label: sharingImage ? "..." : t.share, onClick: handleShare },
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

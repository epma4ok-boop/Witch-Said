import { useState, useCallback, useRef } from "react";
import EclipseCanvas, { type EclipseColor } from "@/components/EclipseCanvas";
import HistoryPanel, { type HistoryEntry } from "@/components/HistoryPanel";
import { PREDICTIONS } from "@/data/predictions";
import { PREDICTIONS_EN, UI, type Lang } from "@/data/i18n";
import { useMysticSound } from "@/hooks/useMysticSound";

// ── Bot name for mini app links ─────────────────────────────────────────────
// Change this to your actual bot username after setting it up in BotFather
const BOT_USERNAME = "universe_speaks_bot";
// ── Backend endpoint for Stars invoice ──────────────────────────────────────
const STARS_ENDPOINT = "/api/payments/invoice";
// ───────────────────────────────────────────────────────────────────────────

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
        openInvoice?: (url: string, callback: (status: string) => void) => void;
        initDataUnsafe?: { user?: { username?: string; id?: number } };
        initData?: string;
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

// ── Share image generator ────────────────────────────────────────────────────
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
      const cx = size / 2;
      const cy = size / 2 - 40;
      const eclipseR = size * 0.38;

      ctx.fillStyle = "#030508";
      ctx.fillRect(0, 0, size, size);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const ambient = ctx.createRadialGradient(cx, cy, 0, cx, cy, eclipseR * 3.2);
      ambient.addColorStop(0, `rgba(${r},${g},${b},0.22)`);
      ambient.addColorStop(0.45, `rgba(${r},${g},${b},0.07)`);
      ambient.addColorStop(1, "transparent");
      ctx.fillStyle = ambient;
      ctx.fillRect(0, 0, size, size);
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(cx, cy, eclipseR * 0.9, cx, cy, eclipseR * 2.8);
      halo.addColorStop(0, `rgba(${r},${g},${b},0.32)`);
      halo.addColorStop(0.3, `rgba(${r},${g},${b},0.12)`);
      halo.addColorStop(1, "transparent");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, eclipseR * 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const ringLayers = [
        { width: eclipseR * 0.32, alpha: 0.06 },
        { width: eclipseR * 0.14, alpha: 0.14 },
        { width: eclipseR * 0.065, alpha: 0.36 },
        { width: eclipseR * 0.028, alpha: 0.70 },
        { width: eclipseR * 0.010, alpha: 0.95 },
      ];
      for (const layer of ringLayers) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.beginPath();
        ctx.arc(cx, cy, eclipseR, 0, Math.PI * 2);
        const wh = 1 - layer.alpha * 0.5;
        const rr = Math.min(255, r + Math.round((255 - r) * wh));
        const gg = Math.min(255, g + Math.round((255 - g) * wh));
        const bb = Math.min(255, b + Math.round((255 - b) * wh));
        ctx.strokeStyle = `rgba(${rr},${gg},${bb},${layer.alpha})`;
        ctx.lineWidth = layer.width;
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = "#010203";
      ctx.beginPath();
      ctx.arc(cx, cy, eclipseR * 0.955, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, eclipseR * 0.93, 0, Math.PI * 2);
      ctx.clip();
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * eclipseR * 0.88;
        const sx = cx + Math.cos(angle) * dist;
        const sy = cy + Math.sin(angle) * dist;
        const sa = 0.06 + Math.random() * 0.22;
        const ss = 0.4 + Math.random() * 1.2;
        ctx.globalAlpha = sa;
        ctx.shadowBlur = ss * 6;
        ctx.shadowColor = `rgb(${r},${g},${b})`;
        ctx.fillStyle = `rgba(255,252,248,${sa})`;
        ctx.beginPath();
        ctx.arc(sx, sy, ss, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;

      const maxWidth = eclipseR * 1.62;
      const c2d = ctx;
      function wrapWords(txt: string, maxW: number, fs: number): string[] {
        c2d.font = `italic 700 ${fs}px 'Cormorant Garamond', Georgia, serif`;
        const words = txt.split(" ");
        const lines: string[] = [];
        let cur = "";
        for (const w of words) {
          const test = cur ? cur + " " + w : w;
          if (c2d.measureText(test).width <= maxW) { cur = test; }
          else { if (cur) lines.push(cur); cur = w; }
        }
        if (cur) lines.push(cur);
        return lines;
      }

      let fontSize = Math.min(58, eclipseR * 0.155);
      let lines: string[] = [];
      for (let attempt = 0; attempt < 5; attempt++) {
        lines = wrapWords(text, maxWidth, fontSize);
        if (lines.length <= 4) break;
        fontSize = Math.max(22, fontSize * 0.84);
      }

      const lineH = fontSize * 1.52;
      const totalH = lines.length * lineH;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, eclipseR * 0.93, 0, Math.PI * 2);
      ctx.clip();

      const padX = eclipseR * 0.72;
      const padY = totalH * 0.55 + fontSize * 0.4;
      ctx.save();
      ctx.globalAlpha = 0.70;
      const backdrop = ctx.createRadialGradient(cx, cy, 0, cx, cy, padX);
      backdrop.addColorStop(0, "rgba(0,1,3,0.94)");
      backdrop.addColorStop(0.6, "rgba(0,1,3,0.80)");
      backdrop.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = backdrop;
      ctx.beginPath();
      ctx.ellipse(cx, cy, padX, padY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.font = `italic 700 ${fontSize}px 'Cormorant Garamond', Georgia, serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      lines.forEach((line, i) => {
        const lineY = cy - totalH / 2 + i * lineH + lineH / 2;
        ctx.save();
        ctx.globalAlpha = 0.50;
        ctx.shadowBlur = 30;
        ctx.shadowColor = `rgb(${r},${g},${b})`;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillText(line, cx, lineY);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.97;
        ctx.shadowBlur = 6;
        ctx.shadowColor = "rgba(0,0,0,0.95)";
        ctx.fillStyle = "rgba(255,253,248,0.97)";
        ctx.fillText(line, cx, lineY);
        ctx.restore();
      });

      ctx.restore();

      const wmY = cy + eclipseR * 1.32;
      ctx.save();
      ctx.font = `200 22px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.38;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillText(watermark, cx, wmY);
      ctx.restore();

      canvas.toBlob((blob) => resolve(blob), "image/png");
    } catch {
      resolve(null);
    }
  });
}
// ───────────────────────────────────────────────────────────────────────────

// ── Stars Shop Modal ────────────────────────────────────────────────────────
interface StarsShopProps {
  open: boolean;
  onClose: () => void;
  onPurchased: (bonusPredictions: number) => void;
  accentRgb: { r: number; g: number; b: number };
  lang: Lang;
}

// 1 Star = 3 predictions (one per category)
const STARS_PACK = { stars: 1, bonus: 3 };

function StarsShop({ open, onClose, onPurchased, accentRgb, lang }: StarsShopProps) {
  const { r, g, b } = accentRgb;
  const [loading, setLoading] = useState(false);
  const tg = window.Telegram?.WebApp;

  const handleBuy = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (tg?.openInvoice) {
        const initData = tg.initData ?? "";
        const res = await fetch(STARS_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-telegram-init-data": initData,
          },
        });
        const data = await res.json();
        if (data.invoiceLink) {
          tg.openInvoice(data.invoiceLink, (status) => {
            if (status === "paid") {
              onPurchased(STARS_PACK.bonus);
              onClose();
            }
            setLoading(false);
          });
          return;
        }
      }
      // No bot configured yet
      alert(lang === "ru"
        ? "Покупка за Telegram Stars будет доступна после подключения бота. Инструкция в README."
        : "Telegram Stars purchase available after connecting a bot. See README."
      );
    } catch {
      alert(lang === "ru" ? "Ошибка. Попробуй позже." : "Error. Try again later.");
    }
    setLoading(false);
  };

  const title     = lang === "ru" ? "Вселенная устала" : "The universe is tired";
  const subtitle  = lang === "ru" ? "Купи предсказания за ★ Telegram Stars" : "Buy predictions with ★ Telegram Stars";
  const cancelLbl = lang === "ru" ? "Вернуться завтра" : "Come back tomorrow";
  const packLabel = lang === "ru" ? "+3 предсказания (по 1 в каждой теме)" : "+3 predictions (1 per topic)";

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0, zIndex: 40,
          background: "rgba(0,0,0,0.72)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.3s",
        }}
      />

      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 50,
        borderRadius: "24px 24px 0 0",
        background: "rgba(4,5,14,0.98)",
        backdropFilter: "blur(32px)",
        borderTop: `0.5px solid rgba(${r},${g},${b},0.3)`,
        borderLeft: `0.5px solid rgba(${r},${g},${b},0.12)`,
        borderRight: `0.5px solid rgba(${r},${g},${b},0.12)`,
        boxShadow: `0 -16px 60px rgba(0,0,0,0.85), 0 -1px 0 rgba(${r},${g},${b},0.25)`,
        transform: open ? "translateY(0)" : "translateY(110%)",
        transition: "transform 0.45s cubic-bezier(0.32,0.72,0,1)",
        paddingBottom: 28,
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 14, paddingBottom: 6 }}>
          <div style={{ width: 36, height: 3, borderRadius: 99, background: `rgba(${r},${g},${b},0.3)` }} />
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", paddingTop: 8, paddingBottom: 28, paddingLeft: 24, paddingRight: 24 }}>
          <p style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: "italic", fontWeight: 400, fontSize: 26,
            color: "rgba(255,252,245,0.92)", margin: 0, letterSpacing: "0.03em",
          }}>
            {title}
          </p>
          <p style={{
            fontFamily: "'Raleway', sans-serif",
            fontWeight: 300, fontSize: 12,
            color: `rgba(${r},${g},${b},0.6)`,
            margin: "8px 0 0", letterSpacing: "0.04em",
          }}>
            {subtitle}
          </p>
        </div>

        {/* Single pack */}
        <div style={{ paddingLeft: 20, paddingRight: 20 }}>
          <button
            onClick={handleBuy}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%",
              padding: "18px 20px",
              borderRadius: 18,
              background: `rgba(${r},${g},${b},0.09)`,
              border: `1px solid rgba(${r},${g},${b},${loading ? 0.7 : 0.4})`,
              boxShadow: loading ? `0 0 28px rgba(${r},${g},${b},0.35)` : `0 0 12px rgba(${r},${g},${b},0.1)`,
              cursor: loading ? "default" : "pointer",
              transition: "all 0.2s",
            }}
          >
            <span style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontStyle: "italic", fontWeight: 500, fontSize: 20,
              color: "rgba(255,252,245,0.90)", letterSpacing: "0.02em",
            }}>
              {packLabel}
            </span>
            <span style={{
              fontFamily: "'Raleway', sans-serif",
              fontWeight: 400, fontSize: 18,
              color: `rgba(${r},${g},${b},0.9)`,
              letterSpacing: "0.04em",
              flexShrink: 0,
              marginLeft: 12,
            }}>
              {loading ? "..." : `1 ★`}
            </span>
          </button>
        </div>

        {/* Cancel */}
        <div style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 14 }}>
          <button
            onClick={onClose}
            style={{
              width: "100%", padding: "13px 8px", borderRadius: 14,
              background: "transparent",
              border: "0.5px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
              fontFamily: "'Raleway', sans-serif",
              fontWeight: 300, fontSize: 13, letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)",
            }}
          >
            {cancelLbl}
          </button>
        </div>
      </div>
    </>
  );
}
// ───────────────────────────────────────────────────────────────────────────

interface HomeProps { lang: Lang; }

export default function Home({ lang }: HomeProps) {
  const t = UI[lang];
  const predictions = lang === "en" ? PREDICTIONS_EN : PREDICTIONS;

  const tg = window.Telegram?.WebApp;

  const [category, setCategory] = useState<Category>("love");
  const [isCasting, setIsCasting] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [predictionText, setPredictionText] = useState<string>(t.oracle);
  const [hintText, setHintText] = useState<string>(t.hint);
  const [revealProgress, setRevealProgress] = useState(1);
  const [flashTrigger, setFlashTrigger] = useState(0);
  const [catPulseTrigger, setCatPulseTrigger] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [starsShopOpen, setStarsShopOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [viewportHeight, setViewportHeight] = useState(() => getTgViewportHeight());
  const [limits, setLimits] = useState<LimitsData>(() => loadLimits());
  const [sharingImage, setSharingImage] = useState(false);

  const revealRafRef = useRef<number>(0);
  const swipeStartYRef = useRef<number | null>(null);
  const cfg = CATEGORY_CONFIG[category];
  const { playInvoke, playReveal, playSwitch } = useMysticSound();
  const { r: cr, g: cg, b: cb } = cfg.color;

  // Telegram viewport handling
  useState(() => {
    if (tg) { tg.ready(); tg.expand(); }
    const updateHeight = () => setViewportHeight(getTgViewportHeight());
    if (tg) tg.onEvent("viewportChanged", updateHeight);
    window.addEventListener("resize", updateHeight);
    return () => {
      if (tg) tg.offEvent("viewportChanged", updateHeight);
      window.removeEventListener("resize", updateHeight);
    };
  });

  // Swipe up to open history
  useState(() => {
    const onTouchStart = (e: TouchEvent) => { swipeStartYRef.current = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      if (swipeStartYRef.current === null) return;
      if (swipeStartYRef.current - e.changedTouches[0].clientY > 70 && !historyOpen && !starsShopOpen) {
        setHistoryOpen(true);
      }
      swipeStartYRef.current = null;
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  });

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

  // Mini app link for sharing
  const getMiniAppLink = useCallback(() => {
    return `https://t.me/${BOT_USERNAME}/app`;
  }, []);

  const handleTap = useCallback(async () => {
    if (isCasting || historyOpen || starsShopOpen) return;

    const remaining = getRemainingToday(limits, category);
    if (remaining <= 0) {
      setFlashTrigger(n => n + 1);
      tg?.HapticFeedback?.notificationOccurred("error");
      setStarsShopOpen(true);
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
  }, [isCasting, historyOpen, starsShopOpen, category, tg, animateReveal, predictions, t, limits]);

  const handleStarsPurchased = useCallback((bonusPredictions: number) => {
    const today = getTodayStr();
    setLimits(prev => {
      const updated = { ...prev };
      (["love", "work", "money"] as Category[]).forEach(cat => {
        const entry = updated[cat];
        if (entry.date !== today) {
          updated[cat] = { date: today, count: 0, bonus: bonusPredictions };
        } else {
          updated[cat] = { ...entry, bonus: entry.bonus + bonusPredictions };
        }
      });
      saveLimits(updated);
      return updated;
    });
    tg?.HapticFeedback?.notificationOccurred("success");
  }, [tg]);

  // Share: generates image with prediction + mini app link in text
  const handleShare = useCallback(async () => {
    if (!currentAnswer) { setHintText(t.firstGet); return; }
    if (sharingImage) return;

    setSharingImage(true);
    const watermark = lang === "ru" ? "ВСЕЛЕННАЯ ГОВОРИТ" : "THE UNIVERSE SPEAKS";
    const appLink = getMiniAppLink();

    try {
      const blob = await generateShareImage(currentAnswer, cfg.color, watermark);
      if (blob) {
        const file = new File([blob], "universe.png", { type: "image/png" });
        if (
          navigator.share &&
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({ files: [file], title: watermark, text: appLink });
          setSharingImage(false);
          return;
        }
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
      // fall through to text share
    }

    const shareText = `${currentAnswer}\n\n${appLink}`;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(appLink)}&text=${encodeURIComponent(currentAnswer)}`
      );
    } else {
      alert(shareText);
    }
    setSharingImage(false);
  }, [currentAnswer, getMiniAppLink, tg, t, cfg.color, lang, sharingImage]);

  // Invite: just opens share link, NO instant bonus
  const handleInvite = useCallback(() => {
    const appLink = getMiniAppLink();
    const inviteText = t.inviteText;
    tg?.HapticFeedback?.impactOccurred("light");
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(appLink)}&text=${encodeURIComponent(inviteText)}`
      );
    } else {
      // Fallback: copy to clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(`${inviteText}\n${appLink}`);
      } else {
        alert(`${inviteText}\n${appLink}`);
      }
    }
  }, [getMiniAppLink, tg, t.inviteText]);

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
  const totalRemaining = (["love", "work", "money"] as Category[]).reduce(
    (sum, cat) => sum + getRemainingToday(limits, cat), 0
  );

  return (
    <div style={{ background: "#030508", height: `${viewportHeight}px`, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>

      {/* Ambient glow */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 80% 70% at 50% 48%, rgba(${cr},${cg},${cb},0.13) 0%, rgba(${cr},${cg},${cb},0.05) 45%, transparent 75%)`,
        transition: "background 0.6s",
      }} />

      {/* Balance badge */}
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}>
        <button
          onClick={() => setStarsShopOpen(true)}
          style={{
            background: `rgba(${cr},${cg},${cb},0.12)`,
            border: `0.5px solid rgba(${cr},${cg},${cb},0.35)`,
            borderRadius: 99,
            padding: "5px 12px",
            cursor: "pointer",
            fontFamily: "'Raleway', sans-serif",
            fontWeight: 300, fontSize: 11,
            color: `rgba(${cr},${cg},${cb},0.85)`,
            letterSpacing: "0.08em",
          }}
        >
          {totalRemaining} ★
        </button>
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 52, paddingBottom: 4, position: "relative", zIndex: 10, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["love", "work", "money"] as Category[]).map((cat) => {
            const c = CATEGORY_CONFIG[cat];
            const isActive = category === cat;
            return (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                style={{
                  padding: "7px 18px", borderRadius: 999,
                  fontSize: 11, fontWeight: 400, letterSpacing: "0.16em",
                  fontFamily: "'Raleway', sans-serif", textTransform: "uppercase",
                  border: `1px solid ${isActive ? c.accent : "rgba(255,255,255,0.18)"}`,
                  background: isActive ? c.activeBg : "transparent",
                  color: isActive ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.52)",
                  boxShadow: isActive ? `0 0 16px ${c.glow}` : "none",
                  backdropFilter: "blur(12px)",
                  transition: "all 0.35s", cursor: "pointer",
                }}
              >
                {catLabels[cat]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Limit notice */}
      {remaining === 0 && (
        <div style={{ display: "flex", justifyContent: "center", paddingBottom: 2, position: "relative", zIndex: 10, flexShrink: 0 }}>
          <button
            onClick={() => setStarsShopOpen(true)}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              fontFamily: "'Raleway', sans-serif", fontWeight: 200, fontSize: 9,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: `rgba(${cr},${cg},${cb},0.5)`,
              padding: "4px 12px",
            }}
          >
            {lang === "ru" ? "ВЕРНИСЬ ЗАВТРА · ИЛИ КУПИ 1 ★" : "COME BACK TOMORROW · OR BUY 1 ★"}
          </button>
        </div>
      )}

      {/* Eclipse canvas */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
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

      {/* Bottom bar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 24px 8px",
        position: "relative", zIndex: 10, flexShrink: 0,
      }}>
        {/* History button */}
        <button
          onClick={() => setHistoryOpen(true)}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            fontFamily: "'Raleway', sans-serif", fontWeight: 200, fontSize: 10,
            letterSpacing: "0.25em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.28)",
            display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2,
          }}
        >
          <span>{t.history}</span>
          <span style={{ fontSize: 8, opacity: 0.6 }}>{t.historyCount(history.length)}</span>
        </button>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleShare}
            disabled={sharingImage}
            style={{
              padding: "9px 18px", borderRadius: 99,
              background: `rgba(${cr},${cg},${cb},0.08)`,
              border: `0.5px solid rgba(${cr},${cg},${cb},0.3)`,
              cursor: "pointer",
              fontFamily: "'Raleway', sans-serif", fontWeight: 300, fontSize: 11,
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: `rgba(${cr},${cg},${cb},0.75)`,
              transition: "all 0.2s",
            }}
          >
            {sharingImage ? "..." : t.share}
          </button>
          <button
            onClick={handleInvite}
            style={{
              padding: "9px 18px", borderRadius: 99,
              background: "transparent",
              border: "0.5px solid rgba(255,255,255,0.15)",
              cursor: "pointer",
              fontFamily: "'Raleway', sans-serif", fontWeight: 300, fontSize: 11,
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.32)",
              transition: "all 0.2s",
            }}
          >
            {t.invite}
          </button>
        </div>
      </div>

      {/* History Panel */}
      <HistoryPanel
        entries={history}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        accentColor={cfg.accent}
        accentGlow={cfg.glow}
        accentRgb={cfg.color}
        lang={lang}
      />

      {/* Stars Shop */}
      <StarsShop
        open={starsShopOpen}
        onClose={() => setStarsShopOpen(false)}
        onPurchased={handleStarsPurchased}
        accentRgb={cfg.color}
        lang={lang}
      />
    </div>
  );
}

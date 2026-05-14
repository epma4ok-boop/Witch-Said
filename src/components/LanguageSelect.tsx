import { useState, useEffect, useRef } from "react";
import type { Lang } from "@/data/i18n";

interface LanguageSelectProps {
  onSelect: (lang: Lang) => void;
}

const COLORS = [
  { r: 220, g: 40,  b: 80  },
  { r: 60,  g: 140, b: 255 },
  { r: 40,  g: 200, b: 100 },
];

export default function LanguageSelect({ onSelect }: LanguageSelectProps) {
  const [chosen, setChosen] = useState<Lang | null>(null);
  const [visible, setVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Animated starfield + tri-color ambient
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    const stars = Array.from({ length: 140 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 0.3 + Math.random() * 1.4,
      alpha: 0.08 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 1.2,
      colorIdx: Math.floor(Math.random() * 3),
    }));

    const orbs = COLORS.map((c, i) => ({
      c,
      angle: (i / 3) * Math.PI * 2,
      dist: 0.22 + Math.random() * 0.08,
      speed: 0.0006 + Math.random() * 0.0004,
    }));

    const start = performance.now();
    let raf: number;

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cx = w / 2;
      const cy = h * 0.40;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#020407";
      ctx.fillRect(0, 0, w, h);

      // Roaming tri-color orbs
      for (const orb of orbs) {
        orb.angle += orb.speed;
        const ox = cx + Math.cos(orb.angle) * w * orb.dist;
        const oy = cy + Math.sin(orb.angle * 0.7) * h * orb.dist * 0.6;
        const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, Math.min(w, h) * 0.55);
        grad.addColorStop(0, `rgba(${orb.c.r},${orb.c.g},${orb.c.b},0.16)`);
        grad.addColorStop(0.5, `rgba(${orb.c.r},${orb.c.g},${orb.c.b},0.05)`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      // Starfield
      for (const s of stars) {
        const c = COLORS[s.colorIdx];
        const pulse = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
        ctx.save();
        ctx.globalAlpha = s.alpha * pulse;
        ctx.fillStyle = "#fffaf5";
        ctx.shadowBlur = s.size * 7;
        ctx.shadowColor = `rgb(${c.r},${c.g},${c.b})`;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Central eclipse decoration
      const eclR = Math.min(w, h) * 0.13;
      const ringLayers = [
        { w: eclR * 0.30, a: 0.06 },
        { w: eclR * 0.13, a: 0.16 },
        { w: eclR * 0.055, a: 0.42 },
        { w: eclR * 0.022, a: 0.82 },
        { w: eclR * 0.008, a: 1.0 },
      ];
      const colorCycle = t * 0.20;
      for (const layer of ringLayers) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 1;
        COLORS.forEach((c, i) => {
          const startA = (i / 3) * Math.PI * 2 + colorCycle;
          const endA = ((i + 1) / 3) * Math.PI * 2 + colorCycle;
          ctx.beginPath();
          ctx.arc(cx, cy, eclR, startA, endA);
          const wh = 1 - layer.a * 0.5;
          ctx.strokeStyle = `rgba(${Math.min(255, c.r + Math.round((255 - c.r) * wh))},${Math.min(255, c.g + Math.round((255 - c.g) * wh))},${Math.min(255, c.b + Math.round((255 - c.b) * wh))},${layer.a})`;
          ctx.lineWidth = layer.w;
          ctx.stroke();
        });
        ctx.restore();
      }
      // Dark disc
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, eclR * 0.87, 0, Math.PI * 2);
      ctx.fillStyle = "#010203";
      ctx.fill();
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const pick = (lang: Lang) => {
    setChosen(lang);
    setTimeout(() => onSelect(lang), 500);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        opacity: chosen ? 0 : visible ? 1 : 0,
        transition: chosen ? "opacity 0.5s ease" : "opacity 0.6s ease",
        pointerEvents: chosen ? "none" : "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column",
        alignItems: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.9s ease, transform 0.9s ease",
      }}>
        {/* Eclipse sits above as decoration — canvas handles it */}
        <div style={{ height: "20vw", maxHeight: 90 }} />

        {/* Main title */}
        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: "italic",
          fontWeight: 400,
          fontSize: "clamp(28px, 8vw, 40px)",
          color: "rgba(255,252,245,0.95)",
          letterSpacing: "0.05em",
          margin: 0,
          textAlign: "center",
          textShadow: "0 0 40px rgba(220,40,80,0.55), 0 0 80px rgba(60,140,255,0.25), 0 2px 8px rgba(0,0,0,0.9)",
        }}>
          Вселенная говорит
        </p>

        {/* Subtitle */}
        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: "clamp(14px, 4vw, 18px)",
          color: "rgba(255,252,245,0.32)",
          letterSpacing: "0.08em",
          margin: "6px 0 0",
          textAlign: "center",
        }}>
          Universe Speaks
        </p>

        {/* Tri-color separator */}
        <div style={{ display: "flex", gap: 5, margin: "24px 0 32px" }}>
          {["rgba(220,40,80,0.7)", "rgba(60,140,255,0.7)", "rgba(40,200,100,0.7)"].map((c, i) => (
            <div key={i} style={{
              width: 28, height: 1,
              background: c,
              boxShadow: `0 0 8px ${c}`,
              borderRadius: 1,
            }} />
          ))}
        </div>

        {/* Prompt */}
        <p style={{
          fontFamily: "'Raleway', sans-serif",
          fontWeight: 200,
          fontSize: 11,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.35)",
          margin: "0 0 28px",
          textAlign: "center",
        }}>
          Выберите язык · Choose language
        </p>

        {/* Language buttons */}
        <div style={{ display: "flex", gap: 14 }}>
          {([
            { lang: "ru" as Lang, primary: "Русский",  sub: "Russian",     color: "220,40,80" },
            { lang: "en" as Lang, primary: "English",  sub: "Английский",  color: "60,140,255" },
          ]).map(({ lang, primary, sub, color }) => (
            <button
              key={lang}
              onClick={() => pick(lang)}
              style={{
                width: 148,
                padding: "22px 14px",
                borderRadius: 20,
                background: `rgba(${color},0.08)`,
                border: `1px solid rgba(${color},0.35)`,
                boxShadow: `0 0 32px rgba(${color},0.12), inset 0 0 20px rgba(${color},0.04)`,
                backdropFilter: "blur(20px)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                transition: "all 0.22s",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = `rgba(${color},0.16)`;
                el.style.borderColor = `rgba(${color},0.65)`;
                el.style.boxShadow = `0 0 48px rgba(${color},0.28), inset 0 0 24px rgba(${color},0.08)`;
                el.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = `rgba(${color},0.08)`;
                el.style.borderColor = `rgba(${color},0.35)`;
                el.style.boxShadow = `0 0 32px rgba(${color},0.12), inset 0 0 20px rgba(${color},0.04)`;
                el.style.transform = "translateY(0)";
              }}
            >
              <span style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontStyle: "italic",
                fontWeight: 500,
                fontSize: 24,
                color: "rgba(255,252,245,0.95)",
                letterSpacing: "0.03em",
                textShadow: `0 0 20px rgba(${color},0.6)`,
              }}>
                {primary}
              </span>
              <span style={{
                fontFamily: "'Raleway', sans-serif",
                fontWeight: 200,
                fontSize: 9,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: `rgba(${color},0.55)`,
              }}>
                {sub}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";

interface SplashScreenProps {
  onDone: () => void;
}

// Three accent colours matching the app categories
const COLORS = [
  { r: 220, g: 40,  b: 80  }, // love — red
  { r: 60,  g: 140, b: 255 }, // work — blue
  { r: 40,  g: 200, b: 100 }, // money — green
];

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [textVisible, setTextVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setTextVisible(true), 1500);
    const t2 = setTimeout(() => setFading(true), 4000);
    const t3 = setTimeout(onDone, 4900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    resize();

    // Background stars
    const stars = Array.from({ length: 110 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 0.3 + Math.random() * 1.1,
      alpha: 0.1 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.0,
      // tint to one of the three colors
      colorIdx: Math.floor(Math.random() * 3),
    }));

    // Corona streamers: 12 beams evenly spaced, each assigned a color
    const streamers = Array.from({ length: 18 }, (_, i) => ({
      baseAngle: (i / 18) * Math.PI * 2,
      colorIdx: i % 3,
      length: 0.9 + Math.random() * 0.8,   // multiplier of r
      width: 0.022 + Math.random() * 0.028,  // angular half-width
      speed: (0.0008 + Math.random() * 0.0015) * (Math.random() > 0.5 ? 1 : -1),
      phase: Math.random() * Math.PI * 2,
      brightness: 0.55 + Math.random() * 0.45,
    }));

    // Arc glows around ring (colored arcs)
    const arcs = Array.from({ length: 24 }, (_, i) => ({
      angle: (i / 24) * Math.PI * 2,
      colorIdx: i % 3,
      arcWidth: 0.08 + Math.random() * 0.12,
      brightness: 0.4 + Math.random() * 0.6,
      speed: (0.003 + Math.random() * 0.005) * (Math.random() > 0.5 ? 1 : -1),
      phase: Math.random() * Math.PI * 2,
    }));

    const startTime = performance.now();
    let raf: number;
    let shockwaves: { r: number; alpha: number; colorIdx: number }[] = [];
    let shockFired = false;
    let impactFlash = 0;
    let colorCycle = 0; // cycles through colors during formation

    const draw = (now: number) => {
      const t = (now - startTime) / 1000;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cx = w / 2;
      const cy = h * 0.42;
      const targetR = Math.min(w, h) * 0.28;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#020407";
      ctx.fillRect(0, 0, w, h);

      const eclipseP = Math.max(0, Math.min(1, (t - 0.2) / 1.1));
      const eased = 1 - Math.pow(1 - eclipseP, 3.0);
      const r = targetR * eased;

      // Color cycling during formation — shifts hue accent over time
      colorCycle = t * 0.18;

      // Trigger tri-color shockwave when ~85% formed
      if (eclipseP > 0.85 && !shockFired) {
        shockFired = true;
        impactFlash = 1;
        COLORS.forEach((_, i) => {
          shockwaves.push({ r: r * 0.95, alpha: 1, colorIdx: i });
        });
      }

      // Update shockwaves
      shockwaves = shockwaves
        .map(sw => ({ ...sw, r: sw.r + 3.8, alpha: sw.alpha - 0.022 }))
        .filter(sw => sw.alpha > 0);
      if (impactFlash > 0) impactFlash = Math.max(0, impactFlash - 0.045);

      // ── Starfield ──────────────────────────────────────────────────────
      const starAlpha = Math.min(1, t / 1.4);
      for (const s of stars) {
        const c = COLORS[s.colorIdx];
        const pulse = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
        ctx.save();
        ctx.globalAlpha = starAlpha * s.alpha * pulse;
        ctx.fillStyle = "#fffaf5";
        ctx.shadowBlur = s.size * 5;
        ctx.shadowColor = `rgb(${c.r},${c.g},${c.b})`;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (r > 4) {
        // ── Tri-color ambient glow ─────────────────────────────────────
        COLORS.forEach((c, i) => {
          const offset = (i / 3) * Math.PI * 2;
          const oscX = cx + Math.cos(t * 0.4 + offset) * r * 0.08;
          const oscY = cy + Math.sin(t * 0.3 + offset) * r * 0.06;
          const ambient = ctx.createRadialGradient(oscX, oscY, 0, oscX, oscY, r * 4.2);
          ambient.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${0.11 * eased})`);
          ambient.addColorStop(0.5, `rgba(${c.r},${c.g},${c.b},${0.04 * eased})`);
          ambient.addColorStop(1, "rgba(0,0,0,0)");
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = ambient;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        });

        // ── Corona streamers (colored beams radiating outward) ─────────
        for (const st of streamers) {
          st.baseAngle += st.speed;
          const c = COLORS[st.colorIdx];
          const bright = st.brightness * (0.6 + 0.4 * Math.sin(t * 1.8 + st.phase));
          const streamLen = r * (1.0 + st.length * eased);

          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = bright * eased * 0.85;

          const x1 = cx + Math.cos(st.baseAngle) * r * 0.95;
          const y1 = cy + Math.sin(st.baseAngle) * r * 0.95;
          const x2 = cx + Math.cos(st.baseAngle) * streamLen;
          const y2 = cy + Math.sin(st.baseAngle) * streamLen;

          const grad = ctx.createLinearGradient(x1, y1, x2, y2);
          grad.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${bright * 0.9})`);
          grad.addColorStop(0.4, `rgba(${c.r},${c.g},${c.b},${bright * 0.35})`);
          grad.addColorStop(1, "rgba(0,0,0,0)");

          // Draw as a thin wedge/cone
          const halfAngle = st.width * (0.5 + 0.5 * Math.sin(t * 1.1 + st.phase));
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.arc(cx, cy, streamLen, st.baseAngle - halfAngle, st.baseAngle + halfAngle);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.restore();
        }

        // ── Colored arc spots on ring ──────────────────────────────────
        for (const arc of arcs) {
          arc.angle += arc.speed;
          const c = COLORS[arc.colorIdx];
          const b = arc.brightness * (0.55 + 0.45 * Math.sin(t * 1.9 + arc.phase));
          const a1 = arc.angle - arc.arcWidth;
          const a2 = arc.angle + arc.arcWidth;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = b * eased * 0.95;
          ctx.beginPath();
          ctx.arc(cx, cy, r, a1, a2);
          const wb = Math.min(255, c.r + 60);
          const wg = Math.min(255, c.g + 60);
          const wbb = Math.min(255, c.b + 60);
          ctx.strokeStyle = `rgba(${wb},${wg},${wbb},1)`;
          ctx.lineWidth = r * 0.075;
          ctx.stroke();
          ctx.restore();
        }

        // ── Ring layers (tri-color shimmer) ────────────────────────────
        const ringLayers = [
          { w: r * 0.28, a: 0.07 + impactFlash * 0.04 },
          { w: r * 0.12, a: 0.18 + impactFlash * 0.10 },
          { w: r * 0.055, a: 0.45 + impactFlash * 0.18 },
          { w: r * 0.022, a: 0.85 + impactFlash * 0.10 },
          { w: r * 0.007, a: 1.0 },
        ];
        for (const layer of ringLayers) {
          // Cycle through colors around the ring
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = eased;

          // Create a conic-like effect by drawing 3 arcs per layer
          COLORS.forEach((c, i) => {
            const startA = (i / 3) * Math.PI * 2 + colorCycle;
            const endA = ((i + 1) / 3) * Math.PI * 2 + colorCycle;
            ctx.beginPath();
            ctx.arc(cx, cy, r, startA, endA);
            const wh = 1 - layer.a * 0.5;
            ctx.strokeStyle = `rgba(${Math.min(255, c.r + Math.round((255 - c.r) * wh))},${Math.min(255, c.g + Math.round((255 - c.g) * wh))},${Math.min(255, c.b + Math.round((255 - c.b) * wh))},${layer.a})`;
            ctx.lineWidth = layer.w;
            ctx.stroke();
          });
          ctx.restore();
        }

        // ── Tri-color shockwaves ───────────────────────────────────────
        for (const sw of shockwaves) {
          const c = COLORS[sw.colorIdx];
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = sw.alpha * 0.75;
          ctx.beginPath();
          ctx.arc(cx, cy, sw.r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${sw.alpha})`;
          ctx.lineWidth = 1.5 + sw.alpha * 2.5;
          ctx.stroke();
          ctx.restore();
        }

        // ── Dark disc ──────────────────────────────────────────────────
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.87, 0, Math.PI * 2);
        ctx.fillStyle = "#020407";
        ctx.fill();
        ctx.restore();

        // ── Inner stars ────────────────────────────────────────────────
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.87, 0, Math.PI * 2);
        ctx.clip();
        for (const s of stars.slice(0, 22)) {
          const c = COLORS[s.colorIdx];
          const px = cx + (s.x - 0.5) * r * 1.55;
          const py = cy + (s.y - 0.5) * r * 1.55;
          const pulse = 0.4 + 0.6 * Math.sin(t * s.speed * 0.8 + s.phase);
          ctx.globalAlpha = starAlpha * s.alpha * pulse * 0.3;
          ctx.fillStyle = "#fffaf5";
          ctx.shadowBlur = s.size * 4;
          ctx.shadowColor = `rgb(${c.r},${c.g},${c.b})`;
          ctx.beginPath();
          ctx.arc(px, py, s.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // ── Impact flash (tri-color) ───────────────────────────────────────
      if (impactFlash > 0) {
        COLORS.forEach((c, i) => {
          const offset = (i / 3) * Math.PI * 2;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = impactFlash * 0.10;
          const flashGrad = ctx.createRadialGradient(
            cx + Math.cos(offset) * r * 0.3, cy + Math.sin(offset) * r * 0.3, 0,
            cx, cy, r * 3,
          );
          flashGrad.addColorStop(0, `rgb(${c.r},${c.g},${c.b})`);
          flashGrad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = flashGrad;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        });
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        opacity: fading ? 0 : 1,
        transition: fading ? "opacity 0.9s ease" : "opacity 0.4s ease",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />

      {/* Text layer */}
      <div
        style={{
          position: "absolute",
          left: 0, right: 0,
          top: `calc(42% + min(28vw, 28vh) + 28px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: textVisible ? 1 : 0,
          transform: textVisible ? "translateY(0)" : "translateY(14px)",
          transition: "opacity 1.2s ease, transform 1.2s ease",
        }}
      >
        <p
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: 33,
            color: "rgba(255,252,245,0.94)",
            letterSpacing: "0.06em",
            margin: 0,
            textAlign: "center",
            textShadow: "0 0 32px rgba(220,40,80,0.5), 0 0 60px rgba(60,140,255,0.25), 0 2px 8px rgba(0,0,0,0.9)",
          }}
        >
          Вселенная говорит
        </p>
        <p
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: 15,
            color: "rgba(255,252,245,0.28)",
            letterSpacing: "0.14em",
            margin: "6px 0 0",
            textAlign: "center",
          }}
        >
          Universe Speaks
        </p>

        {/* Tri-color separator */}
        <div style={{ display: "flex", gap: 3, marginTop: 22, marginBottom: 20 }}>
          {["rgba(220,40,80,0.6)", "rgba(60,140,255,0.6)", "rgba(40,200,100,0.6)"].map((c, i) => (
            <div key={i} style={{ width: 18, height: 0.5, background: c }} />
          ))}
        </div>

        <p
          style={{
            fontFamily: "'Raleway', sans-serif",
            fontWeight: 200,
            fontSize: 9,
            letterSpacing: "0.36em",
            textTransform: "uppercase",
            color: "rgba(255,252,245,0.22)",
            margin: 0,
            textAlign: "center",
          }}
        >
          затмение открывает истину
        </p>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";

interface SplashScreenProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [textVisible, setTextVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setTextVisible(true), 1400);
    const t2 = setTimeout(() => setFading(true), 3800);
    const t3 = setTimeout(onDone, 4600);
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

    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 0.4 + Math.random() * 1.2,
      alpha: 0.15 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 1.2,
    }));

    // Corona arc spots around ring
    const coronaSpots = Array.from({ length: 16 }, (_, i) => ({
      angle: (i / 16) * Math.PI * 2 + Math.random() * 0.3,
      brightness: 0.3 + Math.random() * 0.7,
      width: 0.06 + Math.random() * 0.14,
      speed: (0.002 + Math.random() * 0.004) * (Math.random() > 0.5 ? 1 : -1),
      phase: Math.random() * Math.PI * 2,
    }));

    const startTime = performance.now();
    let raf: number;
    let shockR = 0;
    let shockAlpha = 0;
    let shockFired = false;
    let impactFlash = 0;

    const draw = (now: number) => {
      const t = (now - startTime) / 1000;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cx = w / 2;
      const cy = h * 0.42;
      const targetR = Math.min(w, h) * 0.28;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Background
      ctx.fillStyle = "#030508";
      ctx.fillRect(0, 0, w, h);

      // Stars
      const starAlpha = Math.min(1, t / 1.2);
      for (const s of stars) {
        const pulse = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
        ctx.save();
        ctx.globalAlpha = starAlpha * s.alpha * pulse;
        ctx.fillStyle = "#fffaf5";
        ctx.shadowBlur = s.size * 4;
        ctx.shadowColor = "rgba(200, 160, 255, 0.7)";
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Eclipse forming: 0.3s → 1.3s
      const eclipseP = Math.max(0, Math.min(1, (t - 0.3) / 1.0));
      const eased = 1 - Math.pow(1 - eclipseP, 2.8);
      const r = targetR * eased;

      // Trigger shockwave & impact flash when eclipse ~90% formed
      if (eclipseP > 0.88 && !shockFired) {
        shockFired = true;
        shockR = r;
        shockAlpha = 1;
        impactFlash = 1;
      }

      // Decay
      if (shockR > 0) {
        shockR += 4.5;
        shockAlpha = Math.max(0, shockAlpha - 0.028);
      }
      if (impactFlash > 0) impactFlash = Math.max(0, impactFlash - 0.055);

      const cr = 220, cg = 40, cb = 80;

      if (r > 3) {
        // Ambient radial glow
        const ambient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 4.5);
        ambient.addColorStop(0, `rgba(${cr},${cg},${cb},${0.18 * eased})`);
        ambient.addColorStop(0.4, `rgba(${cr},${cg},${cb},${0.07 * eased})`);
        ambient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = ambient;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();

        // Halo
        const haloPulse = 1 + 0.04 * Math.sin(t * 1.6);
        const halo = ctx.createRadialGradient(cx, cy, r * 0.88, cx, cy, r * 3.2 * haloPulse);
        halo.addColorStop(0, `rgba(${cr},${cg},${cb},${(0.32 + impactFlash * 0.25) * eased})`);
        halo.addColorStop(0.28, `rgba(${cr},${cg},${cb},${0.13 * eased})`);
        halo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.beginPath();
        ctx.arc(cx, cy, r * 3.2 * haloPulse, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();
        ctx.restore();

        // Shockwave ring
        if (shockAlpha > 0) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = shockAlpha * 0.7;
          ctx.beginPath();
          ctx.arc(cx, cy, shockR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 200, 220, ${shockAlpha * 0.9})`;
          ctx.lineWidth = 2 + shockAlpha * 3;
          ctx.stroke();
          ctx.restore();
        }

        // Corona arc spots
        for (const spot of coronaSpots) {
          spot.angle += spot.speed;
          const b = spot.brightness * (0.5 + 0.5 * Math.sin(t * 2.1 + spot.phase));
          const a1 = spot.angle - spot.width;
          const a2 = spot.angle + spot.width;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = b * eased * 0.9;
          ctx.beginPath();
          ctx.arc(cx, cy, r, a1, a2);
          ctx.strokeStyle = `rgba(255, ${Math.round(180 + (255 - 180) * b)}, ${Math.round(200 + (255 - 200) * b)}, 1)`;
          ctx.lineWidth = r * 0.09;
          ctx.stroke();
          ctx.restore();
        }

        // Ring layers
        const layers = [
          { w: r * 0.30, a: 0.06 + impactFlash * 0.04 },
          { w: r * 0.13, a: 0.16 + impactFlash * 0.10 },
          { w: r * 0.058, a: 0.40 + impactFlash * 0.18 },
          { w: r * 0.024, a: 0.82 + impactFlash * 0.12 },
          { w: r * 0.008, a: 1.0 },
        ];
        for (const layer of layers) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = eased;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          const wh = 1 - layer.a * 0.5;
          const rr = Math.min(255, cr + Math.round((255 - cr) * wh));
          const gg = Math.min(255, cg + Math.round((255 - cg) * wh));
          const bb = Math.min(255, cb + Math.round((255 - cb) * wh));
          ctx.strokeStyle = `rgba(${rr},${gg},${bb},${layer.a})`;
          ctx.lineWidth = layer.w;
          ctx.stroke();
          ctx.restore();
        }

        // Inner disc
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2);
        ctx.fillStyle = "#030508";
        ctx.fill();
        ctx.restore();

        // Inner star field (dim)
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2);
        ctx.clip();
        for (const s of stars.slice(0, 18)) {
          const px = cx + (s.x - 0.5) * r * 1.6;
          const py = cy + (s.y - 0.5) * r * 1.6;
          const pulse = 0.4 + 0.6 * Math.sin(t * s.speed * 0.8 + s.phase);
          ctx.globalAlpha = starAlpha * s.alpha * pulse * 0.35;
          ctx.fillStyle = "#fffaf5";
          ctx.shadowBlur = s.size * 3;
          ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
          ctx.beginPath();
          ctx.arc(px, py, s.size * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Impact flash overlay
      if (impactFlash > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = impactFlash * 0.18;
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const eclipseY = 42; // % from top for vertical center of eclipse

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        opacity: fading ? 0 : 1,
        transition: fading ? "opacity 0.8s ease" : "opacity 0.5s ease",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />

      {/* Text layer — positioned below the eclipse */}
      <div
        style={{
          position: "absolute",
          left: 0, right: 0,
          top: `calc(${eclipseY}% + min(28vw, 28vh) + 32px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: textVisible ? 1 : 0,
          transform: textVisible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 1.1s ease, transform 1.1s ease",
        }}
      >
        <p
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: 32,
            color: "rgba(255,252,245,0.92)",
            letterSpacing: "0.06em",
            margin: 0,
            textAlign: "center",
            textShadow: "0 0 28px rgba(220,40,80,0.4), 0 2px 8px rgba(0,0,0,0.8)",
          }}
        >
          Вселенная говорит
        </p>
        <p
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: 16,
            color: "rgba(255,252,245,0.32)",
            letterSpacing: "0.12em",
            margin: "6px 0 0",
            textAlign: "center",
          }}
        >
          Universe Speaks
        </p>

        {/* Thin separator line */}
        <div
          style={{
            width: 48,
            height: 0.5,
            background: "rgba(220,40,80,0.4)",
            marginTop: 22,
            marginBottom: 22,
          }}
        />

        <p
          style={{
            fontFamily: "'Raleway', sans-serif",
            fontWeight: 300,
            fontSize: 9,
            letterSpacing: "0.38em",
            textTransform: "uppercase",
            color: "rgba(220,40,80,0.55)",
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

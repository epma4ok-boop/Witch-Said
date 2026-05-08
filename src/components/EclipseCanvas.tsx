import { useEffect, useRef, useCallback } from "react";

export type EclipseColor = { r: number; g: number; b: number };

interface EclipseCanvasProps {
  onTap: () => void;
  isCasting: boolean;
  flashTrigger: number;
  catPulseTrigger: number;
  color: EclipseColor;
  predictionText: string;
  revealProgress: number;
  hintText: string;
}

export default function EclipseCanvas({
  onTap, isCasting, flashTrigger, catPulseTrigger, color,
  predictionText, revealProgress, hintText,
}: EclipseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const stateRef = useRef({
    width: 0, height: 0, cx: 0, cy: 0, r: 0,
    time: 0, flash: 0, shake: 0, catPulse: 0,
    currentR: color.r, currentG: color.g, currentB: color.b,
    targetR: color.r, targetG: color.g, targetB: color.b,
    arcSpots: [] as ArcSpot[],
    stars: [] as Star[],
  });
  const textRef = useRef({ text: predictionText, reveal: revealProgress, hint: hintText });
  const castingRef = useRef(false);

  class ArcSpot {
    angle: number; brightness: number; speed: number; phase: number; width: number;
    constructor() {
      this.angle = Math.random() * Math.PI * 2;
      this.brightness = 0.3 + Math.random() * 0.7;
      this.speed = 0.002 + Math.random() * 0.005;
      this.phase = Math.random() * Math.PI * 2;
      this.width = 0.12 + Math.random() * 0.28;
    }
    update() { this.angle += this.speed; }
    getBrightness(t: number) { return this.brightness * (0.5 + 0.5 * Math.sin(t * 1.4 + this.phase)); }
  }

  class Star {
    x = 0; y = 0; vx = 0; vy = 0;
    size: number; alpha: number; phase: number; speed: number;
    burst = false;
    constructor() {
      this.size = 0.4 + Math.random() * 1.1;
      this.alpha = 0.06 + Math.random() * 0.22;
      this.phase = Math.random() * Math.PI * 2;
      this.speed = 0.4 + Math.random() * 0.8;
      this.reset();
    }
    reset() {
      const s = stateRef.current;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 0.88;
      this.x = s.cx + Math.cos(angle) * s.r * dist;
      this.y = s.cy + Math.sin(angle) * s.r * dist;
      this.vx = (Math.random() - 0.5) * 0.12;
      this.vy = (Math.random() - 0.5) * 0.12;
      this.burst = false;
    }
    scatter() {
      const s = stateRef.current;
      const dx = this.x - s.cx;
      const dy = this.y - s.cy;
      const len = Math.hypot(dx, dy) || 1;
      const speed = 1.2 + Math.random() * 2.0;
      this.vx = (dx / len) * speed;
      this.vy = (dy / len) * speed;
      this.burst = true;
    }
    update() {
      const s = stateRef.current;
      this.x += this.vx;
      this.y += this.vy;
      if (this.burst) {
        this.vx *= 0.93;
        this.vy *= 0.93;
        const dist = Math.hypot(this.x - s.cx, this.y - s.cy);
        if (dist > s.r * 0.92) this.reset();
      } else {
        const dist = Math.hypot(this.x - s.cx, this.y - s.cy);
        if (dist > s.r * 0.90) this.reset();
      }
    }
    draw(ctx: CanvasRenderingContext2D, t: number, cr: number, cg: number, cb: number) {
      const pulse = this.alpha * (0.5 + 0.5 * Math.sin(t * this.speed + this.phase));
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.shadowBlur = this.size * 6;
      ctx.shadowColor = `rgb(${cr}, ${cg}, ${cb})`;
      ctx.fillStyle = `rgba(255, 252, 248, ${pulse})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  const init = useCallback(() => {
    stateRef.current.arcSpots = Array.from({ length: 14 }, () => new ArcSpot());
    stateRef.current.stars = Array.from({ length: 55 }, () => new Star());
  }, []);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    s.width = window.innerWidth;
    s.height = window.innerHeight;
    canvas.width = s.width;
    canvas.height = s.height;
    s.cx = s.width / 2;
    s.cy = s.height / 2; // шар выше, чтобы кнопки поместились
    s.r = Math.min(s.width, s.height) * 0.35;
  }, []);

  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      const test = current ? current + " " + w : w;
      if (ctx.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  const RUNE_GLYPHS = ["✦", "☽", "⊕", "✶", "⋆", "✴", "⊗"];

  const drawCastingRunes = useCallback((ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, time: number, cr: number, cg: number, cb: number) => {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const vortexR = r * (0.38 + 0.06 * Math.sin(time * 2.1));
    const vortex = ctx.createRadialGradient(cx, cy, 0, cx, cy, vortexR);
    vortex.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, 0.18)`);
    vortex.addColorStop(0.4, `rgba(${cr}, ${cg}, ${cb}, 0.07)`);
    vortex.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = vortex;
    ctx.beginPath();
    ctx.arc(cx, cy, vortexR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const runeFont = `300 ${Math.max(14, r * 0.10)}px 'Cormorant Garamond', serif`;
    const glyphs = RUNE_GLYPHS;
    const orbitR = r * 0.44;
    glyphs.forEach((glyph, i) => {
      const baseAngle = (i / glyphs.length) * Math.PI * 2;
      const spinAngle = baseAngle + time * (i % 2 === 0 ? 1.1 : -0.7);
      const gx = cx + Math.cos(spinAngle) * orbitR;
      const gy = cy + Math.sin(spinAngle) * orbitR;
      const pulse = 0.45 + 0.45 * Math.sin(time * 1.8 + i * 1.1);
      ctx.save();
      ctx.font = runeFont;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = pulse;
      ctx.shadowBlur = 16;
      ctx.shadowColor = `rgb(${cr}, ${cg}, ${cb})`;
      ctx.fillStyle = `rgba(255, 252, 245, ${pulse})`;
      ctx.fillText(glyph, gx, gy);
      ctx.restore();
    });

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.18 + 0.10 * Math.sin(time * 1.5);
    ctx.strokeStyle = `rgb(${cr}, ${cg}, ${cb})`;
    ctx.lineWidth = 0.8;
    ctx.shadowBlur = 10;
    ctx.shadowColor = `rgb(${cr}, ${cg}, ${cb})`;
    const triR = orbitR * 0.75;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = time * 0.6 + (i / 3) * Math.PI * 2;
      const nx = cx + Math.cos(a) * triR;
      const ny = cy + Math.sin(a) * triR;
      if (i === 0) ctx.moveTo(nx, ny); else ctx.lineTo(nx, ny);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const dotPulse = 0.5 + 0.5 * Math.sin(time * 3.2);
    ctx.globalAlpha = dotPulse;
    ctx.shadowBlur = 20;
    ctx.shadowColor = `rgb(${cr}, ${cg}, ${cb})`;
    ctx.fillStyle = `rgb(255, 255, 255)`;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.025 * dotPulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, []);

  const drawTextInDisc = useCallback((ctx: CanvasRenderingContext2D) => {
    const s = stateRef.current;
    const { cx, cy, r, time } = s;
    const { text, reveal, hint } = textRef.current;
    const cr = Math.round(s.currentR);
    const cg = Math.round(s.currentG);
    const cb = Math.round(s.currentB);

    if (castingRef.current) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.93, 0, Math.PI * 2);
      ctx.clip();
      drawCastingRunes(ctx, cx, cy, r, time, cr, cg, cb);
      ctx.restore();
      if (hint) {
        const hintY = cy + r * 1.22;
        const hintSize = Math.max(8, r * 0.052);
        ctx.save();
        ctx.font = `200 ${hintSize}px 'Raleway', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = 0.6 + 0.3 * Math.sin(time * 2);
        ctx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(${cr}, ${cg}, ${cb}, 0.8)`;
        const spaced = hint.split("").join(String.fromCharCode(8202));
        ctx.fillText(spaced, cx, hintY);
        ctx.restore();
      }
      return;
    }

    if (!text) return;

    const targetFontSize = Math.max(16, Math.min(30, r * 0.148));
    const maxWidth = r * 1.58;
    let fontSize = targetFontSize;
    let lines: string[] = [];
    for (let attempt = 0; attempt < 4; attempt++) {
      const font = `400 italic ${fontSize}px 'Cormorant Garamond', 'Georgia', serif`;
      ctx.save();
      ctx.font = font;
      lines = wrapText(ctx, text, maxWidth);
      ctx.restore();
      if (lines.length <= 4) break;
      fontSize = Math.max(12, fontSize * 0.84);
    }

    const font = `400 italic ${fontSize}px 'Cormorant Garamond', 'Georgia', serif`;
    ctx.save();
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lineH = fontSize * 1.52;
    const totalH = lines.length * lineH;
    const eased = 1 - Math.pow(1 - reveal, 3);
    const scale = 0.22 + 0.78 * eased;
    const alpha = Math.pow(Math.max(0, reveal - 0.05) / 0.95, 1.8);
    const yDrift = (1 - eased) * r * 0.12;
    const baseY = cy + yDrift;

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.93, 0, Math.PI * 2);
    ctx.clip();

    if (alpha > 0.05) {
      const padX = r * 0.72;
      const padY = totalH * 0.55 + fontSize * 0.4;
      ctx.save();
      ctx.globalAlpha = alpha * 0.55;
      const backdrop = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, padX);
      backdrop.addColorStop(0, "rgba(0,1,3,0.92)");
      backdrop.addColorStop(0.6, "rgba(0,1,3,0.75)");
      backdrop.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = backdrop;
      ctx.beginPath();
      ctx.ellipse(cx, baseY, padX, padY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.translate(cx, baseY);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -baseY);

    lines.forEach((line, i) => {
      const lineY = baseY - totalH / 2 + i * lineH + lineH / 2;
      ctx.save();
      ctx.globalAlpha = alpha * 0.65;
      ctx.shadowBlur = 32;
      ctx.shadowColor = `rgb(${cr}, ${cg}, ${cb})`;
      ctx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
      ctx.fillText(line, cx, lineY);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 14;
      ctx.shadowColor = `rgba(${cr}, ${cg}, ${cb}, 0.55)`;
      ctx.fillStyle = `rgba(255, 251, 240, ${alpha})`;
      ctx.fillText(line, cx, lineY);
      ctx.restore();
    });
    ctx.restore();

    if (hint) {
      const hintY = cy + r * 1.22;
      const hintSize = Math.max(8, r * 0.052);
      const hintAlpha = reveal > 0.6 ? Math.min(1, (reveal - 0.6) / 0.4) * 0.55 : (reveal < 0.05 ? 0.45 : 0);
      ctx.save();
      ctx.font = `200 ${hintSize}px 'Raleway', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = hintAlpha;
      ctx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = `rgba(${cr}, ${cg}, ${cb}, 0.7)`;
      const spaced = hint.split("").join(String.fromCharCode(8202));
      ctx.fillText(spaced, cx, hintY);
      ctx.restore();
    }

    if (reveal > 0.02 && reveal < 0.35) {
      const burst = Math.sin(reveal * Math.PI / 0.35);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.6 * burst);
      bg.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${burst * 0.09})`);
      bg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.6 * burst, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (reveal >= 0.99) {
      const pulse = 0.92 + 0.08 * Math.sin(time * 1.2);
      ctx.save();
      ctx.globalAlpha = (1 - pulse) * 0.15;
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, [drawCastingRunes]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;
    const { cx, cy, r, time, flash } = s;
    const w = s.width; const h = s.height;

    const lerpSpeed = 0.045;
    s.currentR += (s.targetR - s.currentR) * lerpSpeed;
    s.currentG += (s.targetG - s.currentG) * lerpSpeed;
    s.currentB += (s.targetB - s.currentB) * lerpSpeed;
    const cr = Math.round(s.currentR);
    const cg = Math.round(s.currentG);
    const cb = Math.round(s.currentB);

    ctx.fillStyle = "#030508";
    ctx.fillRect(0, 0, w, h);

    const shakeMag = s.shake * r * 0.030;
    const shakeX = shakeMag * Math.sin(time * 53.1) * Math.cos(time * 29.7);
    const shakeY = shakeMag * Math.cos(time * 41.3) * Math.sin(time * 67.9);
    ctx.save();
    ctx.translate(shakeX, shakeY);

    const ambientPulse = 0.9 + 0.1 * Math.sin(time * 0.35);
    const ambient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3.5);
    ambient.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${0.13 * ambientPulse})`);
    ambient.addColorStop(0.45, `rgba(${cr}, ${cg}, ${cb}, ${0.055 * ambientPulse})`);
    ambient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = ambient;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    const haloR = r * (2.9 + flash * 0.7);
    const haloPulse = 1 + 0.05 * Math.sin(time * 0.5);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const halo = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, haloR * haloPulse);
    halo.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${0.2 + flash * 0.15})`);
    halo.addColorStop(0.25, `rgba(${cr}, ${cg}, ${cb}, ${0.10 + flash * 0.08})`);
    halo.addColorStop(0.6, `rgba(${Math.round(cr * 0.5)}, ${Math.round(cg * 0.5)}, ${Math.round(cb * 0.5)}, 0.04)`);
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(cx, cy, haloR * haloPulse, 0, Math.PI * 2);
    ctx.fillStyle = halo;
    ctx.fill();
    const innerGlow = ctx.createRadialGradient(cx, cy, r * 0.82, cx, cy, r * 1.6);
    innerGlow.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${0.28 + flash * 0.25})`);
    innerGlow.addColorStop(0.4, `rgba(${cr}, ${cg}, ${cb}, ${0.14 + flash * 0.1})`);
    innerGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = innerGlow;
    ctx.fill();
    ctx.restore();

    const ringR = r * (1 + 0.012 * Math.sin(time * 0.8));
    const layers = [
      { width: r * 0.32, alpha: 0.06 + flash * 0.05 },
      { width: r * 0.14, alpha: 0.14 + flash * 0.10 },
      { width: r * 0.065, alpha: 0.36 + flash * 0.18 },
      { width: r * 0.028, alpha: 0.70 + flash * 0.20 },
      { width: r * 0.010, alpha: 0.95 },
    ];
    for (const layer of layers) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      const wh = 1 - layer.alpha * 0.5;
      ctx.strokeStyle = `rgba(${Math.min(255, cr + Math.round((255 - cr) * wh))}, ${Math.min(255, cg + Math.round((255 - cg) * wh))}, ${Math.min(255, cb + Math.round((255 - cb) * wh))}, ${layer.alpha})`;
      ctx.lineWidth = layer.width;
      ctx.stroke();
      ctx.restore();
    }

    if (s.catPulse > 0) {
      const phase = 1 - s.catPulse;
      const pulseRings = [
        { offset: 0,    maxScale: 2.2, startAlpha: 0.55, width: 0.022 },
        { offset: 0.18, maxScale: 2.8, startAlpha: 0.30, width: 0.014 },
        { offset: 0.34, maxScale: 3.4, startAlpha: 0.15, width: 0.008 },
      ];
      pulseRings.forEach(({ offset, maxScale, startAlpha, width }) => {
        const p = Math.max(0, Math.min(1, (phase - offset) / (1 - offset)));
        if (p <= 0) return;
        const eased = 1 - Math.pow(1 - p, 2);
        const pulseR = r * (1.0 + eased * (maxScale - 1.0));
        const alpha = startAlpha * (1 - eased);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.beginPath();
        ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
        ctx.lineWidth = r * width * (1 - eased * 0.5);
        ctx.stroke();
        ctx.restore();
      });
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const spot of s.arcSpots) {
      spot.update();
      const b = spot.getBrightness(time);
      const x = cx + Math.cos(spot.angle) * ringR;
      const y = cy + Math.sin(spot.angle) * ringR;
      const sr = r * spot.width * 0.55;
      const sg = ctx.createRadialGradient(x, y, 0, x, y, sr);
      sg.addColorStop(0, `rgba(${Math.min(255, cr + 80)}, ${Math.min(255, cg + 80)}, ${Math.min(255, cb + 80)}, ${b * 0.6})`);
      sg.addColorStop(0.5, `rgba(${cr}, ${cg}, ${cb}, ${b * 0.2})`);
      sg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(x, y, sr, 0, Math.PI * 2);
      ctx.fillStyle = sg;
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    const limb = ctx.createRadialGradient(cx, cy, r * 0.84, cx, cy, r * 0.98);
    limb.addColorStop(0, "rgba(0,0,0,0)");
    limb.addColorStop(1, `rgba(${Math.round(cr * 0.15)}, ${Math.round(cg * 0.15)}, ${Math.round(cb * 0.15)}, 0.7)`);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.98, 0, Math.PI * 2);
    ctx.fillStyle = limb;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.955, 0, Math.PI * 2);
    ctx.fillStyle = "#010203";
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.93, 0, Math.PI * 2);
    ctx.clip();
    for (const star of s.stars) {
      star.update();
      star.draw(ctx, time, cr, cg, cb);
    }
    ctx.restore();

    drawTextInDisc(ctx);
    ctx.restore();

    if (flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${flash * 0.20})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }, [drawTextInDisc]);

  const animate = useCallback(() => {
    const s = stateRef.current;
    s.time += 0.016;
    if (s.flash > 0) s.flash = Math.max(0, s.flash - 0.022);
    if (s.shake > 0) s.shake = Math.max(0, s.shake * 0.88 - 0.008);
    if (s.catPulse > 0) s.catPulse = Math.max(0, s.catPulse - 0.016);
    drawFrame();
    animFrameRef.current = requestAnimationFrame(animate);
  }, [drawFrame]);

  useEffect(() => {
    resize(); init();
    animFrameRef.current = requestAnimationFrame(animate);
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(animFrameRef.current); window.removeEventListener("resize", resize); };
  }, [resize, init, animate]);

  useEffect(() => {
    if (flashTrigger > 0) {
      stateRef.current.flash = 1;
      stateRef.current.shake = 1;
      for (const star of stateRef.current.stars) star.scatter();
    }
  }, [flashTrigger]);
  useEffect(() => { if (catPulseTrigger > 0) stateRef.current.catPulse = 1; }, [catPulseTrigger]);
  useEffect(() => { castingRef.current = isCasting; }, [isCasting]);
  useEffect(() => { stateRef.current.targetR = color.r; stateRef.current.targetG = color.g; stateRef.current.targetB = color.b; }, [color]);
  useEffect(() => { textRef.current = { text: predictionText, reveal: revealProgress, hint: hintText }; }, [predictionText, revealProgress, hintText]);

  // Проверка клика только по шару
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const s = stateRef.current;
    const dx = x - s.cx;
    const dy = y - s.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= s.r) {
      onTap();
    }
  }, [onTap]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      onClick={handleCanvasClick}
      onTouchEnd={handleCanvasClick}
      style={{ cursor: isCasting ? "wait" : "pointer", touchAction: "manipulation" }}
    />
  );
}

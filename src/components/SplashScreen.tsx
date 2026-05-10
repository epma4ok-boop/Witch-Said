import { useEffect, useState } from "react";

interface SplashScreenProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 600);
    const t2 = setTimeout(() => setPhase("out"), 3000);
    const t3 = setTimeout(onDone, 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const visible = phase !== "out";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#030508",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: visible ? 1 : 0,
        transition: phase === "in" ? "opacity 0.6s ease" : phase === "out" ? "opacity 0.55s ease" : "none",
      }}
    >
      {/* Eclipse glow rings */}
      <div style={{ position: "relative", width: 180, height: 180, marginBottom: 40 }}>
        {/* Outer ambient */}
        <div
          style={{
            position: "absolute",
            inset: -40,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(220,40,80,0.18) 0%, rgba(220,40,80,0.05) 50%, transparent 75%)",
            animation: "splashPulse 2.5s ease-in-out infinite",
          }}
        />
        {/* Middle ring glow */}
        <div
          style={{
            position: "absolute",
            inset: 8,
            borderRadius: "50%",
            boxShadow: "0 0 40px 12px rgba(220,40,80,0.35), 0 0 80px 24px rgba(220,40,80,0.12)",
            border: "1.5px solid rgba(220,40,80,0.6)",
            animation: "splashPulse 2.5s ease-in-out infinite 0.3s",
          }}
        />
        {/* Inner dark disc */}
        <div
          style={{
            position: "absolute",
            inset: 12,
            borderRadius: "50%",
            background: "#010203",
          }}
        />
        {/* Thin bright ring */}
        <div
          style={{
            position: "absolute",
            inset: 10,
            borderRadius: "50%",
            border: "0.5px solid rgba(255,200,210,0.7)",
            boxShadow: "0 0 12px 3px rgba(220,40,80,0.5)",
          }}
        />
      </div>

      {/* Title */}
      <p
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: 28,
          color: "rgba(255,252,245,0.88)",
          letterSpacing: "0.06em",
          margin: 0,
          textAlign: "center",
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
          color: "rgba(255,252,245,0.35)",
          letterSpacing: "0.08em",
          margin: "6px 0 0",
          textAlign: "center",
        }}
      >
        Universe Speaks
      </p>

      {/* Subtle tagline */}
      <p
        style={{
          fontFamily: "'Raleway', sans-serif",
          fontWeight: 200,
          fontSize: 9,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: "rgba(220,40,80,0.4)",
          marginTop: 28,
        }}
      >
        затмение открывает истину
      </p>

      <style>{`
        @keyframes splashPulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}

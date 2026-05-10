import { useState } from "react";
import type { Lang } from "@/data/i18n";

interface LanguageSelectProps {
  onSelect: (lang: Lang) => void;
}

export default function LanguageSelect({ onSelect }: LanguageSelectProps) {
  const [chosen, setChosen] = useState<Lang | null>(null);

  const pick = (lang: Lang) => {
    setChosen(lang);
    setTimeout(() => onSelect(lang), 420);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "#030508",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        opacity: chosen ? 0 : 1,
        transition: chosen ? "opacity 0.4s ease" : "none",
      }}
    >
      {/* Small eclipse decoration */}
      <div style={{ position: "relative", width: 60, height: 60, marginBottom: 36 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "0.5px solid rgba(220,40,80,0.5)",
            boxShadow: "0 0 20px 6px rgba(220,40,80,0.2)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 3,
            borderRadius: "50%",
            background: "#010203",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 2,
            borderRadius: "50%",
            border: "0.5px solid rgba(255,200,210,0.45)",
          }}
        />
      </div>

      {/* Heading */}
      <p
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: 22,
          color: "rgba(255,252,245,0.7)",
          letterSpacing: "0.04em",
          margin: 0,
          marginBottom: 6,
        }}
      >
        Выберите язык
      </p>
      <p
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: 13,
          color: "rgba(255,252,245,0.25)",
          letterSpacing: "0.06em",
          margin: 0,
          marginBottom: 44,
        }}
      >
        Choose your language
      </p>

      {/* Language buttons */}
      <div style={{ display: "flex", gap: 16 }}>
        {([
          { lang: "ru" as Lang, primary: "Русский", sub: "Russian" },
          { lang: "en" as Lang, primary: "English", sub: "Английский" },
        ]).map(({ lang, primary, sub }) => (
          <button
            key={lang}
            onClick={() => pick(lang)}
            style={{
              width: 140,
              padding: "20px 12px",
              borderRadius: 18,
              background: "rgba(220,40,80,0.06)",
              border: "0.5px solid rgba(220,40,80,0.25)",
              boxShadow: "0 0 24px rgba(220,40,80,0.08)",
              backdropFilter: "blur(16px)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(220,40,80,0.13)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(220,40,80,0.5)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(220,40,80,0.06)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(220,40,80,0.25)";
            }}
          >
            <span
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: 20,
                color: "rgba(255,252,245,0.88)",
                letterSpacing: "0.03em",
              }}
            >
              {primary}
            </span>
            <span
              style={{
                fontFamily: "'Raleway', sans-serif",
                fontWeight: 200,
                fontSize: 9,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(220,40,80,0.45)",
              }}
            >
              {sub}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

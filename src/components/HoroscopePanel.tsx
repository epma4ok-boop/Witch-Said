import { useState, useMemo } from "react";
import { ZODIAC_SIGNS, type ZodiacSign, generateHoroscope } from "@/data/horoscope";
import type { Lang } from "@/data/i18n";

interface HoroscopePanelProps {
  lang: Lang;
}

const ACCENT = { r: 160, g: 80, b: 255 };

export default function HoroscopePanel({ lang }: HoroscopePanelProps) {
  const [selected, setSelected] = useState<ZodiacSign | null>(null);
  const today = useMemo(() => new Date(), []);

  const horoscope = useMemo(() => {
    if (!selected) return null;
    return generateHoroscope(selected, today, lang);
  }, [selected, today, lang]);

  const selectedMeta = selected ? ZODIAC_SIGNS.find(s => s.key === selected) : null;
  const { r, g, b } = ACCENT;

  const dateStr = today.toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", {
    day: "numeric", month: "long",
  });

  if (selected && selectedMeta && horoscope) {
    return (
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        overflowY: "auto",
        background: "transparent",
      }}>
        {/* Back button row */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "10px 16px 4px",
          flexShrink: 0,
        }}>
          <button
            onClick={() => setSelected(null)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: `rgba(${r},${g},${b},0.10)`,
              border: `1px solid rgba(${r},${g},${b},0.28)`,
              borderRadius: 99,
              padding: "7px 16px 7px 12px",
              cursor: "pointer",
              fontFamily: "'Raleway', sans-serif",
              fontWeight: 400, fontSize: 13,
              letterSpacing: "0.12em", textTransform: "uppercase",
              color: `rgba(${r},${g},${b},0.85)`,
              transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1, marginTop: -1 }}>‹</span>
            <span>{lang === "ru" ? "Назад" : "Back"}</span>
          </button>

          <p style={{
            flex: 1, textAlign: "right",
            fontFamily: "'Raleway', sans-serif",
            fontWeight: 300, fontSize: 12,
            color: `rgba(${r},${g},${b},0.45)`,
            letterSpacing: "0.14em", textTransform: "uppercase",
            margin: 0,
          }}>
            {dateStr}
          </p>
        </div>

        {/* Sign hero */}
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center",
          padding: "16px 20px 20px",
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 72,
            lineHeight: 1,
            filter: `drop-shadow(0 0 24px rgba(${r},${g},${b},1)) drop-shadow(0 0 48px rgba(${r},${g},${b},0.5))`,
            marginBottom: 12,
          }}>
            {selectedMeta.symbol}
          </div>
          <p style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: "italic", fontWeight: 500, fontSize: 28,
            color: "rgba(255,252,245,0.95)", margin: 0,
            letterSpacing: "0.04em",
            textShadow: `0 0 30px rgba(${r},${g},${b},0.4)`,
          }}>
            {lang === "ru" ? selectedMeta.ru : selectedMeta.en}
          </p>
          <p style={{
            fontFamily: "'Raleway', sans-serif",
            fontWeight: 300, fontSize: 12,
            color: `rgba(${r},${g},${b},0.60)`,
            letterSpacing: "0.18em", textTransform: "uppercase",
            margin: "6px 0 0",
          }}>
            {selectedMeta.dates}
          </p>
        </div>

        {/* Divider */}
        <div style={{
          height: 0.5,
          background: `linear-gradient(to right, transparent, rgba(${r},${g},${b},0.35), transparent)`,
          marginBottom: 20, marginLeft: 24, marginRight: 24,
          flexShrink: 0,
        }} />

        {/* Horoscope card */}
        <div style={{
          margin: "0 16px 24px",
          borderRadius: 20,
          background: `rgba(${r},${g},${b},0.06)`,
          border: `0.5px solid rgba(${r},${g},${b},0.22)`,
          boxShadow: `0 0 40px rgba(${r},${g},${b},0.08), inset 0 0 30px rgba(${r},${g},${b},0.04)`,
          padding: "20px 20px",
          flexShrink: 0,
        }}>
          {horoscope.split("\n\n").map((paragraph, i) => (
            <p key={i} style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontStyle: i === 0 ? "italic" : "normal",
              fontWeight: i === 0 ? 400 : 300,
              fontSize: i === 0 ? 19 : 16,
              color: i === 0
                ? "rgba(255,252,245,0.92)"
                : i === 1
                  ? "rgba(255,255,255,0.60)"
                  : `rgba(${r},${g},${b},0.70)`,
              lineHeight: 1.70,
              letterSpacing: "0.02em",
              margin: i === horoscope.split("\n\n").length - 1 ? 0 : "0 0 14px",
            }}>
              {paragraph}
            </p>
          ))}
        </div>

        {/* Free badge */}
        <div style={{
          display: "flex", justifyContent: "center",
          paddingBottom: 24, flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'Raleway', sans-serif",
            fontWeight: 300, fontSize: 10,
            letterSpacing: "0.20em", textTransform: "uppercase",
            color: `rgba(${r},${g},${b},0.35)`,
          }}>
            {lang === "ru"
              ? "✦ бесплатно · обновляется каждый день ✦"
              : "✦ free · updates every day ✦"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        textAlign: "center",
        padding: "6px 16px 4px",
        flexShrink: 0,
      }}>
        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: "italic", fontWeight: 300, fontSize: 14,
          color: `rgba(${r},${g},${b},0.60)`,
          letterSpacing: "0.12em",
          margin: 0,
        }}>
          {lang === "ru" ? `гороскоп на ${dateStr}` : `horoscope · ${dateStr}`}
        </p>
      </div>

      {/* Zodiac grid — fills remaining space */}
      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(4, 1fr)",
        gap: 8,
        padding: "4px 10px 10px",
      }}>
        {ZODIAC_SIGNS.map((sign) => (
          <button
            key={sign.key}
            onClick={() => setSelected(sign.key)}
            style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              borderRadius: 18,
              background: "rgba(255,255,255,0.05)",
              border: `1px solid rgba(${r},${g},${b},0.18)`,
              cursor: "pointer",
              transition: "all 0.22s",
              gap: 5,
              padding: "6px 4px",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget;
              el.style.background = `rgba(${r},${g},${b},0.15)`;
              el.style.border = `1px solid rgba(${r},${g},${b},0.55)`;
              el.style.boxShadow = `0 0 24px rgba(${r},${g},${b},0.30)`;
            }}
            onMouseLeave={e => {
              const el = e.currentTarget;
              el.style.background = "rgba(255,255,255,0.05)";
              el.style.border = `1px solid rgba(${r},${g},${b},0.18)`;
              el.style.boxShadow = "none";
            }}
          >
            {/* Subtle inner glow */}
            <div style={{
              position: "absolute", inset: 0,
              background: `radial-gradient(ellipse at 50% 30%, rgba(${r},${g},${b},0.10) 0%, transparent 70%)`,
              pointerEvents: "none",
            }} />

            {/* Symbol */}
            <span style={{
              fontSize: 40,
              lineHeight: 1,
              color: `rgba(${r},${g},${b},0.95)`,
              filter: `drop-shadow(0 0 12px rgba(${r},${g},${b},0.9)) drop-shadow(0 0 24px rgba(${r},${g},${b},0.5))`,
              position: "relative",
              zIndex: 1,
            }}>
              {sign.symbol}
            </span>

            {/* Name */}
            <span style={{
              fontFamily: "'Raleway', sans-serif",
              fontWeight: 400, fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.85)",
              position: "relative", zIndex: 1,
            }}>
              {lang === "ru" ? sign.ru : sign.en}
            </span>

            {/* Dates */}
            <span style={{
              fontFamily: "'Raleway', sans-serif",
              fontWeight: 300, fontSize: 10,
              letterSpacing: "0.04em",
              color: `rgba(${r},${g},${b},0.55)`,
              position: "relative", zIndex: 1,
            }}>
              {sign.dates}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

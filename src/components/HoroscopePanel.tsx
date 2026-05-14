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
              padding: "6px 14px 6px 10px",
              cursor: "pointer",
              fontFamily: "'Raleway', sans-serif",
              fontWeight: 300, fontSize: 11,
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: `rgba(${r},${g},${b},0.80)`,
              transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1, marginTop: -1 }}>‹</span>
            <span>{lang === "ru" ? "Назад" : "Back"}</span>
          </button>

          <p style={{
            flex: 1, textAlign: "right",
            fontFamily: "'Raleway', sans-serif",
            fontWeight: 200, fontSize: 10,
            color: `rgba(${r},${g},${b},0.40)`,
            letterSpacing: "0.16em", textTransform: "uppercase",
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
            fontWeight: 200, fontSize: 10,
            color: `rgba(${r},${g},${b},0.50)`,
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
              fontSize: i === 0 ? 18 : 15,
              color: i === 0
                ? "rgba(255,252,245,0.90)"
                : i === 1
                  ? "rgba(255,255,255,0.55)"
                  : `rgba(${r},${g},${b},0.65)`,
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
            fontWeight: 200, fontSize: 8,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: `rgba(${r},${g},${b},0.28)`,
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
        padding: "8px 16px 6px",
        flexShrink: 0,
      }}>
        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: "italic", fontWeight: 300, fontSize: 13,
          color: `rgba(${r},${g},${b},0.50)`,
          letterSpacing: "0.16em",
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
        padding: "6px 10px 12px",
      }}>
        {ZODIAC_SIGNS.map((sign) => (
          <button
            key={sign.key}
            onClick={() => setSelected(sign.key)}
            style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              borderRadius: 18,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              cursor: "pointer",
              transition: "all 0.22s",
              gap: 4,
              padding: "6px 4px",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget;
              el.style.background = `rgba(${r},${g},${b},0.13)`;
              el.style.border = `1px solid rgba(${r},${g},${b},0.45)`;
              el.style.boxShadow = `0 0 20px rgba(${r},${g},${b},0.25)`;
            }}
            onMouseLeave={e => {
              const el = e.currentTarget;
              el.style.background = "rgba(255,255,255,0.04)";
              el.style.border = "1px solid rgba(255,255,255,0.10)";
              el.style.boxShadow = "none";
            }}
          >
            {/* Subtle inner glow */}
            <div style={{
              position: "absolute", inset: 0,
              background: `radial-gradient(ellipse at 50% 30%, rgba(${r},${g},${b},0.07) 0%, transparent 70%)`,
              pointerEvents: "none",
            }} />

            <span style={{
              fontSize: 34,
              lineHeight: 1,
              color: `rgba(${r},${g},${b},0.9)`,
              filter: `drop-shadow(0 0 10px rgba(${r},${g},${b},0.8)) drop-shadow(0 0 20px rgba(${r},${g},${b},0.4))`,
              position: "relative",
              zIndex: 1,
            }}>
              {sign.symbol}
            </span>

            <span style={{
              fontFamily: "'Raleway', sans-serif",
              fontWeight: 300, fontSize: 9.5,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.65)",
              position: "relative", zIndex: 1,
            }}>
              {lang === "ru" ? sign.ru : sign.en}
            </span>

            <span style={{
              fontFamily: "'Raleway', sans-serif",
              fontWeight: 200, fontSize: 7.5,
              letterSpacing: "0.06em",
              color: `rgba(${r},${g},${b},0.40)`,
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

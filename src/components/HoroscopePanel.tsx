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
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        textAlign: "center",
        padding: "8px 16px 4px",
        flexShrink: 0,
      }}>
        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: "italic", fontWeight: 300, fontSize: 12,
          color: `rgba(${r},${g},${b},0.55)`,
          letterSpacing: "0.18em", textTransform: "uppercase",
          margin: 0,
        }}>
          {lang === "ru" ? "гороскоп на" : "horoscope for"} {dateStr}
        </p>
      </div>

      {/* Zodiac grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: 8, padding: "8px 12px",
        flexShrink: 0,
      }}>
        {ZODIAC_SIGNS.map((sign) => {
          const isActive = selected === sign.key;
          return (
            <button
              key={sign.key}
              onClick={() => setSelected(sign.key === selected ? null : sign.key)}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                padding: "10px 4px",
                borderRadius: 14,
                background: isActive
                  ? `rgba(${r},${g},${b},0.18)`
                  : "rgba(255,255,255,0.04)",
                border: isActive
                  ? `1px solid rgba(${r},${g},${b},0.65)`
                  : "1px solid rgba(255,255,255,0.09)",
                boxShadow: isActive
                  ? `0 0 20px rgba(${r},${g},${b},0.3), inset 0 0 12px rgba(${r},${g},${b},0.08)`
                  : "none",
                cursor: "pointer",
                transition: "all 0.25s",
                gap: 3,
              }}
            >
              <span style={{
                fontSize: 22,
                lineHeight: 1,
                filter: isActive
                  ? `drop-shadow(0 0 8px rgba(${r},${g},${b},0.9))`
                  : "none",
                transition: "filter 0.25s",
              }}>
                {sign.symbol}
              </span>
              <span style={{
                fontFamily: "'Raleway', sans-serif",
                fontWeight: 300, fontSize: 8.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: isActive
                  ? `rgba(${r},${g},${b},0.95)`
                  : "rgba(255,255,255,0.38)",
                transition: "color 0.25s",
              }}>
                {lang === "ru" ? sign.ru : sign.en}
              </span>
            </button>
          );
        })}
      </div>

      {/* Horoscope text area */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "4px 20px 20px",
        display: "flex", flexDirection: "column",
      }}>
        {!selected && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 10,
          }}>
            <span style={{ fontSize: 36, opacity: 0.25 }}>✦</span>
            <p style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontStyle: "italic", fontWeight: 300, fontSize: 16,
              color: "rgba(255,255,255,0.22)",
              textAlign: "center", margin: 0,
              letterSpacing: "0.04em",
            }}>
              {lang === "ru" ? "Выбери знак зодиака" : "Choose your zodiac sign"}
            </p>
            <p style={{
              fontFamily: "'Raleway', sans-serif",
              fontWeight: 200, fontSize: 9,
              color: `rgba(${r},${g},${b},0.3)`,
              letterSpacing: "0.2em", textTransform: "uppercase",
              margin: 0, textAlign: "center",
            }}>
              {lang === "ru" ? "вселенная ждёт" : "the universe awaits"}
            </p>
          </div>
        )}

        {selected && selectedMeta && horoscope && (
          <div style={{
            borderRadius: 18,
            background: `rgba(${r},${g},${b},0.06)`,
            border: `0.5px solid rgba(${r},${g},${b},0.25)`,
            boxShadow: `0 0 40px rgba(${r},${g},${b},0.08)`,
            padding: "18px 18px",
          }}>
            {/* Sign header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
            }}>
              <span style={{
                fontSize: 30,
                filter: `drop-shadow(0 0 10px rgba(${r},${g},${b},0.8))`,
              }}>
                {selectedMeta.symbol}
              </span>
              <div>
                <p style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontStyle: "italic", fontWeight: 400, fontSize: 20,
                  color: "rgba(255,252,245,0.92)", margin: 0,
                  letterSpacing: "0.03em",
                }}>
                  {lang === "ru" ? selectedMeta.ru : selectedMeta.en}
                </p>
                <p style={{
                  fontFamily: "'Raleway', sans-serif",
                  fontWeight: 200, fontSize: 9,
                  color: `rgba(${r},${g},${b},0.5)`,
                  letterSpacing: "0.16em", textTransform: "uppercase",
                  margin: "3px 0 0",
                }}>
                  {selectedMeta.dates}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div style={{
              height: 0.5, background: `rgba(${r},${g},${b},0.2)`, marginBottom: 16,
            }} />

            {/* Horoscope text */}
            {horoscope.split("\n\n").map((paragraph, i) => (
              <p key={i} style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontStyle: i === 0 ? "italic" : "normal",
                fontWeight: i === 0 ? 400 : 300,
                fontSize: i === 0 ? 17 : 14,
                color: i === 0 ? "rgba(255,252,245,0.88)" : `rgba(${r},${g},${b},0.65)`,
                lineHeight: 1.65,
                letterSpacing: "0.02em",
                margin: i === 0 ? "0 0 12px" : 0,
              }}>
                {paragraph}
              </p>
            ))}

            {/* Free badge */}
            <div style={{
              marginTop: 16,
              display: "flex", justifyContent: "center",
            }}>
              <span style={{
                fontFamily: "'Raleway', sans-serif",
                fontWeight: 200, fontSize: 8,
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: `rgba(${r},${g},${b},0.3)`,
                borderTop: `0.5px solid rgba(${r},${g},${b},0.15)`,
                paddingTop: 10,
              }}>
                {lang === "ru"
                  ? "✦ бесплатно · обновляется каждый день ✦"
                  : "✦ free · updates every day ✦"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef } from "react";

export type HistoryEntry = {
  id: string;
  text: string;
  category: "love" | "work" | "money";
  date: string;
};

const CATEGORY_LABELS = {
  love:  { label: "Любовь",  accent: "#ff4466", rgb: "220,40,80" },
  work:  { label: "Работа",  accent: "#5599ff", rgb: "60,140,255" },
  money: { label: "Деньги",  accent: "#33dd77", rgb: "40,200,100" },
};

interface HistoryPanelProps {
  entries: HistoryEntry[];
  open: boolean;
  onClose: () => void;
  accentColor: string;
  accentGlow: string;
  accentRgb: { r: number; g: number; b: number };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `сегодня · ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `вчера · ${time}`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) + ` · ${time}`;
}

export default function HistoryPanel({
  entries, open, onClose, accentColor, accentRgb,
}: HistoryPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const { r, g, b } = accentRgb;

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => { startYRef.current = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      if (startYRef.current === null) return;
      const delta = e.changedTouches[0].clientY - startYRef.current;
      if (delta > 60) onClose();
      startYRef.current = null;
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "absolute", inset: 0, zIndex: 20,
          background: "rgba(0,0,0,0.6)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.35s",
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          zIndex: 30,
          borderRadius: "24px 24px 0 0",
          background: "rgba(4,5,14,0.98)",
          backdropFilter: "blur(30px)",
          borderTop: `0.5px solid rgba(${r},${g},${b},0.25)`,
          borderLeft: `0.5px solid rgba(${r},${g},${b},0.12)`,
          borderRight: `0.5px solid rgba(${r},${g},${b},0.12)`,
          boxShadow: `0 -12px 60px rgba(0,0,0,0.8), 0 -1px 0 rgba(${r},${g},${b},0.2)`,
          transform: open ? "translateY(0)" : "translateY(110%)",
          transition: "transform 0.45s cubic-bezier(0.32, 0.72, 0, 1)",
          maxHeight: "75vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 14, paddingBottom: 10, flexShrink: 0 }}>
          <div
            style={{
              width: 36, height: 3, borderRadius: 99,
              background: `rgba(${r},${g},${b},0.3)`,
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            paddingLeft: 24, paddingRight: 20,
            paddingBottom: 16,
            flexShrink: 0,
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: 22,
                color: "rgba(255,252,245,0.9)",
                letterSpacing: "0.02em",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              Послания
            </p>
            <p
              style={{
                fontFamily: "'Raleway', sans-serif",
                fontWeight: 200,
                fontSize: 9,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: `rgba(${r},${g},${b},0.5)`,
                margin: 0,
                marginTop: 4,
              }}
            >
              {entries.length > 0 ? `последние ${entries.length}` : "пусто"}
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: `0.5px solid rgba(255,255,255,0.1)`,
              borderRadius: 99,
              padding: "5px 14px",
              cursor: "pointer",
              fontFamily: "'Raleway', sans-serif",
              fontWeight: 300,
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)",
            }}
          >
            закрыть
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 0.5, background: `rgba(${r},${g},${b},0.12)`, flexShrink: 0, marginLeft: 24, marginRight: 24 }} />

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1, padding: "12px 16px 16px" }}>
          {entries.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 48, paddingBottom: 48 }}>
              <p
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 18,
                  color: "rgba(255,255,255,0.15)",
                  margin: 0,
                }}
              >
                Вселенная ещё молчит
              </p>
              <p
                style={{
                  fontFamily: "'Raleway', sans-serif",
                  fontWeight: 200,
                  fontSize: 9,
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.1)",
                  marginTop: 10,
                }}
              >
                Коснись затмения
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...entries].reverse().map((entry, idx) => {
                const cat = CATEGORY_LABELS[entry.category];
                return (
                  <div
                    key={entry.id}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 16,
                      background: idx === 0
                        ? `rgba(${cat.rgb},0.07)`
                        : "rgba(255,255,255,0.02)",
                      border: `0.5px solid rgba(${cat.rgb},${idx === 0 ? "0.22" : "0.1"})`,
                      transition: "all 0.2s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Raleway', sans-serif",
                          fontWeight: 300,
                          fontSize: 9,
                          letterSpacing: "0.22em",
                          textTransform: "uppercase",
                          color: cat.accent,
                          opacity: 0.7,
                        }}
                      >
                        {cat.label}
                      </span>
                      <span
                        style={{
                          fontFamily: "'Raleway', sans-serif",
                          fontWeight: 200,
                          fontSize: 9,
                          letterSpacing: "0.1em",
                          color: "rgba(255,255,255,0.2)",
                        }}
                      >
                        {formatDate(entry.date)}
                      </span>
                    </div>
                    <p
                      style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontStyle: "italic",
                        fontWeight: 400,
                        fontSize: 15,
                        lineHeight: 1.55,
                        color: "rgba(255,252,245,0.82)",
                        margin: 0,
                        letterSpacing: "0.01em",
                      }}
                    >
                      {entry.text}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ flexShrink: 0, height: 20 }} />
      </div>
    </>
  );
}

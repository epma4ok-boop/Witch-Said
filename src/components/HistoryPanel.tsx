import { useEffect, useRef } from "react";

export type HistoryEntry = {
  id: string;
  text: string;
  category: "love" | "work" | "money";
  date: string; // ISO string
};

const CATEGORY_LABELS = {
  love: { emoji: "💗", label: "Любовь", accent: "#ff4466" },
  work: { emoji: "⚙️", label: "Работа", accent: "#5599ff" },
  money: { emoji: "📊", label: "Деньги", accent: "#33dd77" },
};

interface HistoryPanelProps {
  entries: HistoryEntry[];
  open: boolean;
  onClose: () => void;
  accentColor: string;
  accentGlow: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Сегодня, ${time}`;
  if (isYesterday) return `Вчера, ${time}`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) + `, ${time}`;
}

export default function HistoryPanel({ entries, open, onClose, accentColor, accentGlow }: HistoryPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);

  // Close on swipe down
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
    return () => { el.removeEventListener("touchstart", onTouchStart); el.removeEventListener("touchend", onTouchEnd); };
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-20 transition-opacity duration-400"
        style={{ background: "rgba(0,0,0,0.55)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="absolute bottom-0 left-0 right-0 z-30 rounded-t-3xl transition-transform duration-500"
        style={{
          background: "rgba(5,8,18,0.97)",
          backdropFilter: "blur(20px)",
          border: `1px solid ${accentColor}33`,
          boxShadow: `0 -8px 40px rgba(0,0,0,0.7), 0 -2px 0 ${accentColor}44`,
          transform: open ? "translateY(0)" : "translateY(110%)",
          maxHeight: "72vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: `${accentColor}66` }}
          />
        </div>

        {/* Header */}
        <div className="px-6 pb-3 flex-shrink-0 flex items-center justify-between">
          <div>
            <h2
              className="text-sm font-bold tracking-widest uppercase"
              style={{ color: accentColor, fontFamily: "monospace", textShadow: `0 0 10px ${accentGlow}` }}
            >
              История посланий
            </h2>
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
              Последние {entries.length} из вселенной
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-lg leading-none"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            ✕
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: `${accentColor}22`, flexShrink: 0 }} />

        {/* List */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {entries.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-2xl mb-2">🌌</p>
              <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
                Ещё нет посланий
              </p>
            </div>
          ) : (
            [...entries].reverse().map((entry) => {
              const cat = CATEGORY_LABELS[entry.category];
              return (
                <div
                  key={entry.id}
                  className="rounded-2xl p-4 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${cat.accent}22`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{cat.emoji}</span>
                    <span
                      className="text-[10px] font-bold tracking-widest uppercase"
                      style={{ color: cat.accent, fontFamily: "monospace" }}
                    >
                      {cat.label}
                    </span>
                    <span
                      className="ml-auto text-[10px]"
                      style={{ color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}
                    >
                      {formatDate(entry.date)}
                    </span>
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.82)", fontFamily: "'Cinzel', serif" }}
                  >
                    {entry.text}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom safe area */}
        <div className="flex-shrink-0 pb-6" />
      </div>
    </>
  );
}

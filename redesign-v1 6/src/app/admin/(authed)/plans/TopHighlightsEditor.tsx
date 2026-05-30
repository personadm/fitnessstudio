"use client";

import { useState } from "react";

const PETROL = "#0F6E56";
const GOLD_BG = "#FAEEDA";
const GOLD_TEXT = "#854F0B";

export type TopHighlightEntry = {
  text: string;
  subtitle: string;
  isGold: boolean;
};

interface Props {
  defaultValue: TopHighlightEntry[];
}

/**
 * Editor für die 3 Top-Highlights, die auf /anmelden in den großen Kacheln
 * angezeigt werden.
 *
 * Funktionsweise:
 *  - State hält bis zu 3 Einträge {text, subtitle, isGold}
 *  - Wird beim Submit als JSON-String ins versteckte Input-Feld "topHighlights"
 *    serialisiert (savePlan-Action parsed das JSON).
 *  - "+" Button fügt einen leeren Slot hinzu (max. 3).
 *  - "Entfernen" entfernt einen Slot.
 *  - Drag-Reorder via ▲ / ▼ Buttons.
 */
export function TopHighlightsEditor({ defaultValue }: Props) {
  const [items, setItems] = useState<TopHighlightEntry[]>(defaultValue);

  function update(idx: number, patch: Partial<TopHighlightEntry>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function add() {
    if (items.length >= 3) return;
    setItems((prev) => [...prev, { text: "", subtitle: "", isGold: false }]);
  }

  function remove(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function move(idx: number, dir: -1 | 1) {
    setItems((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  }

  // Nur Einträge mit Text werden serialisiert
  const serialized = JSON.stringify(items.filter((i) => i.text.trim().length > 0));

  return (
    <div className="rounded-lg border border-ink/15 bg-ink/5 p-4">
      <p className="label mb-1">Top-Highlights (max. 3, groß auf /anmelden)</p>
      <p className="mb-3 text-xs text-muted">
        Diese werden oben auf der Anmeldeseite als drei große Kacheln angezeigt.
        Wenn leer: die ersten 3 Highlights aus der Liste oben werden als Fallback genommen.
      </p>

      {/* Hidden Input für Form-Submit */}
      <input type="hidden" name="topHighlights" value={serialized} />

      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="rounded-md border bg-white p-3"
            style={{ borderColor: item.isGold ? "rgba(133,79,11,0.3)" : "#E8E2D5" }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] text-muted">
                Kachel {idx + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  title="Nach oben"
                  className="rounded px-1.5 py-0.5 font-mono text-xs hover:bg-ink/10 disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === items.length - 1}
                  title="Nach unten"
                  className="rounded px-1.5 py-0.5 font-mono text-xs hover:bg-ink/10 disabled:opacity-30"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  title="Entfernen"
                  className="rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-red-700 hover:bg-red-700/10"
                >
                  Entfernen
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={item.text}
                onChange={(e) => update(idx, { text: e.target.value })}
                placeholder="z.B. 2 Std. Personal-Coaching"
                maxLength={120}
                className="w-full rounded border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
              />
              <input
                type="text"
                value={item.subtitle}
                onChange={(e) => update(idx, { subtitle: e.target.value })}
                placeholder={`Untertitel (optional, z.B. „persönlicher Start")`}
                maxLength={120}
                className="w-full rounded border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
              />
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={item.isGold}
                  onChange={(e) => update(idx, { isGold: e.target.checked })}
                  className="h-4 w-4"
                  style={{ accentColor: GOLD_TEXT }}
                />
                <span>
                  Gold-Hervorhebung (besonders wichtige Kachel, z.B. Krankenkassen-Erstattung)
                </span>
                {item.isGold && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: GOLD_BG, color: GOLD_TEXT }}
                  >
                    Gold
                  </span>
                )}
              </label>
            </div>
          </div>
        ))}
      </div>

      {items.length < 3 && (
        <button
          type="button"
          onClick={add}
          className="mt-3 rounded border border-dashed border-ink/30 px-3 py-2 font-mono text-xs uppercase tracking-wider text-muted hover:border-ink/50 hover:text-ink"
        >
          + Kachel hinzufügen ({3 - items.length} möglich)
        </button>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

interface Props {
  stepId: string;
  funnelId: string;
  initialSubject: string;
  initialBodyHtml: string;
  initialDelayDays: number;
  initialDelayHours: number;
  initialScheduleWeekday: number | null;
  initialScheduleHour: number | null;
  initialScheduleMinute: number | null;
  /**
   * Hinweis-Banner falls Funnel-weite Legacy-Schedule-Settings noch aktiv sind.
   */
  funnelLegacyScheduleEnabled: boolean;
  action: (formData: FormData) => Promise<unknown>;
}

const WEEKDAY_LABELS: Record<number, string> = {
  0: "Sonntag",
  1: "Montag",
  2: "Dienstag",
  3: "Mittwoch",
  4: "Donnerstag",
  5: "Freitag",
  6: "Samstag",
};

export function EditStepForm({
  stepId,
  funnelId,
  initialSubject,
  initialBodyHtml,
  initialDelayDays,
  initialDelayHours,
  initialScheduleWeekday,
  initialScheduleHour,
  initialScheduleMinute,
  funnelLegacyScheduleEnabled,
  action,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Stable initial reference — schützt vor TipTap-Re-Mount-Bug
  const stableInitialBodyHtml = useRef(initialBodyHtml).current;

  const [subject, setSubject] = useState(initialSubject);
  const [bodyHtml, setBodyHtml] = useState(initialBodyHtml);
  const [delayDays, setDelayDays] = useState(initialDelayDays);
  const [delayHours, setDelayHours] = useState(initialDelayHours);
  const [hybridMode, setHybridMode] = useState(initialScheduleWeekday !== null);
  const [scheduleWeekday, setScheduleWeekday] = useState(
    initialScheduleWeekday ?? 3,
  );
  const [scheduleHour, setScheduleHour] = useState(initialScheduleHour ?? 9);
  const [scheduleMinute, setScheduleMinute] = useState(
    initialScheduleMinute ?? 0,
  );
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function handleSubmit() {
    setError(null);
    setSavedAt(null);

    if (!subject.trim()) {
      setError("Bitte einen Betreff eingeben.");
      return;
    }
    if (!bodyHtml.trim() || bodyHtml === "<p></p>") {
      setError("Bitte einen Mail-Inhalt eingeben.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("subject", subject.trim());
      formData.set("bodyHtml", bodyHtml);
      formData.set("delayDays", String(delayDays));
      formData.set("delayHours", String(delayHours));
      // Hybrid: wenn aktiviert, sende die Schedule-Felder. Sonst empty.
      if (hybridMode) {
        formData.set("scheduleWeekday", String(scheduleWeekday));
        formData.set("scheduleHour", String(scheduleHour));
        formData.set("scheduleMinute", String(scheduleMinute));
      } else {
        formData.set("scheduleWeekday", "");
        formData.set("scheduleHour", "");
        formData.set("scheduleMinute", "");
      }

      try {
        await action(formData);
        setSavedAt(new Date());
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("NEXT_REDIRECT")) return;
        setError("Speichern fehlgeschlagen: " + msg);
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Wartezeit */}
      <section>
        <p className="label mb-3">Wartezeit nach Eintragung</p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            value={delayDays}
            onChange={(e) => setDelayDays(parseInt(e.target.value) || 0)}
            className="w-20 border-b border-ink/20 bg-transparent py-2 text-center focus:border-ink focus:outline-none"
          />
          <span className="text-sm">Tage</span>
          <input
            type="number"
            min="0"
            max="23"
            value={delayHours}
            onChange={(e) => setDelayHours(parseInt(e.target.value) || 0)}
            className="w-20 border-b border-ink/20 bg-transparent py-2 text-center focus:border-ink focus:outline-none"
          />
          <span className="text-sm">Stunden</span>
        </div>
      </section>

      {funnelLegacyScheduleEnabled && !hybridMode && (
        <section className="border border-acid bg-acid/20 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink">
            ⓘ Funnel hat alte Wochenplan-Settings — sie greifen für diesen Step
            solange du den Hybrid-Modus unten nicht aktivierst.
          </p>
        </section>
      )}

      {/* ───────── HYBRID-MODUS ───────── */}
      <section className="border-t border-ink/15 pt-5">
        <label className="flex items-start gap-2 text-sm cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={hybridMode}
            onChange={(e) => setHybridMode(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-ink"
          />
          <span>
            <strong>Fester Wochentag (z.B. immer Mittwoch)</strong>
            <br />
            <span className="font-mono text-[11px] text-muted">
              AN: frühestens nach der Wartezeit oben, dann am nächsten
              gewählten Wochentag. AUS: genau nach Wartezeit (Vorlauf-Mail).
            </span>
          </span>
        </label>

        {hybridMode && (
          <div className="ml-6 space-y-3 border-l-2 border-ink/15 pl-4">
            <label className="block">
              <span className="label mb-2 block">Wochentag</span>
              <select
                value={scheduleWeekday}
                onChange={(e) => setScheduleWeekday(parseInt(e.target.value))}
                className="w-full border border-ink/20 bg-transparent p-2 text-sm outline-none focus:border-ink"
              >
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <option key={d} value={d}>
                    {WEEKDAY_LABELS[d]}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex gap-3">
              <label className="block">
                <span className="label mb-2 block">Stunde</span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={scheduleHour}
                  onChange={(e) => setScheduleHour(parseInt(e.target.value) || 0)}
                  className="w-20 border-b border-ink/20 bg-transparent py-2 text-sm outline-none focus:border-ink focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="label mb-2 block">Minute</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  step={5}
                  value={scheduleMinute}
                  onChange={(e) =>
                    setScheduleMinute(parseInt(e.target.value) || 0)
                  }
                  className="w-20 border-b border-ink/20 bg-transparent py-2 text-sm outline-none focus:border-ink focus:outline-none"
                />
              </label>
            </div>
          </div>
        )}
      </section>

      {/* Betreff */}
      <section>
        <label className="label mb-2 block">Betreff</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full border-b border-ink/20 bg-transparent py-2 text-base focus:border-ink focus:outline-none"
        />
        <p className="mt-1 font-mono text-[10px] text-muted">
          {"{{firstName}} wird beim Versand ersetzt."}
        </p>
      </section>

      {/* Mail-Inhalt im WYSIWYG-Editor */}
      <section>
        <label className="label mb-2 block">Mail-Inhalt</label>
        <RichTextEditor
          key={stepId}
          initialHtml={stableInitialBodyHtml}
          onChange={setBodyHtml}
          placeholder="Schreibe hier oder kopiere Text aus Word/Pages rein…"
        />
        <p className="mt-2 font-mono text-[10px] text-muted leading-relaxed">
          {"· Strg+V: Text mit Formatierung aus Word/Pages einfügen"}
          <br />
          {"· 🖼 Bild: an Cursor-Position einfügen (max. 4 MB)"}
          <br />
          {"· 🔗 Link: Text markieren, dann klicken"}
        </p>
      </section>

      {error && (
        <div className="border border-red-300 bg-red-50 p-3 font-mono text-[11px] text-red-700">
          {error}
        </div>
      )}

      {savedAt && (
        <div className="border border-green-300 bg-green-50 p-3 font-mono text-[11px] text-green-800">
          ✓ Gespeichert um{" "}
          {savedAt.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}{" "}
          — du kannst weiter editieren oder zur Funnel-Übersicht zurück.
        </div>
      )}

      <div className="flex items-center gap-3 pt-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="bg-ink px-6 py-3 font-mono text-xs uppercase tracking-[0.12em] text-acid hover:bg-ink-soft disabled:opacity-50"
        >
          {isPending ? "Speichere…" : "Änderungen speichern"}
        </button>
        <Link
          href={`/admin/funnels/${funnelId}`}
          className="px-6 py-3 font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink"
        >
          {savedAt ? "Zur Funnel-Übersicht" : "Abbrechen"}
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { addFunnelStep } from "@/app/admin/_actions";
import { EmailComposer } from "@/components/admin/EmailComposer";
import { EmailPreview } from "@/components/admin/EmailPreview";

interface Props {
  funnelId: string;
  isFirst: boolean;
  /**
   * Wenn der Funnel im LEGACY-Wochenplan-Modus ist (alte Funnel-weite
   * Schedule-Settings), wird in der UI ein Hinweis angezeigt. Steps können
   * trotzdem eigene Schedule-Settings haben (Hybrid).
   */
  scheduleEnabled?: boolean;
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

export function AddFunnelStepForm({ funnelId, isFirst, scheduleEnabled }: Props) {
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [hybridMode, setHybridMode] = useState(false);

  return (
    <div>
      <EmailComposer
        kind="funnel"
        onGenerated={(s, h) => {
          setSubject(s);
          setBodyHtml(h);
        }}
      />

      <form
        action={async (fd: FormData) => {
          await addFunnelStep(funnelId, fd);
          setSubject("");
          setBodyHtml("");
          setHybridMode(false);
        }}
        className="space-y-5 border border-ink/15 p-6"
      >
        {/* ───────── Wartezeit ───────── */}
        <div>
          <span className="label mb-2 block">Wartezeit nach Eintragung</span>
          {scheduleEnabled && (
            <p className="mb-3 border border-acid_dark/30 bg-acid/10 p-3 font-mono text-[11px] text-ink">
              ℹ Funnel hat noch alte Wochenplan-Settings — Steps mit Hybrid-Option
              (siehe unten) überschreiben sie pro Step.
            </p>
          )}
          <div className="flex flex-wrap items-end gap-4">
            <label className="block">
              <input
                type="number"
                name="delayDays"
                min={0}
                max={3650}
                defaultValue={isFirst ? 0 : 3}
                required
                className="w-24 border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
              />
              <span className="ml-2 font-mono text-xs text-muted">Tage</span>
            </label>
            <label className="block">
              <input
                type="number"
                name="delayHours"
                min={0}
                max={23}
                defaultValue={0}
                required
                className="w-24 border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
              />
              <span className="ml-2 font-mono text-xs text-muted">Stunden</span>
            </label>
          </div>
          <span className="mt-2 block font-mono text-[11px] text-muted">
            0/0 = sofort beim nächsten Verarbeitungslauf. Beispiel: 3 Tage + 12
            Stunden = 84 Stunden nach Eintragung.
          </span>
        </div>

        {/* ───────── HYBRID-MODUS ───────── */}
        <div className="border-t border-ink/15 pt-5">
          <label className="flex items-start gap-2 text-sm cursor-pointer mb-3">
            <input
              type="checkbox"
              name="hybridMode"
              checked={hybridMode}
              onChange={(e) => setHybridMode(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-ink"
            />
            <span>
              <strong>Hybrid-Modus für diesen Step</strong>
              <br />
              <span className="font-mono text-[11px] text-muted">
                Frühestens nach der Wartezeit oben, danach am nächsten
                Wochentag X um Uhrzeit Y. Sonst genau nach Wartezeit.
              </span>
            </span>
          </label>

          {hybridMode && (
            <div className="ml-6 space-y-3 border-l-2 border-ink/15 pl-4">
              <label className="block">
                <span className="label mb-2 block">Wochentag</span>
                <select
                  name="scheduleWeekday"
                  defaultValue={3}
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
                    name="scheduleHour"
                    min={0}
                    max={23}
                    defaultValue={9}
                    className="w-20 border-b-2 border-ink bg-transparent py-2 text-sm outline-none focus:border-acid_dark"
                  />
                </label>
                <label className="block">
                  <span className="label mb-2 block">Minute</span>
                  <input
                    type="number"
                    name="scheduleMinute"
                    min={0}
                    max={59}
                    step={5}
                    defaultValue={0}
                    className="w-20 border-b-2 border-ink bg-transparent py-2 text-sm outline-none focus:border-acid_dark"
                  />
                </label>
              </div>

              <p className="font-mono text-[11px] text-muted">
                Beispiel: Wartezeit „3 Tage" + Hybrid „Mittwoch 9:00" → bei
                Dienstag-Eintragung kommt die Mail am Mittwoch der Folgewoche
                um 9:00 (frühestens Tag 3 = Freitag, dann nächster Mittwoch).
              </p>
            </div>
          )}
        </div>

        {/* ───────── Betreff ───────── */}
        <label className="block">
          <span className="label mb-2 block">Betreff</span>
          <input
            type="text"
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            placeholder="z.B. Schade, dass du gegangen bist, {{firstName}}"
            className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
          />
        </label>

        {/* ───────── Mail-Inhalt ───────── */}
        <label className="block">
          <span className="label mb-2 block">Mail-Inhalt (HTML erlaubt)</span>
          <textarea
            name="bodyHtml"
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            required
            rows={10}
            placeholder={`<p>Hallo {{firstName}},</p>\n<p>schade, dass du dich entschieden hast, deine Mitgliedschaft zu beenden ...</p>`}
            className="w-full border border-ink/20 bg-transparent p-3 font-mono text-sm outline-none focus:border-ink"
          />
          <span className="mt-1 block font-mono text-[11px] text-muted">
            Platzhalter: <code>{`{{firstName}}`}</code> und{" "}
            <code>{`{{lastName}}`}</code> werden beim Versand automatisch ersetzt.
          </span>
        </label>

        {/* Live-Vorschau */}
        {bodyHtml.trim() && (
          <div>
            <p className="label mb-2">So sieht's aus</p>
            <EmailPreview subject={subject} bodyHtml={bodyHtml} />
          </div>
        )}

        <button
          type="submit"
          className="bg-ink px-5 py-2.5 font-mono text-xs uppercase tracking-[0.12em] text-acid hover:bg-ink-soft"
        >
          + Schritt anlegen
        </button>
      </form>
    </div>
  );
}

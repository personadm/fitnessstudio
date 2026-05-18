"use client";

import Link from "next/link";
import { useState } from "react";

interface Props {
  stepId: string;
  funnelId: string;
  initialSubject: string;
  initialBodyHtml: string;
  initialDelayDays: number;
  initialDelayHours: number;
  scheduleMode: boolean;
  action: (formData: FormData) => Promise<void>;
}

export function EditStepForm({
  funnelId,
  initialSubject,
  initialBodyHtml,
  initialDelayDays,
  initialDelayHours,
  scheduleMode,
  action,
}: Props) {
  const [subject, setSubject] = useState(initialSubject);
  const [bodyHtml, setBodyHtml] = useState(initialBodyHtml);
  const [delayDays, setDelayDays] = useState(initialDelayDays);
  const [delayHours, setDelayHours] = useState(initialDelayHours);
  const [showPreview, setShowPreview] = useState(false);

  return (
    <form action={action} className="space-y-8">
      {/* Wartezeit oder Hinweis bei Wochenplan-Modus */}
      {scheduleMode ? (
        <div className="border border-ink/15 bg-ink/5 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Wochenplan-Modus
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Dieser Funnel folgt einem festen Wochenplan — die Wartezeit ergibt sich automatisch
            aus der Schritt-Reihenfolge. Wartezeit-Felder werden hier ignoriert.
          </p>
          {/* Trotzdem hidden inputs damit die Validation nicht meckert */}
          <input type="hidden" name="delayDays" value={initialDelayDays} />
          <input type="hidden" name="delayHours" value={initialDelayHours} />
        </div>
      ) : (
        <div>
          <p className="label mb-3">Wartezeit ab Eintritt in den Funnel</p>
          <div className="grid grid-cols-2 gap-4 md:max-w-md">
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                Tage
              </span>
              <input
                type="number"
                name="delayDays"
                min={0}
                max={3650}
                value={delayDays}
                onChange={(e) => setDelayDays(Number(e.target.value))}
                className="mt-1 w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                Stunden
              </span>
              <input
                type="number"
                name="delayHours"
                min={0}
                max={23}
                value={delayHours}
                onChange={(e) => setDelayHours(Number(e.target.value))}
                className="mt-1 w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
              />
            </label>
          </div>
        </div>
      )}

      {/* Betreff */}
      <div>
        <label className="block">
          <span className="label mb-2 block">Betreff</span>
          <input
            type="text"
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            maxLength={200}
            className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
          />
        </label>
        <p className="mt-1 text-xs text-muted">{subject.length} / 200 Zeichen</p>
      </div>

      {/* Body HTML */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="label">Mail-Body (HTML)</span>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="font-mono text-[11px] uppercase tracking-[0.14em] underline underline-offset-4 hover:text-ink-soft"
          >
            {showPreview ? "Quelltext zeigen" : "Vorschau zeigen"}
          </button>
        </div>

        {showPreview ? (
          <div className="border border-ink/20 bg-white p-5 min-h-[400px]">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </div>
        ) : (
          <textarea
            name="bodyHtml"
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            rows={20}
            required
            className="w-full border border-ink/20 bg-white p-3 font-mono text-xs leading-relaxed outline-none focus:border-ink"
          />
        )}

        {/* Wenn Preview an ist, hidden input damit das Form trotzdem den HTML-Wert sendet */}
        {showPreview && <input type="hidden" name="bodyHtml" value={bodyHtml} />}

        <p className="mt-2 text-xs text-muted">
          Tipp: Links im HTML — z. B. <code className="font-mono">{`<a href="https://...">`}</code>.
          Variable <code className="font-mono">{"{{firstName}}"}</code> wird beim Versand
          durch den Vornamen ersetzt.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-3 border-t border-ink/15 pt-6 md:flex-row md:items-center md:justify-between">
        <Link
          href={`/admin/funnels/${funnelId}`}
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ink"
        >
          Abbrechen
        </Link>
        <button
          type="submit"
          className="bg-ink px-8 py-3 text-acid hover:bg-ink-soft"
        >
          <span className="font-mono text-sm uppercase tracking-[0.14em]">
            Änderungen speichern →
          </span>
        </button>
      </div>
    </form>
  );
}

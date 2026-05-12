"use client";

import { useState } from "react";
import { addFunnelStep } from "@/app/admin/_actions";
import { AIEmailComposer } from "@/components/admin/AIEmailComposer";
import { EmailPreview } from "@/components/admin/EmailPreview";

interface Props {
  funnelId: string;
  isFirst: boolean;
  scheduleEnabled?: boolean;
}

export function AddFunnelStepForm({ funnelId, isFirst, scheduleEnabled }: Props) {
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");

  return (
    <div>
      <AIEmailComposer
        kind="funnel"
        onGenerated={(s, h) => {
          setSubject(s);
          setBodyHtml(h);
        }}
      />

      <form
        action={async (fd: FormData) => {
          await addFunnelStep(funnelId, fd);
          // Felder leeren für den nächsten Schritt
          setSubject("");
          setBodyHtml("");
        }}
        className="space-y-5 border border-ink/15 p-6"
      >
        <div>
          <span className="label mb-2 block">Wartezeit nach Eintragung</span>
          {scheduleEnabled && (
            <p className="mb-3 border border-acid_dark/30 bg-acid/10 p-3 font-mono text-[11px] text-ink">
              ℹ Dieser Funnel läuft im <strong>Wochenplan-Modus</strong> — die Wartezeit
              unten wird ignoriert. Schritte werden automatisch zum konfigurierten Wochentag
              versendet.
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
                disabled={scheduleEnabled}
                className="w-24 border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark disabled:opacity-40"
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
                disabled={scheduleEnabled}
                className="w-24 border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark disabled:opacity-40"
              />
              <span className="ml-2 font-mono text-xs text-muted">Stunden</span>
            </label>
          </div>
          {!scheduleEnabled && (
            <span className="mt-2 block font-mono text-[11px] text-muted">
              0 / 0 = sofort beim nächsten Verarbeitungslauf. Beispiel: 0 Tage + 4 Stunden = nach 4
              Stunden. Oder 3 Tage + 12 Stunden = 84 Stunden später.
            </span>
          )}
        </div>

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
            Platzhalter: <code>{`{{firstName}}`}</code> und <code>{`{{lastName}}`}</code> werden
            beim Versand automatisch durch den echten Vornamen/Nachnamen ersetzt.
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

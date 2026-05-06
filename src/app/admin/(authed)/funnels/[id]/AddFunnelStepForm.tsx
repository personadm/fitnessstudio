"use client";

import { useState } from "react";
import { addFunnelStep } from "@/app/admin/_actions";
import { AIEmailComposer } from "@/components/admin/AIEmailComposer";

interface Props {
  funnelId: string;
  isFirst: boolean;
}

export function AddFunnelStepForm({ funnelId, isFirst }: Props) {
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
          // Nach erfolgreichem Anlegen: Felder leeren für den nächsten Schritt
          setSubject("");
          setBodyHtml("");
        }}
        className="space-y-5 border border-ink/15 p-6"
      >
        <label className="block">
          <span className="label mb-2 block">Wartezeit (Tage nach Eintragung)</span>
          <input
            type="number"
            name="delayDays"
            min={0}
            max={3650}
            defaultValue={isFirst ? 0 : 3}
            required
            className="w-32 border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
          />
          <span className="mt-1 block font-mono text-[11px] text-muted">
            0 = sofort beim nächsten Verarbeitungslauf. Beispiel: 3 = 3 Tage nach Status-Wechsel.
          </span>
        </label>

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
            beim Versand automatisch ersetzt.
          </span>
        </label>

        {bodyHtml && bodyHtml.includes("<img") && (
          <div className="border border-ink/15 bg-cream/50 p-4">
            <p className="label mb-2">Live-Vorschau (vereinfacht)</p>
            <div
              className="prose prose-sm max-w-none text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
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

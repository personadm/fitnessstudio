"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateFunnelStep } from "@/app/admin/_actions";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

interface Props {
  step: {
    id: string;
    funnelId: string;
    orderNum: number;
    subject: string;
    bodyHtml: string;
    delayDays: number;
    delayHours: number;
  };
  funnel: {
    id: string;
    name: string;
    scheduleWeekday: number | null;
  };
}

/**
 * Funnel-Step bearbeiten — WYSIWYG-Modus.
 *
 * Lädt das gespeicherte bodyHtml direkt in den TipTap-Editor.
 * Beim Speichern wird der aktuelle Editor-State (HTML) zurück in die DB
 * geschrieben — keine Konvertierung über Markdown nötig.
 */
export function EditStepForm({ step, funnel }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [subject, setSubject] = useState(step.subject);
  const [bodyHtml, setBodyHtml] = useState(step.bodyHtml);
  const [delayDays, setDelayDays] = useState(step.delayDays);
  const [delayHours, setDelayHours] = useState(step.delayHours);
  const [error, setError] = useState<string | null>(null);

  const scheduleMode = funnel.scheduleWeekday !== null;

  function handleSubmit() {
    setError(null);
    if (!subject.trim()) {
      setError("Bitte einen Betreff eingeben.");
      return;
    }
    if (!bodyHtml.trim() || bodyHtml === "<p></p>") {
      setError("Bitte einen Mail-Inhalt eingeben.");
      return;
    }

    startTransition(async () => {
      const result = await updateFunnelStep({
        stepId: step.id,
        subject: subject.trim(),
        bodyHtml,
        delayDays,
        delayHours,
      });

      if (result.ok) {
        router.push(`/admin/funnels/${funnel.id}`);
        router.refresh();
      } else {
        setError(result.message ?? "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="p-8 md:p-12 max-w-4xl">
      <Link
        href={`/admin/funnels/${funnel.id}`}
        className="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink"
      >
        ← Zurück zum Funnel
      </Link>

      <div className="mt-6 mb-12">
        <p className="label">{funnel.name} · Schritt {step.orderNum}</p>
        <h1 className="mt-2 text-display text-4xl">Schritt bearbeiten</h1>
      </div>

      <div className="space-y-8">
        {/* Wartezeit (nur im klassischen Modus relevant) */}
        {!scheduleMode && (
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
        )}

        {scheduleMode && (
          <section className="border border-acid bg-acid/20 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink">
              ⓘ Dieser Funnel läuft im Wochenplan-Modus — die Wartezeit wird ignoriert.
              Schritte werden automatisch zum konfigurierten Wochentag versendet.
            </p>
          </section>
        )}

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
            initialHtml={step.bodyHtml}
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
            href={`/admin/funnels/${funnel.id}`}
            className="px-6 py-3 font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink"
          >
            Abbrechen
          </Link>
        </div>
      </div>
    </div>
  );
}

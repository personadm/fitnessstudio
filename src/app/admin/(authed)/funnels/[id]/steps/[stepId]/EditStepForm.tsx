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
  scheduleMode: boolean;
  action: (formData: FormData) => Promise<unknown>;
}

/**
 * Funnel-Step bearbeiten mit WYSIWYG-Editor (TipTap).
 *
 * DEFENSIVE FIXES gegen den "Mail wird beim Re-Edit kaputt"-Bug:
 *
 * 1) Die `initialBodyHtml`-Prop wird in eine useRef gepackt → der Wert bleibt
 *    bit-genau stabil für die gesamte Lebensdauer der Komponente, egal wie
 *    oft die Page re-rendered wird (z.B. durch router.refresh()). Wenn der
 *    RichTextEditor intern einen useEffect auf `initialHtml`-Änderungen
 *    hat, würde der ohne diesen Fix bei jedem Re-Render erneut feuern und
 *    den Editor-Inhalt zurücksetzen.
 *
 * 2) Stabiler `key={stepId}` auf RichTextEditor → React behält dieselbe
 *    Editor-Instanz für die gesamte Edit-Session. Re-Mounts werden vermieden.
 *
 * 3) Nach erfolgreichem Speichern wird router.refresh() NICHT mehr automatisch
 *    aufgerufen, wenn die Server-Action ohne Redirect zurückkommt. Stattdessen
 *    zeigt die UI eine kurze Erfolgsmeldung. Damit kann der User danach ohne
 *    Reset weiter editieren ODER manuell zur Funnel-Seite zurückkehren.
 */
export function EditStepForm({
  stepId,
  funnelId,
  initialSubject,
  initialBodyHtml,
  initialDelayDays,
  initialDelayHours,
  scheduleMode,
  action,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // FIX 1: initialBodyHtml in stabiler Ref einfrieren.
  // .current wird einmal beim ersten Render gesetzt und ändert sich
  // danach nie wieder — auch nicht wenn die Prop sich ändern würde.
  const stableInitialBodyHtml = useRef(initialBodyHtml).current;

  const [subject, setSubject] = useState(initialSubject);
  const [bodyHtml, setBodyHtml] = useState(initialBodyHtml);
  const [delayDays, setDelayDays] = useState(initialDelayDays);
  const [delayHours, setDelayHours] = useState(initialDelayHours);
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

      try {
        await action(formData);
        // FIX 3: KEIN router.refresh() mehr — das würde die Page re-rendern
        // und im schlimmsten Fall den Editor zurücksetzen.
        // Stattdessen: kurze Erfolgsmeldung anzeigen.
        setSavedAt(new Date());
      } catch (err) {
        // Next.js' redirect() wirft intern eine Exception — durchlassen.
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("NEXT_REDIRECT")) return;
        setError("Speichern fehlgeschlagen: " + msg);
      }
    });
  }

  return (
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
        {/*
          FIX 1 + 2: Stable initialHtml via useRef + stable key={stepId}.
          React behält dieselbe Editor-Instanz, der Editor sieht nie eine
          geänderte initialHtml-Prop.
        */}
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

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restartCampaign } from "@/app/admin/_actions";

interface Props {
  campaignId: string;
  /** Minuten seit sendingStartedAt — je höher, desto sicherer hängt der Versand. */
  stalledMinutes: number | null;
}

/**
 * Entsperrt eine Kampagne, die im Status SENDING festhängt.
 *
 * Ein Versand landet dauerhaft in SENDING, wenn der Server-Prozess mitten im
 * Lauf neu startet (Deploy/Restart): Das Cron-Sicherheitsnetz nimmt nur Sends
 * der letzten 60 Minuten wieder auf, danach bleibt der Status hängen — und das
 * UI zeigt bei SENDING weder „Senden" noch „Erneut versenden". Dieser Button
 * setzt via `restartCampaign` zurück auf DRAFT, wodurch der normale Sende-Button
 * wieder erscheint.
 *
 * Doppel-Mails sind ausgeschlossen: Jeder Empfänger bekommt sein SENT-Event VOR
 * dem Versand, bereits angeschriebene Kontakte werden beim Neustart übersprungen.
 */
export function ResetStuckCampaignButton({ campaignId, stalledMinutes }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await restartCampaign(campaignId);
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        alert("Fehler: " + msg);
      }
    });
  }

  if (confirming) {
    return (
      <div className="border border-red-600 bg-red-50 p-3 space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-red-700">
          Versand zurücksetzen?
        </p>
        <p className="text-xs leading-relaxed text-ink">
          Der Versand wird auf „Entwurf" zurückgesetzt, danach kannst du ihn
          normal starten. Empfänger, die bereits eine Mail bekommen haben,
          bekommen <strong>keine zweite</strong> — es gehen nur die noch offenen
          Empfänger raus.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="flex-1 border border-red-600 bg-red-600 px-3 py-2 font-mono text-xs uppercase tracking-[0.1em] text-cream hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? "…" : "Ja, zurücksetzen"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={isPending}
            className="border border-ink/20 px-3 py-2 font-mono text-xs uppercase tracking-[0.1em] hover:bg-ink hover:text-cream disabled:opacity-50"
          >
            Abbrechen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-ink/15 p-3 space-y-2">
      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
        Versand hängt fest?
      </p>
      <p className="text-xs leading-relaxed text-muted">
        {stalledMinutes !== null && stalledMinutes >= 5
          ? `Läuft seit ${stalledMinutes} Min. ohne Fortschritt — vermutlich durch ein Server-Update unterbrochen.`
          : "Falls der Versand nicht weiterläuft, kannst du ihn hier entsperren."}{" "}
        Zurücksetzen und neu starten (keine Doppel-Mails).
      </p>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full border border-ink/20 px-3 py-2 font-mono text-xs uppercase tracking-[0.1em] hover:bg-ink hover:text-cream"
      >
        ↺ Versand zurücksetzen
      </button>
    </div>
  );
}

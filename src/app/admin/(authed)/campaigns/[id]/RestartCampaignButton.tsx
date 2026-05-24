"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restartCampaign } from "@/app/admin/_actions";

interface Props {
  campaignId: string;
  newRecipientsCount: number;
}

/**
 * "Erneut versenden"-Button für SENT-Kampagnen.
 *
 * Setzt den Status zurück auf DRAFT, damit der normale Send-Vorgang wieder
 * startet. Empfänger die schon eine Mail bekommen haben, bekommen via
 * Unique-Constraint keine zweite — nur neue Empfänger werden angeschrieben.
 *
 * Bei `newRecipientsCount === 0` ist der Button disabled mit Hinweis.
 */
export function RestartCampaignButton({ campaignId, newRecipientsCount }: Props) {
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

  if (newRecipientsCount === 0) {
    return (
      <div className="border border-ink/15 p-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          Alle aktuellen Empfänger haben schon eine Mail bekommen.
        </p>
        <p className="mt-1 font-mono text-[10px] text-muted">
          Tipp: zuerst „Bearbeiten" klicken und eine neue Liste/Status wählen.
        </p>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="border border-acid bg-acid/20 p-3 space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em]">
          {newRecipientsCount} neue Empfänger anschreiben?
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="flex-1 bg-ink px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-acid hover:bg-ink-soft disabled:opacity-50"
          >
            {isPending ? "..." : "Ja, erneut versenden"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={isPending}
            className="flex-1 border border-ink/20 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] hover:bg-ink/5 disabled:opacity-50"
          >
            Nein
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="block w-full border border-acid_dark bg-acid px-3 py-2 text-center font-mono text-xs uppercase tracking-[0.1em] text-ink hover:bg-ink hover:text-acid"
    >
      ↻ Erneut versenden ({newRecipientsCount})
    </button>
  );
}

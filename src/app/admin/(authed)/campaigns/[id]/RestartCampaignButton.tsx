"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { restartCampaign } from "@/app/admin/_actions";

interface Props {
  campaignId: string;
  newRecipientsCount: number;
  /** Betreff dieser (alten) Kampagne — damit im Dialog sichtbar ist, WAS rausgeht. */
  subject: string;
  /** Wann die Kampagne ursprünglich angelegt wurde, schon als de-DE-Datum formatiert. */
  createdAtLabel: string;
  /** Alter der Kampagne in Tagen (auf Basis createdAt, nicht sentAt). */
  ageDays: number;
}

// Ab diesem Alter gilt eine Kampagne als „alt" → verschärfte Warnung, weil ein
// erneuter Versand eines wochenalten Newsletters an neue Mitglieder fast nie
// gewollt ist (häufigste Verwechslung mit „neuen Newsletter erstellen").
const STALE_AGE_DAYS = 7;

/**
 * "Erneut versenden"-Button für SENT-Kampagnen.
 *
 * Setzt den Status zurück auf DRAFT, damit der normale Send-Vorgang wieder
 * startet. Empfänger die schon eine Mail bekommen haben, bekommen via
 * Unique-Constraint keine zweite — nur neue Empfänger werden angeschrieben.
 *
 * WICHTIG: Hier wird der GLEICHE, alte Inhalt erneut verschickt — kein neuer
 * Newsletter. Bei status-basiertem Targeting (z.B. „alle Mitglieder") wächst
 * der Empfänger-Pool ständig, deshalb landet alter Inhalt sonst unbemerkt bei
 * neuen Mitgliedern. Der Bestätigungsdialog macht das explizit und verweist auf
 * den richtigen Weg („neuen Newsletter erstellen").
 *
 * Bei `newRecipientsCount === 0` ist der Button disabled mit Hinweis.
 */
export function RestartCampaignButton({
  campaignId,
  newRecipientsCount,
  subject,
  createdAtLabel,
  ageDays,
}: Props) {
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
    const isStale = ageDays >= STALE_AGE_DAYS;
    return (
      <div
        className={`border p-3 space-y-3 ${
          isStale ? "border-red-600 bg-red-50" : "border-acid bg-acid/20"
        }`}
      >
        <p
          className={`font-mono text-[10px] uppercase tracking-[0.1em] ${
            isStale ? "text-red-700" : ""
          }`}
        >
          ⚠ Alten Newsletter erneut versenden
        </p>

        {/* Was genau rausgeht — Betreff + Alter sichtbar machen */}
        <div className="border border-ink/20 bg-cream/60 p-2">
          <p className="text-sm leading-snug font-semibold">„{subject}"</p>
          <p className="mt-1 font-mono text-[10px] text-muted">
            Angelegt am {createdAtLabel}
            {isStale ? ` · vor ${ageDays} Tagen` : ""}
          </p>
        </div>

        <p className="text-xs leading-relaxed">
          Das verschickt <strong>denselben, alten Inhalt</strong> an{" "}
          <strong>{newRecipientsCount}</strong> neue Empfänger — das ist{" "}
          <strong>kein neuer Newsletter</strong>.
        </p>

        <Link
          href="/admin/campaigns/new"
          className="block w-full border border-ink/30 px-2 py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.1em] hover:bg-ink hover:text-cream"
        >
          + Stattdessen neuen Newsletter erstellen
        </Link>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className={`flex-1 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] disabled:opacity-50 ${
              isStale
                ? "bg-red-700 text-cream hover:bg-red-800"
                : "bg-ink text-acid hover:bg-ink-soft"
            }`}
          >
            {isPending ? "..." : "Ja, alten Inhalt erneut senden"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={isPending}
            className="flex-1 border border-ink/20 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] hover:bg-ink/5 disabled:opacity-50"
          >
            Abbrechen
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

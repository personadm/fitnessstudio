"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enqueueCampaignSend } from "@/app/admin/_actions";
import { EmailPreview } from "@/components/admin/EmailPreview";

interface Props {
  campaignId: string;
  recipientCount: number;
  /** Betreff + Inhalt — werden vor dem finalen Senden zur Kontrolle angezeigt. */
  subject: string;
  bodyHtml: string;
}

type SendState =
  | { phase: "idle" }
  | { phase: "confirming" }
  | { phase: "queuing" }
  | { phase: "queued"; total: number }
  | { phase: "error"; message: string };

/**
 * Send-Knopf für Newsletter — serverseitiger Versand.
 *
 * Klick "Versenden" → Confirm → enqueueCampaignSend stellt die Kampagne auf
 * SENDING und stößt den Hintergrund-Worker auf dem Server an. Der eigentliche
 * Versand läuft danach komplett serverseitig weiter: Das Browser-Fenster darf
 * geschlossen und der Laptop zugeklappt werden. Die Seite zeigt nach dem
 * Refresh den laufenden Server-Versand an.
 */
export function CampaignSendButton({
  campaignId,
  recipientCount,
  subject,
  bodyHtml,
}: Props) {
  const router = useRouter();
  const [state, setState] = useState<SendState>({ phase: "idle" });

  async function start() {
    setState({ phase: "queuing" });
    try {
      const result = await enqueueCampaignSend(campaignId);

      if (!result.ok) {
        setState({
          phase: "error",
          message: result.message ?? "Versand konnte nicht gestartet werden.",
        });
        return;
      }

      setState({ phase: "queued", total: result.total ?? recipientCount });
      // Server-Component neu laden → zeigt jetzt den SENDING-Fortschritt.
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("NEXT_REDIRECT")) return;
      setState({ phase: "error", message: msg });
    }
  }

  if (state.phase === "idle") {
    const empty = recipientCount === 0;
    return (
      <div className="border border-ink/15 p-4 space-y-3">
        <p className="label">Versand</p>
        <p className="text-sm">
          {empty ? "Keine Empfänger gefunden." : `${recipientCount} Empfänger`}
        </p>
        <button
          type="button"
          onClick={() => setState({ phase: "confirming" })}
          disabled={empty}
          className="w-full bg-ink px-3 py-2 font-mono text-xs uppercase tracking-[0.1em] text-acid hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          Newsletter versenden →
        </button>
      </div>
    );
  }

  if (state.phase === "confirming") {
    return (
      <div className="border-2 border-acid_dark bg-acid/10 p-4 space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-acid_dark">
          Bitte prüfen, was rausgeht
        </p>

        {/* Betreff unmissverständlich anzeigen */}
        <div className="border border-ink/20 bg-cream/60 p-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            Betreff
          </p>
          <p className="mt-0.5 text-sm font-semibold leading-snug">
            {subject || "(kein Betreff)"}
          </p>
        </div>

        {/* Pflicht-Vorschau: die echte Mail im Studio-Layout */}
        <EmailPreview subject={subject} bodyHtml={bodyHtml} />

        <p className="text-sm leading-relaxed">
          Geht an <strong>{recipientCount} Empfänger</strong>.
        </p>
        <p className="text-xs text-muted leading-relaxed">
          Der Versand läuft danach <strong>automatisch auf dem Server</strong> —
          du kannst das Fenster schließen. Schon versendete Empfänger bekommen
          keine zweite Mail.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={start}
            className="flex-1 bg-ink px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-acid hover:bg-ink-soft"
          >
            Ja, genau das senden
          </button>
          <button
            type="button"
            onClick={() => setState({ phase: "idle" })}
            className="flex-1 border border-ink/20 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-ink/5"
          >
            Abbrechen
          </button>
        </div>
      </div>
    );
  }

  if (state.phase === "queuing") {
    return (
      <div className="border border-ink/15 p-4 space-y-2">
        <p className="label">Versand wird gestartet…</p>
        <p className="text-xs text-muted">Einen Moment.</p>
      </div>
    );
  }

  if (state.phase === "queued") {
    return (
      <div className="border border-acid bg-acid/20 p-4 space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-acid_dark">
          ✓ Versand gestartet
        </p>
        <p className="text-sm">{state.total} Mails gehen jetzt serverseitig raus.</p>
        <p className="text-xs text-muted leading-relaxed">
          Du kannst den Laptop zuklappen. Lade die Seite neu, um den Fortschritt
          zu sehen.
        </p>
      </div>
    );
  }

  // error
  return (
    <div className="border border-red-300 bg-red-50 p-4 space-y-3">
      <p className="font-mono text-xs uppercase tracking-[0.1em] text-red-700">
        Fehler beim Start
      </p>
      <p className="text-xs text-red-700 leading-relaxed">{state.message}</p>
      <button
        type="button"
        onClick={() => setState({ phase: "idle" })}
        className="border border-red-300 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-red-700 hover:bg-red-100"
      >
        Erneut versuchen
      </button>
    </div>
  );
}

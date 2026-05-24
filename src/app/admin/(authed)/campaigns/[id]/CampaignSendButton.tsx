"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { processCampaignBatch } from "@/app/admin/_actions";

interface Props {
  campaignId: string;
  recipientCount: number;
}

type SendState =
  | { phase: "idle" }
  | { phase: "confirming" }
  | { phase: "sending"; sent: number; total: number }
  | { phase: "done"; sent: number }
  | { phase: "error"; message: string };

/**
 * Send-Knopf für Newsletter mit gedrosseltem Batched-Versand.
 *
 * Workflow:
 *  1. Klick "Versenden" → Confirm-Dialog
 *  2. Klick "Ja" → Loop ruft processCampaignBatch wiederholt auf
 *  3. Pro Batch: max 30 Mails, gedrosselt auf ~4/Sek
 *  4. Live-Progress: "247 / 1777 versendet"
 *  5. Wenn done: Status auf SENT, Erfolgs-Bestätigung
 *
 * Tab muss offen bleiben während Versand läuft. Schließt der Browser-Tab,
 * stoppt der Versand — kann aber gefahrlos wieder gestartet werden, weil
 * die idempotente Logik schon-gesendete Empfänger erkennt und skippt.
 */
export function CampaignSendButton({ campaignId, recipientCount }: Props) {
  const router = useRouter();
  const [state, setState] = useState<SendState>({ phase: "idle" });

  async function runBatch() {
    setState({ phase: "sending", sent: 0, total: recipientCount });

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const result = await processCampaignBatch(campaignId);

        if (!result.ok) {
          setState({
            phase: "error",
            message: result.message ?? "Versand fehlgeschlagen.",
          });
          return;
        }

        const total = result.total ?? recipientCount;
        const sentTotal = result.sentTotal ?? 0;

        setState({ phase: "sending", sent: sentTotal, total });

        if (result.done) {
          setState({ phase: "done", sent: sentTotal });
          router.refresh();
          return;
        }

        // Kurze Pause zwischen Batches damit der DB-Pool atmen kann
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Next.js redirect-Exception durchlassen (sollte hier nicht passieren)
        if (msg.includes("NEXT_REDIRECT")) return;
        setState({ phase: "error", message: msg });
        return;
      }
    }
  }

  // RENDER-Logik je nach Phase
  if (state.phase === "idle") {
    const empty = recipientCount === 0;
    return (
      <div className="border border-ink/15 p-4 space-y-3">
        <p className="label">Versand</p>
        <p className="text-sm">
          {empty
            ? "Keine Empfänger gefunden."
            : `${recipientCount} ${recipientCount === 1 ? "Empfänger" : "Empfänger"}`}
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
    const estimatedMinutes = Math.ceil(recipientCount / 240); // ~4/Sek = 240/Min
    return (
      <div className="border border-acid bg-acid/20 p-4 space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em]">
          Versand bestätigen
        </p>
        <p className="text-sm leading-relaxed">
          {recipientCount} {recipientCount === 1 ? "Empfänger" : "Empfänger"} ·
          ca. {estimatedMinutes} {estimatedMinutes === 1 ? "Minute" : "Minuten"}
        </p>
        <p className="text-xs text-muted leading-relaxed">
          Tab bitte offen lassen während der Versand läuft. Bei Browser-Crash
          oder Tab-Wechsel kann der Versand neu gestartet werden — schon
          versendete Mails werden nicht doppelt verschickt.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={runBatch}
            className="flex-1 bg-ink px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-acid hover:bg-ink-soft"
          >
            Ja, jetzt starten
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

  if (state.phase === "sending") {
    const pct = state.total > 0 ? Math.round((state.sent / state.total) * 100) : 0;
    return (
      <div className="border border-ink/15 p-4 space-y-3">
        <p className="label">Versand läuft…</p>
        <p className="font-mono text-2xl">
          {state.sent} <span className="text-muted">/ {state.total}</span>
        </p>
        <div className="h-2 bg-ink/10">
          <div
            className="h-2 bg-acid transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-muted leading-relaxed">
          {pct}% — Tab bitte offen lassen. Bei Tab-Wechsel pausiert der Browser
          den Versand. Du kannst danach einfach erneut auf „Versenden" klicken,
          dann macht der Versand bei {state.sent + 1} weiter.
        </p>
      </div>
    );
  }

  if (state.phase === "done") {
    return (
      <div className="border border-acid bg-acid/20 p-4 space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-acid_dark">
          ✓ Versendet
        </p>
        <p className="text-sm">{state.sent} Mails verschickt</p>
        <p className="text-xs text-muted">Status: SENT</p>
      </div>
    );
  }

  // error
  return (
    <div className="border border-red-300 bg-red-50 p-4 space-y-3">
      <p className="font-mono text-xs uppercase tracking-[0.1em] text-red-700">
        Fehler beim Versand
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

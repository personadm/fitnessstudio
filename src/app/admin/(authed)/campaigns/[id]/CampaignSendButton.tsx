"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CampaignSendButton({ campaignId, recipientCount }: { campaignId: string; recipientCount: number }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function send() {
    if (recipientCount === 0) {
      alert("Keine versandfähigen Empfänger in dieser Liste.");
      return;
    }
    if (!confirm(`Kampagne wirklich an ${recipientCount} Empfänger versenden? Das kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    setState("sending");
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/send`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setState("done");
        setMessage(`${data.sent} versendet, ${data.failed} fehlgeschlagen.`);
        router.refresh();
      } else {
        setState("error");
        setMessage(data.message ?? "Versand fehlgeschlagen.");
      }
    } catch {
      setState("error");
      setMessage("Verbindung fehlgeschlagen.");
    }
  }

  return (
    <div className="border border-ink/15 p-4">
      <p className="label mb-3">Versenden</p>
      <p className="mb-4 text-sm">
        <strong>{recipientCount}</strong> versandfähige Empfänger
      </p>

      <button
        onClick={send}
        disabled={state === "sending" || state === "done" || recipientCount === 0}
        className="w-full bg-ink py-3 font-mono text-xs uppercase tracking-[0.12em] text-acid disabled:opacity-50 hover:bg-ink-soft"
      >
        {state === "sending" ? "Sendet…" : state === "done" ? "✓ Versendet" : "Jetzt versenden →"}
      </button>

      {message && <p className={`mt-3 text-xs ${state === "error" ? "text-red-700" : "text-muted"}`}>{message}</p>}

      <p className="mt-4 text-xs text-muted">
        Wir senden mit ~5 Mails/Sekunde. Free-Tier-Limit von Resend ist 100/Tag – bitte beachten bei größeren Listen.
      </p>
    </div>
  );
}

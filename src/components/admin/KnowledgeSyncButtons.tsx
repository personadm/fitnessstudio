"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SyncResult {
  skipped: boolean;
  reason?: string;
  discovered: number;
  transcribed: number;
  classified: number;
  relevant: number;
  distilled: number;
  rebuilt: boolean;
}

/**
 * Manuelle Trigger für den Wissensbasis-Sync. Pro Lauf werden nur kleine Batches
 * verarbeitet — mehrfach klicken, um den Rückstand aufzuholen.
 */
export function KnowledgeSyncButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState<null | "sync" | "backfill">(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SyncResult | null>(null);

  async function run(backfill: boolean) {
    setLoading(backfill ? "backfill" : "sync");
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/knowledge/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ backfill }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult(data.result as SyncResult);
        router.refresh();
      } else {
        setError(data.message ?? "Sync fehlgeschlagen.");
      }
    } catch {
      setError("Verbindung zum Sync-Service fehlgeschlagen.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => run(false)}
          disabled={loading !== null}
          className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-acid hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "sync" ? "Synchronisiere…" : "Jetzt synchronisieren"}
        </button>
        <button
          type="button"
          onClick={() => run(true)}
          disabled={loading !== null}
          className="border border-ink/20 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:bg-ink hover:text-cream disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "backfill" ? "Lade Alt-Videos…" : "Alt-Videos nachladen (Backfill)"}
        </button>
      </div>

      {error && (
        <p role="alert" className="border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {result && (
        <div className="border border-ink/15 bg-cream p-3 font-mono text-[11px] text-ink">
          {result.skipped ? (
            <span>Übersprungen ({result.reason ?? "kein Grund"}).</span>
          ) : (
            <span>
              {result.discovered} neu entdeckt · {result.transcribed} transkribiert ·{" "}
              {result.classified} klassifiziert ({result.relevant} relevant) · {result.distilled}{" "}
              destilliert
              {result.rebuilt ? " · Wissensbasis aktualisiert" : ""}
            </span>
          )}
        </div>
      )}

      <p className="font-mono text-[11px] text-muted leading-relaxed">
        Pro Lauf wird nur ein kleiner Batch verarbeitet (schont API-Limits). Für den ersten Aufbau
        mehrfach klicken. Danach läuft der Sync automatisch 1×/Tag beim Öffnen des Admin-Bereichs.
      </p>
    </div>
  );
}

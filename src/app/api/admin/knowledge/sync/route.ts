import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runKnowledgeSync } from "@/lib/knowledge/sync";

export const runtime = "nodejs";
// Ein Sync-Lauf macht Netzwerk- + KI-Calls (Transkript, Klassifizierung,
// Destillierung). Großzügiges Timeout, läuft aber in beschränkten Batches.
export const maxDuration = 120;

/**
 * POST /api/admin/knowledge/sync
 *
 * Manueller Trigger aus der Admin-UI. Umgeht das 24h-Gate (force).
 * Body (optional): { backfill?: boolean }
 *   - backfill=true: lädt zusätzlich Alt-Videos aus dem Kanal-Katalog nach.
 *
 * Da pro Lauf nur kleine Batches verarbeitet werden, mehrfach klicken, um
 * den Rückstand aufzuholen (oder den täglichen Auto-Sync laufen lassen).
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Nicht angemeldet." }, { status: 401 });
  }

  let backfill = false;
  try {
    const body = (await req.json()) as { backfill?: boolean };
    backfill = body?.backfill === true;
  } catch {
    // Kein/ungültiger Body — Standardlauf ohne Backfill.
  }

  try {
    const result = await runKnowledgeSync({ force: true, backfill });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[knowledge-sync] Fehler:", err);
    const message = err instanceof Error ? err.message : "Unerwarteter Fehler.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { kickFunnelProcessing } from "@/lib/funnels";

// Prisma + Date.now brauchen die Node-Runtime; nie statisch cachen.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/funnels
 *
 * Server-seitiger Trigger für den Funnel-Versand. Wird von einem externen
 * Scheduler (Render Cron Job) regelmäßig aufgerufen, damit fällige Mails
 * auch dann rausgehen, wenn niemand das Admin-Panel offen hat.
 *
 * Auth: Header `Authorization: Bearer <CRON_SECRET>`.
 * Ohne gesetztes CRON_SECRET ist der Endpoint deaktiviert (403).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/funnels] CRON_SECRET ist nicht gesetzt — Endpoint deaktiviert");
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 403 });
  }

  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!isSecretValid(provided, secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    // Sofort antworten: der Versand läuft danach detached auf dem Server weiter.
    // So sieht cron-job.org nie einen 30s-Timeout (→ keine Auto-Deaktivierung),
    // egal wie viele Mails fällig sind. triggered:false = es lief schon ein Lauf.
    const result = kickFunnelProcessing();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/funnels] kick failed", err);
    return NextResponse.json({ ok: false, error: "processing_failed" }, { status: 500 });
  }
}

/**
 * Längen-sicherer, timing-sicherer Vergleich. timingSafeEqual wirft bei
 * unterschiedlicher Länge, deshalb fangen wir das vorab ab.
 */
function isSecretValid(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

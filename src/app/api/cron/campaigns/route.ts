import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { resumeStalledCampaigns } from "@/lib/campaigns";

// Prisma + Date.now brauchen die Node-Runtime; nie statisch cachen.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/campaigns
 *
 * Sicherheitsnetz für den Newsletter-/Kampagnen-Versand. Stößt den
 * serverseitigen Worker an, der alle Kampagnen im Status SENDING fertig
 * versendet. Normalerweise startet der Worker schon beim Klick auf "Versenden"
 * (enqueueCampaignSend); dieser Endpoint setzt einen unterbrochenen Versand
 * (z.B. nach einem Deploy/Neustart) idempotent fort.
 *
 * Von einem externen Scheduler (cron-job.org) regelmäßig aufgerufen, damit
 * fällige Mails auch ohne offenes Admin-Panel rausgehen.
 *
 * Auth: Header `Authorization: Bearer <CRON_SECRET>`.
 * Ohne gesetztes CRON_SECRET ist der Endpoint deaktiviert (403).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/campaigns] CRON_SECRET ist nicht gesetzt — Endpoint deaktiviert");
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 403 });
  }

  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!isSecretValid(provided, secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    // Setzt NUR kürzlich gestartete, unterbrochene Versände fort (z.B. nach
    // einem Deploy). Reaktiviert niemals alt-hängende Kampagnen. Kehrt sofort
    // zurück — die Versände laufen danach detached weiter.
    const result = await resumeStalledCampaigns();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/campaigns] resume failed", err);
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

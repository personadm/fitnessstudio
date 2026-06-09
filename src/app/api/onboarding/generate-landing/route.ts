import { NextRequest, NextResponse } from "next/server";
import { isCodeRedeemable } from "@/app/onboarding/_actions";
import { fetchWebsiteText, generateLandingContent } from "@/lib/landingAi";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/onboarding/generate-landing
 * Body: { code: string, url: string, studioName?: string }
 *
 * Lädt die angegebene Website und erzeugt daraus Landingpage-Texte (Claude).
 * Geschützt durch: gültigen (noch einlösbaren) Aktivierungs-Code + Rate-Limit,
 * damit keine fremden KI-Kosten ausgelöst werden.
 */
export async function POST(req: NextRequest) {
  // Max. 8 Generierungen pro IP in 10 Minuten.
  const rl = checkRateLimit(`gen-landing:${clientIp(req)}`, 8, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: "Zu viele Anfragen. Bitte kurz warten." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: { code?: unknown; url?: unknown; studioName?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body ungültig." }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const studioName = typeof body.studioName === "string" ? body.studioName.trim() : "";

  if (!(await isCodeRedeemable(code))) {
    return NextResponse.json(
      { ok: false, message: "Ungültiger oder bereits eingelöster Code." },
      { status: 403 },
    );
  }
  if (!url) {
    return NextResponse.json({ ok: false, message: "Bitte eine Website-URL angeben." }, { status: 400 });
  }

  try {
    const websiteText = await fetchWebsiteText(url);
    const content = await generateLandingContent({
      websiteText,
      studioName: studioName || "dein Studio",
    });
    return NextResponse.json({ ok: true, content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generierung fehlgeschlagen.";
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}

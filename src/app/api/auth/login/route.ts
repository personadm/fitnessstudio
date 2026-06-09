import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { createSession } from "@/lib/auth";
import { resolveStudioIdFromHost } from "@/lib/tenant";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Brute-Force-Schutz: max. 10 Versuche pro IP in 15 Minuten.
    const rl = checkRateLimit(`login:${clientIp(req)}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, message: "Zu viele Versuche. Bitte später erneut versuchen." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const json = await req.json();
    const result = loginSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ ok: false, message: "Ungültige Eingabe." }, { status: 400 });
    }

    const { email, password } = result.data;

    // Multi-Tenant: Studio bestimmen. Bevorzugt expliziter Slug (z. B. aus
    // /admin/login?studio=…), sonst aus der Subdomain (Fallback: Default-Studio).
    const studioSlug = typeof json.studio === "string" ? json.studio.trim().toLowerCase() : "";
    let studioId: string | null = null;
    if (studioSlug) {
      const s = await db.studio.findUnique({ where: { slug: studioSlug }, select: { id: true } });
      studioId = s?.id ?? null;
    }
    if (!studioId) {
      studioId = await resolveStudioIdFromHost(req.headers.get("host"));
    }

    // Der AdminUser wird pro Studio gesucht (E-Mail nur pro Studio eindeutig).
    const user = await db.adminUser.findUnique({
      where: { studioId_email: { studioId, email } },
    });

    // Bewusst gleiche Antwort bei nicht gefundenem User & falschem Passwort
    // (verhindert User-Enumeration)
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ ok: false, message: "E-Mail oder Passwort falsch." }, { status: 401 });
    }

    await createSession(user.id, user.studioId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/auth/login]", err);
    return NextResponse.json({ ok: false, message: "Login fehlgeschlagen." }, { status: 500 });
  }
}

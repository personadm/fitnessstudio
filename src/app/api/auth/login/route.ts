import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { createSession } from "@/lib/auth";
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
    const user = await db.adminUser.findUnique({ where: { email } });

    // Bewusst gleiche Antwort bei nicht gefundenem User & falschem Passwort
    // (verhindert User-Enumeration)
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ ok: false, message: "E-Mail oder Passwort falsch." }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/auth/login]", err);
    return NextResponse.json({ ok: false, message: "Login fehlgeschlagen." }, { status: 500 });
  }
}

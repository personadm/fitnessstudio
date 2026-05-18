import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";

/**
 * POST /api/track
 * Trackt einen Page-View. Setzt eine sessionId per Cookie, damit
 * wir Unique Visitors auseinanderhalten können.
 *
 * Body: { path: string, referrer?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const path = typeof body.path === "string" ? body.path.slice(0, 200) : "/";
    const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 500) : null;
    const userAgent = req.headers.get("user-agent")?.slice(0, 400) ?? null;

    // SessionId aus Cookie holen oder neu erstellen
    const cookieStore = await cookies();
    let sessionId = cookieStore.get("track_sid")?.value ?? null;
    let newSession = false;
    if (!sessionId) {
      sessionId = randomBytes(12).toString("hex");
      newSession = true;
    }

    await db.pageView.create({
      data: {
        path,
        sessionId,
        referrer,
        userAgent,
      },
    });

    const res = NextResponse.json({ ok: true });
    if (newSession) {
      // 30 Tage gültig — nach 30 Tagen wird derselbe Besucher als neue Session gezählt
      res.cookies.set("track_sid", sessionId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return res;
  } catch (err) {
    console.error("[track] failed", err);
    // Stillschweigend versagen — Tracking darf den User-Flow nie blockieren
    return NextResponse.json({ ok: false });
  }
}

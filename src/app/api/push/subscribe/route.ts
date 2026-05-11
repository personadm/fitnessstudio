import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST: subscribe (oder existing upserten)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const body = await req.json();
    const endpoint: string = body.endpoint;
    const p256dh: string = body.keys?.p256dh;
    const auth: string = body.keys?.auth;
    const userAgent: string | undefined = body.userAgent;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
    }

    await db.pushSubscription.upsert({
      where: { endpoint },
      create: { endpoint, p256dh, auth, userAgent: userAgent || null },
      update: { p256dh, auth, userAgent: userAgent || null },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/push/subscribe]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// DELETE: unsubscribe
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const body = await req.json();
    const endpoint: string = body.endpoint;
    if (!endpoint) {
      return NextResponse.json({ ok: false, error: "missing endpoint" }, { status: 400 });
    }
    await db.pushSubscription.deleteMany({ where: { endpoint } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/push/subscribe DELETE]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendFunnelMail } from "@/lib/mail";

export const runtime = "nodejs";

/**
 * POST /api/admin/funnel-steps/test
 * Body: { stepId: string, email: string }
 *
 * Verschickt eine Testmail des angegebenen Funnel-Schritts an die übergebene
 * Adresse. Keine Datenbank-Aktion (Contact, Enrollment etc.) — nur Versand.
 *
 * Personalisierungs-Platzhalter werden mit Dummy-Werten ersetzt, oben in der
 * Mail erscheint ein Test-Banner damit man's nicht mit einer echten Mail
 * verwechselt.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Nicht angemeldet." }, { status: 401 });
  }

  let body: { stepId?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body ungültig." }, { status: 400 });
  }

  const stepId = typeof body.stepId === "string" ? body.stepId.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!stepId) {
    return NextResponse.json({ ok: false, message: "stepId fehlt." }, { status: 400 });
  }
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, message: "Bitte eine gültige E-Mail-Adresse angeben." },
      { status: 400 },
    );
  }

  const step = await db.funnelStep.findFirst({
    where: { id: stepId },
    select: {
      id: true,
      subject: true,
      bodyHtml: true,
      orderNum: true,
      funnel: { select: { name: true } },
    },
  });

  if (!step) {
    return NextResponse.json({ ok: false, message: "Schritt nicht gefunden." }, { status: 404 });
  }

  // Personalisierungs-Platzhalter mit Dummy-Werten füllen
  const personalizedBody = step.bodyHtml
    .replace(/\{\{firstName\}\}/g, "Test")
    .replace(/\{\{lastName\}\}/g, "Tester")
    .replace(/\{\{name\}\}/g, "Test Tester")
    .replace(/\{\{email\}\}/g, email);

  // Test-Banner oben einsetzen
  const testBanner = `<div style="background:#FFF3CD;border:1px solid #D8B14F;padding:14px 16px;margin:0 0 24px 0;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:#5C4A1A;">
    <strong>⚡ TESTMAIL</strong> — Funnel „${escapeHtml(step.funnel.name)}", Schritt ${step.orderNum}.
    Diese Mail wurde manuell aus dem Admin-Bereich verschickt, nicht durch den Funnel ausgelöst.
    Platzhalter wie <code>{{firstName}}</code> sind durch „Test"/„Tester" ersetzt.
  </div>`;

  try {
    await sendFunnelMail({
      to: email,
      subject: `[TEST] ${step.subject}`,
      bodyHtml: testBanner + personalizedBody,
    });
  } catch (err) {
    console.error("[funnel-test-mail] sendFunnelMail failed", err);
    return NextResponse.json(
      { ok: false, message: "Versand fehlgeschlagen. Schau in die Render-Logs für Details." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, message: `Testmail an ${email} geschickt.` });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

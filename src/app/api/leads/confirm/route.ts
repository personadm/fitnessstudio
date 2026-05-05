import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateToken } from "@/lib/tokens";
import { sendPricingMail } from "@/lib/mail";

export const runtime = "nodejs";

/**
 * GET /api/leads/confirm?token=xxx
 * Wird vom Button in der DOI-Mail aufgerufen.
 * Bestätigt die E-Mail, vergibt einen ref-Token und schickt
 * unmittelbar die Preis-Mail mit "Hier anmelden"-Button.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ ok: false, message: "Token fehlt." }, { status: 400 });
  }

  const contact = await db.contact.findUnique({ where: { doiToken: token } });

  if (!contact) {
    return NextResponse.json({ ok: false, message: "Ungültiger oder abgelaufener Link." }, { status: 404 });
  }

  // Schon bestätigt? Idempotent zurückmelden.
  if (contact.doiConfirmedAt) {
    return NextResponse.json({
      ok: true,
      alreadyConfirmed: true,
      message: "Du hast deine Adresse bereits bestätigt.",
    });
  }

  const refToken = contact.refToken ?? generateToken();

  await db.contact.update({
    where: { id: contact.id },
    data: {
      doiConfirmedAt: new Date(),
      refToken,
      // DOI-Token ist nach Bestätigung verbraucht
      doiToken: null,
    },
  });

  await db.contactEvent.create({
    data: { contactId: contact.id, type: "DOI_CONFIRMED" },
  });

  // Preis-Mail verschicken
  try {
    await sendPricingMail({ to: contact.email, refToken });
    await db.contactEvent.create({
      data: { contactId: contact.id, type: "PRICING_MAIL_SENT" },
    });
  } catch (err) {
    console.error("[/api/leads/confirm] sendPricingMail failed", err);
    // Wir loggen, geben dem User aber trotzdem ein OK zurück –
    // die DOI-Bestätigung selbst war ja erfolgreich.
  }

  return NextResponse.json({ ok: true, message: "Bestätigung erfolgreich." });
}

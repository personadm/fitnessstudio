import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadSchema } from "@/lib/validation";
import { generateToken } from "@/lib/tokens";
import { sendDoiMail } from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const result = leadSchema.safeParse(json);

    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "Ungültige Eingabe.";
      return NextResponse.json({ ok: false, message }, { status: 400 });
    }

    const { email } = result.data;

    // IP fürs Consent-Logging (DSGVO-Beleg)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";

    const consentText =
      "Ich willige ein, dass meine E-Mail-Adresse zur Zusendung von Informationen und Tarifen des Fitnessstudios verarbeitet wird. Die Einwilligung kann jederzeit widerrufen werden.";

    const doiToken = generateToken();

    // Existierender Kontakt? Dann nur DOI-Token erneuern.
    // Neuer Kontakt? Anlegen.
    const contact = await db.contact.upsert({
      where: { email },
      update: {
        doiToken,
        doiSentAt: new Date(),
        // bereits bestätigte Kontakte nicht zurücksetzen
        consentText,
        consentIp: ip,
      },
      create: {
        email,
        status: "INTERESSENT",
        source: "LANDING",
        doiToken,
        doiSentAt: new Date(),
        consentText,
        consentIp: ip,
      },
    });

    // Wenn schon bestätigt: keine neue DOI-Mail, freundlicher Hinweis
    if (contact.doiConfirmedAt) {
      return NextResponse.json({
        ok: true,
        alreadyConfirmed: true,
        message: "Du bist schon eingetragen – schau in dein Postfach.",
      });
    }

    await sendDoiMail({ to: email, doiToken });

    await db.contactEvent.create({
      data: {
        contactId: contact.id,
        type: "DOI_REQUESTED",
        meta: { ip },
      },
    });

    return NextResponse.json({ ok: true, message: "Bitte bestätige deine E-Mail-Adresse." });
  } catch (err) {
    console.error("[/api/leads]", err);
    return NextResponse.json({ ok: false, message: "Etwas ist schiefgelaufen." }, { status: 500 });
  }
}

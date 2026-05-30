import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadSchema } from "@/lib/validation";
import { generateToken } from "@/lib/tokens";
import { sendDoiMail } from "@/lib/mail";
import { enrollIntoMatchingFunnels } from "@/lib/funnels";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const result = leadSchema.safeParse(json);

    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "Ungültige Eingabe.";
      return NextResponse.json({ ok: false, message }, { status: 400 });
    }

    const { email, firstName, lastName, gender, locationId } = result.data;

    // IP fürs Consent-Logging (DSGVO-Beleg)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const consentText =
      "Ich willige ein, dass meine Daten (Vorname, E-Mail, Standort) zur Zusendung " +
      "meines Gratis-Start-Angebots verarbeitet werden. Die Einwilligung kann " +
      "jederzeit widerrufen werden.";

    const doiToken = generateToken();

    // Standort validieren — nur falls übergeben
    let resolvedLocationId: string | null = null;
    if (locationId) {
      const loc = await db.location.findUnique({
        where: { id: locationId },
        select: { id: true, active: true },
      });
      if (loc && loc.active) {
        resolvedLocationId = loc.id;
      }
    }

    // Existierender Kontakt? Daten updaten, neuen DOI-Token vergeben.
    // lastName/gender bleiben optional — wenn leer/null, vorherigen Wert nicht
    // überschreiben (damit ein nachgelagertes Profil nicht verschwindet).
    const existing = await db.contact.findUnique({ where: { email } });

    const updateData: Record<string, unknown> = {
      firstName,
      doiToken,
      doiSentAt: new Date(),
      consentText,
      consentIp: ip,
    };
    if (lastName) updateData.lastName = lastName;
    if (gender) updateData.gender = gender;
    if (resolvedLocationId) updateData.locationId = resolvedLocationId;

    const contact = existing
      ? await db.contact.update({ where: { email }, data: updateData })
      : await db.contact.create({
          data: {
            email,
            firstName,
            lastName: lastName || "",
            gender: gender ?? null,
            locationId: resolvedLocationId,
            status: "INTERESSENT",
            source: "LANDING",
            doiToken,
            doiSentAt: new Date(),
            consentText,
            consentIp: ip,
          },
        });

    // Schon bestätigt? Keine neue DOI-Mail, freundlich antworten.
    if (contact.doiConfirmedAt) {
      return NextResponse.json({
        ok: true,
        alreadyConfirmed: true,
        message: "Du bist schon eingetragen – schau in dein Postfach.",
      });
    }

    await sendDoiMail({ to: email, firstName, doiToken });

    await db.contactEvent.create({
      data: {
        contactId: contact.id,
        type: "DOI_REQUESTED",
        meta: { ip },
      },
    });

    await enrollIntoMatchingFunnels(contact.id, contact.status);

    return NextResponse.json({
      ok: true,
      message:
        "Bitte bestätige deine E-Mail-Adresse. Direkt danach schalten wir dein Angebot frei.",
    });
  } catch (err) {
    console.error("[/api/leads]", err);
    return NextResponse.json(
      { ok: false, message: "Etwas ist schiefgelaufen." },
      { status: 500 },
    );
  }
}

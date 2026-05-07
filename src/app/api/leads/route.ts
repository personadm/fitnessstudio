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

    // Standort-Logik:
    // - Wenn locationId mitgeschickt: muss existieren und aktiv sein
    // - Wenn nicht mitgeschickt: Auto-Set wenn genau 1 aktiver Standort,
    //   Fehler wenn 2+ aktive Standorte existieren
    const activeLocations = await db.location.findMany({
      where: { active: true },
      select: { id: true },
    });

    let resolvedLocationId: string | null = null;

    if (locationId) {
      const valid = activeLocations.find((l) => l.id === locationId);
      if (!valid) {
        return NextResponse.json(
          { ok: false, message: "Standort nicht verfügbar." },
          { status: 400 },
        );
      }
      resolvedLocationId = locationId;
    } else if (activeLocations.length === 1) {
      resolvedLocationId = activeLocations[0].id;
    } else if (activeLocations.length > 1) {
      return NextResponse.json(
        { ok: false, message: "Bitte wähle einen Standort aus." },
        { status: 400 },
      );
    }
    // activeLocations.length === 0: kein Standort-System aktiv, läuft ohne

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const consentText =
      "Ich willige ein, dass meine Daten (Vorname, Nachname, Geschlecht, E-Mail) zur Zusendung von Informationen und Tarifen des Fitnessstudios verarbeitet werden. Die Einwilligung kann jederzeit widerrufen werden.";

    const doiToken = generateToken();

    const contact = await db.contact.upsert({
      where: { email },
      update: {
        firstName,
        lastName,
        gender,
        locationId: resolvedLocationId,
        doiToken,
        doiSentAt: new Date(),
        consentText,
        consentIp: ip,
      },
      create: {
        email,
        firstName,
        lastName,
        gender,
        locationId: resolvedLocationId,
        status: "INTERESSENT",
        source: "LANDING",
        doiToken,
        doiSentAt: new Date(),
        consentText,
        consentIp: ip,
      },
    });

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
        meta: { ip, locationId: resolvedLocationId },
      },
    });

    await enrollIntoMatchingFunnels(contact.id, contact.status);

    return NextResponse.json({
      ok: true,
      message: "Bitte bestätige deine E-Mail-Adresse. Danach schicken wir dir die Tarife.",
    });
  } catch (err) {
    console.error("[/api/leads]", err);
    return NextResponse.json(
      { ok: false, message: "Etwas ist schiefgelaufen." },
      { status: 500 },
    );
  }
}

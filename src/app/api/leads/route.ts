import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadSchema } from "@/lib/validation";
import { generateToken } from "@/lib/tokens";
import { sendDoiMail } from "@/lib/mail";
import { enrollIntoMatchingFunnels } from "@/lib/funnels";
import { resolveStudioIdFromHost } from "@/lib/tenant";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Spam-/Abuse-Schutz: max. 5 Einträge pro IP in 10 Minuten.
    const rl = checkRateLimit(`leads:${clientIp(req)}`, 5, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, message: "Zu viele Anfragen. Bitte versuche es in ein paar Minuten erneut." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const json = await req.json();
    const result = leadSchema.safeParse(json);

    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "Ungültige Eingabe.";
      return NextResponse.json({ ok: false, message }, { status: 400 });
    }

    const { email, firstName, lastName, gender, locationId } = result.data;

    // Multi-Tenant: Studio aus der Subdomain (Fallback: Default-Studio).
    const studioId = await resolveStudioIdFromHost(req.headers.get("host"));

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
        select: { id: true, active: true, studioId: true },
      });
      // Standort muss aktiv sein UND zum selben Studio gehören.
      if (loc && loc.active && loc.studioId === studioId) {
        resolvedLocationId = loc.id;
      }
    }

    // Atomares upsert statt findUnique→create/update: verhindert eine Race
    // Condition bei gleichzeitigen Submits (Doppelklick/Retry), die sonst am
    // Unique-Constraint auf `email` mit einem 500er scheitern würde.
    // lastName/gender bleiben optional — wenn leer/null, vorherigen Wert nicht
    // überschreiben (damit ein nachgelagertes Profil nicht verschwindet).
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

    const contact = await db.contact.upsert({
      where: { studioId_email: { studioId, email } },
      update: updateData,
      create: {
        studioId,
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

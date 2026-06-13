import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadSchema } from "@/lib/validation";
import { generateToken } from "@/lib/tokens";
import { sendPricingMail } from "@/lib/mail";
import { enrollIntoMatchingFunnels } from "@/lib/funnels";
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

    // IP fürs Consent-Logging (DSGVO-Beleg)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    // Soft formulierte E-Mail-Einwilligung von der Landingpage (Single-Opt-In,
    // gespeichert als DSGVO-Beleg zusammen mit IP + Zeitstempel).
    const consentText = "Ja, schickt mir mein Gratis-Start-Angebot per E-Mail.";

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

    // Single-Opt-In: keine Bestätigungsmail mehr. Wir vergeben sofort den
    // ref-Token für die Anmelde-Seite und markieren den Kontakt als bestätigt.
    // Vorab lesen, ob der Kontakt bereits onboardet war → verhindert, dass ein
    // erneutes Eintragen die Angebots-Mail ein zweites Mal auslöst.
    const existing = await db.contact.findUnique({
      where: { email },
      select: { doiConfirmedAt: true, refToken: true },
    });
    const alreadyOnboarded = Boolean(existing?.doiConfirmedAt);
    const refToken = existing?.refToken ?? generateToken();

    // Atomares upsert statt findUnique→create/update: verhindert eine Race
    // Condition bei gleichzeitigen Submits (Doppelklick/Retry), die sonst am
    // Unique-Constraint auf `email` mit einem 500er scheitern würde.
    // lastName/gender bleiben optional — wenn leer/null, vorherigen Wert nicht
    // überschreiben (damit ein nachgelagertes Profil nicht verschwindet).
    // doiConfirmedAt wird hier NICHT gesetzt — das passiert weiter unten mit
    // einem eigenen Zeitstempel NACH dem Anlegen, damit "Angebot verschickt"
    // im Activity-Feed korrekt über der Eintragung (createdAt) einsortiert wird.
    const updateData: Record<string, unknown> = {
      firstName,
      refToken,
      consentText,
      consentIp: ip,
    };
    if (lastName) updateData.lastName = lastName;
    if (gender) updateData.gender = gender;
    if (resolvedLocationId) updateData.locationId = resolvedLocationId;

    const contact = await db.contact.upsert({
      where: { email },
      update: updateData,
      create: {
        email,
        firstName,
        lastName: lastName || "",
        gender: gender ?? null,
        locationId: resolvedLocationId,
        status: "INTERESSENT",
        source: "LANDING",
        refToken,
        consentText,
        consentIp: ip,
      },
    });

    // Schon eingetragen & Angebot schon raus? Nicht erneut senden, freundlich antworten.
    if (alreadyOnboarded) {
      return NextResponse.json({
        ok: true,
        alreadyConfirmed: true,
        message: "Du bist schon eingetragen – schau in dein Postfach.",
      });
    }

    // Single-Opt-In bestätigen — Zeitstempel bewusst jetzt (nach createdAt).
    await db.contact.update({
      where: { id: contact.id },
      data: { doiConfirmedAt: new Date() },
    });

    await db.contactEvent.create({
      data: {
        contactId: contact.id,
        type: "DOI_CONFIRMED",
        meta: { ip, mode: "single-opt-in" },
      },
    });

    // Angebots-Mail direkt verschicken (kein Bestätigungs-Klick mehr nötig).
    // Mail-Fehler nicht an den User durchreichen — der Lead ist gespeichert.
    try {
      await sendPricingMail({ to: email, firstName, refToken });
      await db.contactEvent.create({
        data: { contactId: contact.id, type: "PRICING_MAIL_SENT" },
      });
    } catch (err) {
      console.error("[/api/leads] sendPricingMail failed", err);
    }

    await enrollIntoMatchingFunnels(contact.id, contact.status);

    return NextResponse.json({
      ok: true,
      message:
        "Geschafft! Dein Gratis-Start-Angebot ist unterwegs – schau in dein Postfach.",
    });
  } catch (err) {
    console.error("[/api/leads]", err);
    return NextResponse.json(
      { ok: false, message: "Etwas ist schiefgelaufen." },
      { status: 500 },
    );
  }
}

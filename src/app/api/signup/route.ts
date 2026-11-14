import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signupSchema } from "@/lib/validation";
import { sendSignupConfirmation } from "@/lib/mail";
import { enrollIntoMatchingFunnels } from "@/lib/funnels";
import { notifyOnlineSignup } from "@/lib/push";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { resolveSignupLocation } from "@/lib/signup-location";
import { CONTACT_EVENT } from "@/lib/contact-events";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Abuse-Schutz: max. 5 Anmeldungen pro IP in 10 Minuten.
    const rl = checkRateLimit(`signup:${clientIp(req)}`, 5, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, message: "Zu viele Anfragen. Bitte versuche es in ein paar Minuten erneut." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const json = await req.json();
    const result = signupSchema.safeParse(json);

    if (!result.success) {
      // Feld-Pfad mitloggen, damit fehlerhafte Eingaben (z. B. null statt
      // String) künftig eindeutig zuzuordnen sind statt nur einer kryptischen
      // Default-Meldung wie „Expected string, received null".
      console.warn(
        "[/api/signup] validation failed",
        result.error.issues.map((i) => ({
          field: i.path.join(".") || "(root)",
          code: i.code,
          message: i.message,
        })),
      );
      const message = result.error.issues[0]?.message ?? "Bitte prüf deine Eingaben.";
      return NextResponse.json({ ok: false, message }, { status: 400 });
    }

    const data = result.data;

    // Tarif validieren.
    const plan = await db.pricingPlan.findUnique({ where: { id: data.pricingPlanId } });
    if (!plan || !plan.active) {
      return NextResponse.json({ ok: false, message: "Tarif nicht verfügbar." }, { status: 400 });
    }

    // Standort: fest Vital-Fit Ochtrup (Ahaus schließt) — eine evtl.
    // mitgeschickte locationId wird bewusst ignoriert.
    const signupLocation = await resolveSignupLocation();
    const resolvedLocationId = signupLocation?.id ?? null;

    // Plan muss zum Standort passen (oder Allgemein sein)
    if (plan.locationId && plan.locationId !== resolvedLocationId) {
      return NextResponse.json(
        { ok: false, message: "Dieser Tarif gehört zu einem anderen Standort." },
        { status: 400 },
      );
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    let contact =
      (data.ref ? await db.contact.findUnique({ where: { refToken: data.ref } }) : null) ??
      (await db.contact.findUnique({ where: { email: data.email } }));

    // Null-safe Aufbereitung der optionalen Felder:
    //   - iban / contractStartDate werden im neuen UI nicht mehr abgefragt
    //   - gender ist im neuen Hero-Form ebenfalls weggefallen
    // Prisma Contact hat alle drei als optional → null erlaubt.
    const ibanValue = data.iban && data.iban.trim() ? data.iban.trim() : null;
    const contractStartValue =
      data.contractStartDate && data.contractStartDate.trim()
        ? new Date(data.contractStartDate)
        : null;
    const genderValue = data.gender ?? null;

    const contactData = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      gender: genderValue,
      phone: data.phone || null,
      birthDate: new Date(data.birthDate),
      street: data.street,
      postalCode: data.postalCode,
      city: data.city,
      iban: ibanValue,
      contractStartDate: contractStartValue,
      signupAt: new Date(),
      pricingPlanId: data.pricingPlanId,
      locationId: resolvedLocationId,
      // Schritt 1 „Was ist dein Ziel?" (freiwillig). Leere Angaben
      // überschreiben frühere Werte nicht (z. B. bei doppelter Anmeldung).
      ...(data.goals.length > 0 ? { goals: data.goals } : {}),
      ...(data.note ? { signupNote: data.note } : {}),
      status: "NEUKUNDE" as const,
      // Wer sich anmeldet, ist Neukunde — auch wenn er vorher nur den
      // Newsletter hatte: Markierung fällt weg → zählt in der Kachel
      // „Neukunden" und kommt in den Neukunden-Funnel.
      newsletterOnly: false,
      source: contact ? contact.source : ("DIRECT" as const),
      consentText:
        "Ich habe AGB und Datenschutzerklärung gelesen und stimme der Verarbeitung meiner Daten zur Vertragsabwicklung zu.",
      consentIp: ip,
    };

    const wasNewsletterOnly = contact?.newsletterOnly === true;

    if (contact) {
      contact = await db.contact.update({
        where: { id: contact.id },
        data: contactData,
      });
    } else {
      contact = await db.contact.create({ data: contactData });
    }

    await db.contactEvent.create({
      data: {
        contactId: contact.id,
        type: "SIGNUP_SUBMITTED",
        meta: { plan: plan.name, ref: data.ref ?? null, locationId: resolvedLocationId },
      },
    });
    if (wasNewsletterOnly) {
      await db.contactEvent.create({
        data: { contactId: contact.id, type: CONTACT_EVENT.NEWSLETTER_TO_SIGNUP },
      });
    }

    // Studioname für die studioabhängige Widerrufsbelehrung in der Mail.
    const resolvedLocationName = signupLocation?.name ?? null;

    try {
      await sendSignupConfirmation({
        to: data.email,
        firstName: data.firstName,
        planName: plan.name,
        priceCents: plan.priceCents,
        billingInterval: plan.billingInterval,
        locationName: resolvedLocationName,
      });

      // Protokoll: Die Bestätigungsmail führt AGB + Widerrufsbelehrung als
      // PDF-Anhang mit und gilt damit als Zugang auf einem dauerhaften
      // Datenträger. Empfänger und Versandzeitpunkt werden festgehalten
      // (rechtlicher Nachweis).
      await db.contactEvent.create({
        data: {
          contactId: contact.id,
          type: "SIGNUP_CONFIRMATION_SENT",
          meta: {
            to: data.email,
            sentAt: new Date().toISOString(),
            attachment: "AGB-und-Widerrufsbelehrung.pdf",
            includes: ["AGB", "Widerrufsbelehrung"],
            location: resolvedLocationName,
          },
        },
      });
    } catch (err) {
      console.error("[/api/signup] sendSignupConfirmation failed", err);
    }

    await enrollIntoMatchingFunnels(contact.id, contact.status);

    // Push-Notification aufs Handy (silent skip wenn VAPID nicht konfiguriert)
    try {
      await notifyOnlineSignup({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        planName: plan.name,
        contactId: contact.id,
      });
    } catch (err) {
      console.error("[/api/signup] push notification failed", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/signup]", err);
    return NextResponse.json(
      { ok: false, message: "Etwas ist schiefgelaufen." },
      { status: 500 },
    );
  }
}

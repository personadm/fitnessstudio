import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newsletterSchema } from "@/lib/validation";
import { sendNewsletterWelcome } from "@/lib/mail";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Name der Ziel-Liste (Sonntags-Newsletter). Existiert bereits in der DB; wird
// bei Bedarf angelegt, damit die Anmeldung auch in frischen Umgebungen greift.
const NEWSLETTER_LIST_NAME = "Sonntags-Newsletter";

const STUDIO_URL = process.env.STUDIO_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  try {
    // Spam-/Abuse-Schutz: max. 5 Anmeldungen pro IP in 10 Minuten.
    const rl = checkRateLimit(`newsletter:${clientIp(req)}`, 5, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Zu viele Anfragen. Bitte versuche es in ein paar Minuten erneut.",
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const json = await req.json();
    const result = newsletterSchema.safeParse(json);

    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "Ungültige Eingabe.";
      return NextResponse.json({ ok: false, message }, { status: 400 });
    }

    const { email, firstName } = result.data;

    // IP fürs Consent-Logging (DSGVO-Beleg)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const consentText =
      "Ja, ich möchte den kostenlosen Sonntags-Newsletter per E-Mail erhalten.";

    // Ziel-Liste sicherstellen (Name ist unique → upsert).
    const list = await db.list.upsert({
      where: { name: NEWSLETTER_LIST_NAME },
      update: {},
      create: {
        name: NEWSLETTER_LIST_NAME,
        description: "Wöchentlicher Sonntags-Newsletter",
      },
      select: { id: true },
    });

    // Bestehenden Kontakt lesen: entscheidet, ob wir newsletterOnly setzen
    // dürfen (nur bei brandneuen Kontakten — ein bestehender Lead/Kunde darf
    // NICHT auf newsletterOnly zurückgestuft und damit aus Funnels/Status-
    // Kampagnen ausgeschlossen werden).
    const existing = await db.contact.findUnique({
      where: { email },
      select: { id: true, unsubscribeToken: true },
    });

    let contact: {
      id: string;
      firstName: string | null;
      unsubscribeToken: string | null;
    };

    if (existing) {
      // Bestehender Kontakt: Einwilligung aktualisieren, ein evtl. gesetztes
      // Opt-out zurücknehmen (explizite Neu-Anmeldung), newsletterOnly NICHT
      // anfassen.
      contact = await db.contact.update({
        where: { id: existing.id },
        data: {
          firstName,
          consentText,
          consentIp: ip,
          optedOutAt: null,
        },
        select: { id: true, firstName: true, unsubscribeToken: true },
      });
    } else {
      // Neuer Kontakt: reiner Newsletter-Kontakt (keine Funnels, keine
      // Status-Kampagnen). Single-Opt-In mit Consent-Beleg.
      contact = await db.contact.create({
        data: {
          email,
          firstName,
          status: "INTERESSENT",
          source: "LANDING",
          newsletterOnly: true,
          doiConfirmedAt: new Date(),
          consentText,
          consentIp: ip,
        },
        select: { id: true, firstName: true, unsubscribeToken: true },
      });
    }

    // Der Liste hinzufügen. Doppelte Mitgliedschaft (@@id([contactId, listId]))
    // ignorieren — mehrfaches Anmelden ist harmlos.
    let alreadySubscribed = false;
    try {
      await db.contactList.create({
        data: { contactId: contact.id, listId: list.id },
      });
    } catch (err) {
      const e = err as { code?: string };
      if (e.code === "P2002") {
        alreadySubscribed = true;
      } else {
        throw err;
      }
    }

    await db.contactEvent.create({
      data: {
        contactId: contact.id,
        type: "NEWSLETTER_SIGNUP",
        meta: { ip, list: NEWSLETTER_LIST_NAME, source: "landing" },
      },
    });

    // Willkommensmail — Fehler nicht an den User durchreichen (Anmeldung ist
    // gespeichert). Bei bereits eingetragenen Kontakten keine zweite Mail.
    if (!alreadySubscribed) {
      try {
        const unsubscribeUrl = contact.unsubscribeToken
          ? `${STUDIO_URL}/abmelden?t=${contact.unsubscribeToken}`
          : null;
        await sendNewsletterWelcome({
          to: email,
          firstName: contact.firstName,
          unsubscribeUrl,
        });
      } catch (err) {
        console.error("[/api/newsletter] sendNewsletterWelcome failed", err);
      }
    }

    return NextResponse.json({
      ok: true,
      message: alreadySubscribed
        ? "Du bist bereits für unseren Sonntags-Newsletter angemeldet."
        : "Geschafft! Ab Sonntag bist du dabei – schau bei Gelegenheit in dein Postfach.",
    });
  } catch (err) {
    console.error("[/api/newsletter]", err);
    return NextResponse.json(
      { ok: false, message: "Etwas ist schiefgelaufen." },
      { status: 500 },
    );
  }
}

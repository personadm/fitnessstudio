import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signupSchema } from "@/lib/validation";
import { sendSignupConfirmation } from "@/lib/mail";
import { enrollIntoMatchingFunnels } from "@/lib/funnels";
import { notifyOnlineSignup } from "@/lib/push";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const result = signupSchema.safeParse(json);

    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "Ungültige Eingabe.";
      return NextResponse.json({ ok: false, message }, { status: 400 });
    }

    const data = result.data;

    // Tarif validieren
    const plan = await db.pricingPlan.findUnique({ where: { id: data.pricingPlanId } });
    if (!plan || !plan.active) {
      return NextResponse.json({ ok: false, message: "Tarif nicht verfügbar." }, { status: 400 });
    }

    // Standort-Logik (analog zu leads)
    const activeLocations = await db.location.findMany({
      where: { active: true },
      select: { id: true },
    });

    let resolvedLocationId: string | null = null;

    if (data.locationId) {
      const valid = activeLocations.find((l) => l.id === data.locationId);
      if (!valid) {
        return NextResponse.json(
          { ok: false, message: "Standort nicht verfügbar." },
          { status: 400 },
        );
      }
      resolvedLocationId = data.locationId;
    } else if (activeLocations.length === 1) {
      resolvedLocationId = activeLocations[0].id;
    } else if (activeLocations.length > 1) {
      return NextResponse.json(
        { ok: false, message: "Bitte wähle einen Standort aus." },
        { status: 400 },
      );
    }

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

    const contactData = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      gender: data.gender,
      phone: data.phone,
      birthDate: new Date(data.birthDate),
      street: data.street,
      postalCode: data.postalCode,
      city: data.city,
      signupAt: new Date(),
      pricingPlanId: data.pricingPlanId,
      locationId: resolvedLocationId,
      status: "NEUKUNDE" as const,
      source: contact ? contact.source : ("DIRECT" as const),
      consentText:
        "Ich habe AGB und Datenschutzerklärung gelesen und stimme der Verarbeitung meiner Daten zur Vertragsabwicklung zu.",
      consentIp: ip,
    };

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

    try {
      await sendSignupConfirmation({
        to: data.email,
        firstName: data.firstName,
        planName: plan.name,
        priceCents: plan.priceCents,
      });
    } catch (err) {
      console.error("[/api/signup] sendSignupConfirmation failed", err);
    }

    await enrollIntoMatchingFunnels(contact.id, contact.status);

    // 🎉 Push-Notification aufs Handy (silent skip wenn VAPID nicht konfiguriert)
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

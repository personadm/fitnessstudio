import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signupSchema } from "@/lib/validation";
import { sendSignupConfirmation } from "@/lib/mail";

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

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    // Contact ggf. existierend per ref-Token oder per Mail finden
    let contact =
      (data.ref ? await db.contact.findUnique({ where: { refToken: data.ref } }) : null) ??
      (await db.contact.findUnique({ where: { email: data.email } }));

    const contactData = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      birthDate: new Date(data.birthDate),
      street: data.street,
      postalCode: data.postalCode,
      city: data.city,
      pricingPlanId: data.pricingPlanId,
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
      contact = await db.contact.create({
        data: contactData,
      });
    }

    await db.contactEvent.create({
      data: {
        contactId: contact.id,
        type: "SIGNUP_SUBMITTED",
        meta: { plan: plan.name, ref: data.ref ?? null },
      },
    });

    // Bestätigung an User – Fehler nicht durchreichen
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/signup]", err);
    return NextResponse.json({ ok: false, message: "Etwas ist schiefgelaufen." }, { status: 500 });
  }
}

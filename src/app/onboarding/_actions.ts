"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { SLUG_PATTERN, slugify, isReservedSlug } from "@/lib/tenant";
import { getPalette } from "@/lib/palettes";
import { coerceLandingContent } from "@/lib/landing";
import type { BillingInterval, Prisma } from "@prisma/client";

// Logo als Data-URL: nur Bilder, max ~700 KB (Base64 ist ~1/3 größer als binär).
const MAX_LOGO_CHARS = 950_000;

/** Prüft, ob ein Code einlösbar ist (existiert, UNUSED, nicht abgelaufen). */
export async function isCodeRedeemable(code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return false;
  const rec = await db.activationCode.findUnique({
    where: { code: normalized },
    select: { status: true, expiresAt: true },
  });
  if (!rec || rec.status !== "UNUSED") return false;
  if (rec.expiresAt && rec.expiresAt.getTime() < Date.now()) return false;
  return true;
}

/** Schritt 1: Code prüfen → weiter zum Setup oder zurück mit Fehler. */
export async function submitCode(formData: FormData) {
  const code = ((formData.get("code") as string) || "").trim().toUpperCase();
  if (!(await isCodeRedeemable(code))) {
    redirect("/onboarding?error=invalid");
  }
  redirect(`/onboarding/setup?code=${encodeURIComponent(code)}`);
}

const BILLING_VALUES = [
  "MONATLICH",
  "QUARTALSWEISE",
  "HALBJAEHRLICH",
  "JAEHRLICH",
  "EINMALIG",
] as const;

const setupSchema = z.object({
  code: z.string().trim().min(1),
  studioName: z.string().trim().min(2, "Studio-Name zu kurz.").max(80),
  slug: z.string().trim().toLowerCase().optional(),
  adminEmail: z.string().trim().toLowerCase().email("Ungültige E-Mail."),
  adminPassword: z.string().min(12, "Passwort braucht mind. 12 Zeichen."),
  adminName: z.string().trim().max(80).optional(),
  paletteKey: z.string().trim().max(40).optional(),
  logoDataUrl: z.string().max(MAX_LOGO_CHARS, "Logo ist zu groß (max ~700 KB).").optional(),
  landingJson: z.string().max(20_000).optional(),
  locationName: z.string().trim().min(2, "Standort-Name zu kurz.").max(80),
  city: z.string().trim().max(80).optional(),
  planName: z.string().trim().min(2, "Tarif-Name zu kurz.").max(80),
  priceEur: z.coerce.number().min(0).max(100000),
  billingInterval: z.enum(BILLING_VALUES),
});

export type OnboardingState = { error: string } | null;

/** Schritt 2: Studio + erster Admin + Standort + Tarif anlegen, Code einlösen. */
export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = setupSchema.safeParse({
    code: formData.get("code"),
    studioName: formData.get("studioName"),
    slug: formData.get("slug") || undefined,
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
    adminName: formData.get("adminName") || undefined,
    paletteKey: formData.get("paletteKey") || undefined,
    logoDataUrl: formData.get("logoDataUrl") || undefined,
    landingJson: formData.get("landingJson") || undefined,
    locationName: formData.get("locationName"),
    city: formData.get("city") || undefined,
    planName: formData.get("planName"),
    priceEur: formData.get("priceEur"),
    billingInterval: formData.get("billingInterval"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }
  const d = parsed.data;

  // Code muss (noch) einlösbar sein.
  if (!(await isCodeRedeemable(d.code))) {
    return { error: "Dieser Code ist ungültig oder bereits eingelöst." };
  }

  // Slug bestimmen: explizit gesetzt oder aus dem Namen abgeleitet.
  const slug = d.slug ? slugify(d.slug) : slugify(d.studioName);
  if (!SLUG_PATTERN.test(slug)) {
    return { error: "Adresse (Slug) ungültig — nur a–z, 0–9 und Bindestriche, 2–40 Zeichen." };
  }
  if (isReservedSlug(slug)) {
    return { error: `Die Adresse „${slug}" ist reserviert. Bitte eine andere wählen.` };
  }
  const slugTaken = await db.studio.findUnique({ where: { slug }, select: { id: true } });
  if (slugTaken) {
    return { error: `Die Adresse „${slug}" ist schon vergeben. Bitte eine andere wählen.` };
  }

  const passwordHash = await bcrypt.hash(d.adminPassword, 12);
  const priceCents = Math.round(d.priceEur * 100);

  // Palette → konkrete Farben.
  const palette = getPalette(d.paletteKey);

  // Logo: nur akzeptieren, wenn es ein Bild-Data-URL ist.
  const logoUrl =
    d.logoDataUrl && d.logoDataUrl.startsWith("data:image/") ? d.logoDataUrl : null;

  // Landing-Inhalte (optional, ggf. KI-generiert + im Formular editiert).
  let landingContent: Prisma.InputJsonValue | undefined;
  if (d.landingJson) {
    try {
      const coerced = coerceLandingContent(JSON.parse(d.landingJson));
      if (coerced) landingContent = coerced as unknown as Prisma.InputJsonValue;
    } catch {
      /* ungültiges JSON → einfach ohne Landing-Inhalte anlegen */
    }
  }

  let studioId: string;
  let adminId: string;
  try {
    const result = await db.$transaction(async (tx) => {
      const studio = await tx.studio.create({
        data: {
          slug,
          name: d.studioName,
          status: "ACTIVE",
          primaryColor: palette.primary,
          accentColor: palette.accent,
          paletteKey: palette.key,
          logoUrl,
          ...(landingContent !== undefined ? { landingContent } : {}),
          mailFromName: d.studioName,
          onboardingCompletedAt: new Date(),
        },
      });
      await tx.location.create({
        data: { studioId: studio.id, name: d.locationName, city: d.city || null, active: true },
      });
      await tx.pricingPlan.create({
        data: {
          studioId: studio.id,
          name: d.planName,
          priceCents,
          billingInterval: d.billingInterval as BillingInterval,
          highlights: [],
          active: true,
        },
      });
      const admin = await tx.adminUser.create({
        data: {
          studioId: studio.id,
          email: d.adminEmail,
          passwordHash,
          name: d.adminName || null,
        },
      });
      // Code atomar einlösen — nur wenn noch UNUSED (Race-Schutz).
      const upd = await tx.activationCode.updateMany({
        where: { code: d.code.trim().toUpperCase(), status: "UNUSED" },
        data: { status: "REDEEMED", studioId: studio.id, redeemedAt: new Date() },
      });
      if (upd.count === 0) throw new Error("CODE_TAKEN");
      return { studioId: studio.id, adminId: admin.id };
    });
    studioId = result.studioId;
    adminId = result.adminId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "CODE_TAKEN") {
      return { error: "Dieser Code wurde gerade eingelöst. Bitte wende dich an den Support." };
    }
    // P2002 = Unique-Verletzung (Slug-Race o. ä.)
    if (msg.includes("P2002") || msg.includes("Unique constraint")) {
      return { error: "Die gewählte Adresse ist bereits vergeben. Bitte erneut versuchen." };
    }
    console.error("[onboarding] completeOnboarding failed", err);
    return { error: "Etwas ist schiefgelaufen. Bitte später erneut versuchen." };
  }

  // Neuen Admin direkt einloggen und ins Backend schicken.
  await createSession(adminId, studioId);
  redirect("/admin");
}

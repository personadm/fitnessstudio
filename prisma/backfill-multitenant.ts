/**
 * Multi-Tenant Backfill — Phase 1
 *
 * Überführt die bestehenden Single-Tenant-Daten in den ersten Mandanten
 * (das aktuelle Studio "Tina & Erik"). Läuft NACH dem ersten `db push`
 * (Stage 1: studioId ist nullable) und VOR dem zweiten `db push`
 * (Stage 2: studioId wird required + Unique-Constraints pro Studio).
 *
 * Idempotent: kann mehrfach laufen. Setzt studioId nur dort, wo sie noch
 * fehlt (null). Bestehende Zuordnungen werden nicht überschrieben.
 *
 * Ausführen:  npx tsx prisma/backfill-multitenant.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Erzeugt einen URL-tauglichen Subdomain-Slug aus einem Namen. */
function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // verbleibende Akzente entfernen
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "studio";
}

async function main() {
  const studioName = process.env.STUDIO_NAME?.trim() || "Deine Gesundheitscoaches";
  const studioUrl = process.env.STUDIO_URL?.trim() || "";
  const mailFrom = process.env.MAIL_FROM?.trim() || null;
  const mailReplyTo = process.env.MAIL_REPLY_TO?.trim() || null;

  // Slug: bevorzugt aus STUDIO_URL-Host, sonst aus Name.
  let slug = "";
  try {
    if (studioUrl) {
      const host = new URL(studioUrl).hostname.replace(/^www\./, "");
      slug = slugify(host.split(".")[0] || studioName);
    }
  } catch {
    /* ignore */
  }
  if (!slug) slug = slugify(studioName);

  console.log(`→ Default-Studio: name="${studioName}", slug="${slug}"`);

  // 1) Default-Studio anlegen (oder vorhandenes wiederverwenden).
  //    Wir nehmen das ÄLTESTE existierende Studio als Default, falls schon
  //    eins existiert (z. B. bei erneutem Lauf).
  const existing = await prisma.studio.findFirst({ orderBy: { createdAt: "asc" } });

  const studio =
    existing ??
    (await prisma.studio.create({
      data: {
        slug,
        name: studioName,
        status: "ACTIVE",
        mailFromName: studioName,
        mailFromEmail: mailFrom,
        mailReplyTo,
        onboardingCompletedAt: new Date(),
      },
    }));

  console.log(`→ Studio-ID: ${studio.id} (${existing ? "vorhanden" : "neu erstellt"})`);

  // 2) studioId auf alle Bestandsdaten setzen, wo sie noch null ist.
  const targets = [
    "location",
    "contact",
    "pricingPlan",
    "list",
    "campaign",
    "funnel",
    "adminUser",
  ] as const;

  for (const model of targets) {
    // @ts-expect-error — dynamischer Modellzugriff über das Prisma-Delegate
    const res = await prisma[model].updateMany({
      where: { studioId: null },
      data: { studioId: studio.id },
    });
    console.log(`   ${model.padEnd(12)} → ${res.count} Datensätze zugeordnet`);
  }

  // 3) Sanity-Check: gibt es noch verwaiste Datensätze ohne studioId?
  const orphans: Record<string, number> = {};
  for (const model of targets) {
    // @ts-expect-error — dynamischer Modellzugriff
    orphans[model] = await prisma[model].count({ where: { studioId: null } });
  }
  const remaining = Object.entries(orphans).filter(([, n]) => n > 0);
  if (remaining.length > 0) {
    console.warn("⚠ Es gibt noch Datensätze ohne studioId:", orphans);
    console.warn("  Bitte prüfen, bevor du Stage 2 (required) pushst.");
  } else {
    console.log("✓ Alle Bestandsdaten sind einem Studio zugeordnet.");
  }

  console.log("\n✓ Backfill abgeschlossen.");
}

main()
  .catch((e) => {
    console.error("✗ Backfill fehlgeschlagen:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/**
 * Voll-Backup aller Tabellen als JSON.
 *
 * Schlanke Alternative zu pg_dump: liest jede Tabelle aus und schreibt sie
 * in eine zeitgestempelte Datei unter `backups/`. Dient als Sicherheitsnetz
 * vor der Multi-Tenant-Migration.
 *
 * Ausführen:  npx tsx prisma/backup-json.ts
 */
import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

/**
 * Liest eine Tabelle aus. Existiert sie noch nicht (vor der Migration),
 * wird [] zurückgegeben statt zu crashen.
 */
async function safeFindMany(name: string, fn: () => Promise<unknown[]>): Promise<unknown[]> {
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // P2021 = Tabelle existiert nicht (vor dem ersten Push erwartet).
    if (msg.includes("P2021") || msg.toLowerCase().includes("does not exist")) {
      console.warn(`  (übersprungen: Tabelle ${name} existiert noch nicht)`);
      return [];
    }
    throw e;
  }
}

async function main() {
  const dump: Record<string, unknown[]> = {};

  // Reihenfolge egal — es ist ein reiner Daten-Snapshot.
  dump.location = await safeFindMany("location", () => prisma.location.findMany());
  dump.contact = await safeFindMany("contact", () => prisma.contact.findMany());
  dump.pricingPlan = await safeFindMany("pricingPlan", () => prisma.pricingPlan.findMany());
  dump.list = await safeFindMany("list", () => prisma.list.findMany());
  dump.contactList = await safeFindMany("contactList", () => prisma.contactList.findMany());
  dump.campaign = await safeFindMany("campaign", () => prisma.campaign.findMany());
  dump.campaignEvent = await safeFindMany("campaignEvent", () => prisma.campaignEvent.findMany());
  dump.contactEvent = await safeFindMany("contactEvent", () => prisma.contactEvent.findMany());
  dump.funnel = await safeFindMany("funnel", () => prisma.funnel.findMany());
  dump.funnelStep = await safeFindMany("funnelStep", () => prisma.funnelStep.findMany());
  dump.funnelEnrollment = await safeFindMany("funnelEnrollment", () => prisma.funnelEnrollment.findMany());
  dump.funnelStepEvent = await safeFindMany("funnelStepEvent", () => prisma.funnelStepEvent.findMany());
  dump.adminUser = await safeFindMany("adminUser", () => prisma.adminUser.findMany());
  dump.pushSubscription = await safeFindMany("pushSubscription", () => prisma.pushSubscription.findMany());
  dump.pageView = await safeFindMany("pageView", () => prisma.pageView.findMany());

  const dir = path.join(process.cwd(), "backups");
  await mkdir(dir, { recursive: true });

  // Zeitstempel ohne Doppelpunkte (dateisystem-freundlich).
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `backup-${stamp}.json`);

  await writeFile(file, JSON.stringify(dump, null, 2), "utf8");

  const counts = Object.entries(dump)
    .map(([k, v]) => `${k}=${v.length}`)
    .join(", ");
  console.log(`✓ Backup geschrieben: ${file}`);
  console.log(`  Zeilen: ${counts}`);
}

main()
  .catch((e) => {
    console.error("✗ Backup fehlgeschlagen:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Tarife anlegen
  const plans = [
    {
      name: "Basis",
      description: "Voller Zugang zum Studio, ideal für den Einstieg.",
      priceCents: 2990,
      highlights: ["Studio-Zugang Mo–Fr 6–22 Uhr", "Geräte- & Freihantelbereich", "Duschen & Umkleiden"],
      sortOrder: 1,
    },
    {
      name: "Premium",
      description: "Maximale Flexibilität mit allen Kursen und 24/7-Zugang.",
      priceCents: 4990,
      highlights: ["24/7-Zugang", "Alle Kurse inklusive", "Sauna-Bereich", "1 Personal-Training pro Monat"],
      sortOrder: 2,
    },
    {
      name: "Studenten",
      description: "Vergünstigter Tarif mit gültigem Studienausweis.",
      priceCents: 2490,
      highlights: ["Voller Studio-Zugang Mo–Fr", "Alle Kurse", "Nachweis erforderlich"],
      sortOrder: 3,
    },
  ];

  for (const plan of plans) {
    await prisma.pricingPlan.upsert({
      where: { id: plan.name.toLowerCase() },
      update: plan,
      create: { id: plan.name.toLowerCase(), ...plan },
    });
  }

  // Standard-Listen
  const lists = [
    { name: "Newsletter", description: "Allgemeiner Newsletter an alle bestätigten Interessenten und Kunden." },
    { name: "Probetraining", description: "Hat eine Probetrainings-Anfrage gestellt." },
    { name: "Mitglieder", description: "Aktive Mitglieder." },
  ];

  for (const list of lists) {
    await prisma.list.upsert({
      where: { name: list.name },
      update: list,
      create: list,
    });
  }

  console.log("✓ Seed abgeschlossen");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

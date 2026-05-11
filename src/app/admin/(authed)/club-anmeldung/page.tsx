import { db } from "@/lib/db";
import { ClubSignupForm } from "@/components/ClubSignupForm";

export const metadata = {
  title: "Club-Anmeldung",
};

export default async function ClubAnmeldungPage() {
  const [plans, locations] = await Promise.all([
    db.pricingPlan.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.location.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, city: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-ink/15">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="label !text-acid_dark mb-1">Intern</p>
            <h1 className="text-display-italic text-3xl md:text-4xl">Club-Anmeldung</h1>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted hidden md:block">
            Neukunde direkt anlegen
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-10 max-w-2xl text-display text-base leading-relaxed text-ink-soft">
          Hier kannst du Personen anlegen, die sich am Tresen oder per Online-Formular angemeldet
          haben. Diese Anmeldung umgeht die Bestätigungsmail — der Kontakt landet sofort im Status
          <strong className="text-ink"> Neukunde</strong>. Pflicht ist nur das Wesentliche, alles
          andere lässt sich später ergänzen.
        </div>

        <ClubSignupForm
          plans={plans.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            priceCents: p.priceCents,
            billingInterval: p.billingInterval,
            locationId: p.locationId,
          }))}
          locations={locations}
        />
      </div>
    </main>
  );
}

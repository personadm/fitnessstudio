import { db } from "@/lib/db";
import { SignupForm } from "@/components/SignupForm";

interface PageProps {
  searchParams: Promise<{ ref?: string }>;
}

const STUDIO = process.env.STUDIO_NAME ?? "Studio Iron";

export default async function AnmeldenPage({ searchParams }: PageProps) {
  const { ref } = await searchParams;

  // Falls ref-Token vorhanden: bestehenden Contact suchen, Daten vorausfüllen
  const existingContact = ref
    ? await db.contact.findUnique({ where: { refToken: ref } })
    : null;

  const plans = await db.pricingPlan.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  // Defensive: falls keine Tarife in DB → klare Fehlerseite
  if (plans.length === 0) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="max-w-xl">
          <p className="label mb-6">× Konfiguration</p>
          <h1 className="text-display text-4xl leading-[1] md:text-5xl">
            Aktuell sind keine Tarife verfügbar.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-ink-soft">
            Bitte versuch es später nochmal oder schreib uns eine Mail.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-ink/15">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 text-[11px] uppercase tracking-[0.14em]">
          <a href="/" className="font-mono">
            {STUDIO}
          </a>
          <span className="hidden font-mono text-muted md:inline">Anmeldung</span>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <p className="label mb-6">№ 03 — Anmelden</p>
        <h1 className="text-display text-5xl leading-[0.95] md:text-7xl">
          Mitgliedschaft
          <br />
          <span className="text-display-italic">starten.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-soft">
          Trag dich hier ein und wir bereiten alles für dich vor. Vertrag bekommst du in den nächsten
          Werktagen per Mail – nichts wird automatisch abgebucht.
        </p>

        <div className="mt-12">
          <SignupForm
            plans={plans.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              priceCents: p.priceCents,
              highlights: p.highlights,
            }))}
            ref_={ref ?? null}
            prefilledEmail={existingContact?.email ?? ""}
            prefilledFirstName={existingContact?.firstName ?? undefined}
            prefilledLastName={existingContact?.lastName ?? undefined}
            prefilledGender={existingContact?.gender ?? null}
          />
        </div>
      </section>

      <footer className="border-t border-ink/15">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          <span>
            © {new Date().getFullYear()} {STUDIO}
          </span>
          <nav className="flex gap-6">
            <a href="/impressum" className="hover:text-ink">
              Impressum
            </a>
            <a href="/datenschutz" className="hover:text-ink">
              Datenschutz
            </a>
            <a href="/agb" className="hover:text-ink">
              AGB
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}

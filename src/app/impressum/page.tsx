import Link from "next/link";

const STUDIO = process.env.STUDIO_NAME ?? "Studio Iron";

export const metadata = {
  title: "Impressum",
  description: "Rechtliche Angaben und Kontaktdaten gemäß § 5 TMG.",
};

export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 text-[11px] uppercase tracking-[0.14em]">
          <Link href="/" className="font-mono hover:text-ink-soft">
            ← Zurück
          </Link>
          <span className="font-mono">{STUDIO}</span>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <p className="label mb-6">Rechtliches</p>
        <h1 className="text-display-italic text-5xl md:text-7xl leading-[0.95] mb-12">
          Impressum
        </h1>

        <Section title="Name und Anschrift">
          <div className="space-y-1">
            <p className="font-medium text-ink">Villa-Fit</p>
            <p>Erhardstr. 2</p>
            <p>48683 Ahaus</p>
          </div>
        </Section>

        <Section title="Vertretungsberechtigte Personen">
          <p>Erik Bodon</p>
        </Section>

        <Section title="Kontaktdaten">
          <div className="space-y-1">
            <p>
              Telefon:{" "}
              <a href="tel:02561961166" className="underline underline-offset-2 hover:text-ink">
                02561 961166
              </a>
            </p>
            <p>
              E-Mail:{" "}
              <a
                href="mailto:club-ahaus@gesundheitscoaches.de"
                className="underline underline-offset-2 hover:text-ink"
              >
                club-ahaus@gesundheitscoaches.de
              </a>
            </p>
            <p>
              Internet:{" "}
              <a
                href="https://www.gesundheitscoaches.de/"
                className="underline underline-offset-2 hover:text-ink"
              >
                https://www.gesundheitscoaches.de/
              </a>
            </p>
            <p className="pt-3">Umsatzsteuer-Identifikationsnummer: DE 262 602 389</p>
            <p>Handelsregisternummer: Coesfeld 11549</p>
          </div>
        </Section>

        <Section title="Haftung für Inhalte">
          <p>
            Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten
            nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als
            Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
            Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
            Tätigkeit hinweisen.
          </p>
          <p className="mt-4">
            Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den
            allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch
            erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei
            Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend
            entfernen.
          </p>
        </Section>

        <Section title="Haftung für Links">
          <p>
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
            Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr
            übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder
            Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der
            Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum
            Zeitpunkt der Verlinkung nicht erkennbar.
          </p>
          <p className="mt-4">
            Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete
            Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von
            Rechtsverletzungen werden wir derartige Links umgehend entfernen.
          </p>
        </Section>

        <Section title="Urheberrecht">
          <p>
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
            dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art
            der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen
            Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind
            nur für den privaten, nicht kommerziellen Gebrauch gestattet.
          </p>
          <p className="mt-4">
            Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die
            Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche
            gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden,
            bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen
            werden wir derartige Inhalte umgehend entfernen.
          </p>
        </Section>
      </article>

      <LegalFooter />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-display text-xl md:text-2xl mb-4 text-ink">{title}</h2>
      <div className="text-display text-base leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

function LegalFooter() {
  return (
    <footer className="border-t border-ink/15">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        <span>© {new Date().getFullYear()} {STUDIO}</span>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/impressum" className="hover:text-ink">Impressum</Link>
          <Link href="/datenschutz" className="hover:text-ink">Datenschutz</Link>
          <Link href="/agb" className="hover:text-ink">AGB</Link>
          <Link href="/teilnahmebedingungen" className="hover:text-ink">Teilnahmebedingungen</Link>
        </nav>
      </div>
    </footer>
  );
}

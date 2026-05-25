import Link from "next/link";

const STUDIO = process.env.STUDIO_NAME ?? "Deine Gesundheitscoaches";

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
            <p className="font-medium text-ink">Vital-Fit GmbH</p>
            <p>Laurenzstr. 98</p>
            <p>48607 Ochtrup</p>
          </div>
        </Section>

        <Section title="Vertretungsberechtigte Personen">
          <p>Erik Bodon</p>
        </Section>

        <Section title="Kontaktdaten">
          <div className="space-y-1">
            <p>Telefon: 02553 7216466</p>
            <p>
              E-Mail:{" "}
              <a href="mailto:mail@gesundheitscoaches.de" className="underline">
                mail@gesundheitscoaches.de
              </a>
            </p>
            <p>
              Internet:{" "}
              <a
                href="https://www.gesundheitscoaches.de/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                https://www.gesundheitscoaches.de/
              </a>
            </p>
          </div>
        </Section>

        <Section title="Umsatzsteuer-Identifikationsnummer">
          <p>DE 313 650 908</p>
        </Section>

        <Section title="Handelsregisternummer">
          <p>Steinfurt HRB 11713</p>
        </Section>

        <Section title="Haftung für Inhalte">
          <p>
            Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte
            auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
            Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
            verpflichtet, übermittelte oder gespeicherte fremde Informationen
            zu überwachen oder nach Umständen zu forschen, die auf eine
            rechtswidrige Tätigkeit hinweisen.
          </p>
          <p>
            Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
            Informationen nach den allgemeinen Gesetzen bleiben hiervon
            unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem
            Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich.
            Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir
            diese Inhalte umgehend entfernen.
          </p>
        </Section>

        <Section title="Haftung für Links">
          <p>
            Unser Angebot enthält Links zu externen Websites Dritter, auf
            deren Inhalte wir keinen Einfluss haben. Deshalb können wir für
            diese fremden Inhalte auch keine Gewähr übernehmen. Für die
            Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
            oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten
            wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße
            überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der
            Verlinkung nicht erkennbar.
          </p>
          <p>
            Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist
            jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht
            zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir
            derartige Links umgehend entfernen.
          </p>
        </Section>

        <Section title="Urheberrecht">
          <p>
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf
            diesen Seiten unterliegen dem deutschen Urheberrecht. Die
            Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
            Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der
            schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
            Downloads und Kopien dieser Seite sind nur für den privaten, nicht
            kommerziellen Gebrauch gestattet.
          </p>
          <p>
            Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt
            wurden, werden die Urheberrechte Dritter beachtet. Insbesondere
            werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie
            trotzdem auf eine Urheberrechtsverletzung aufmerksam werden,
            bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von
            Rechtsverletzungen werden wir derartige Inhalte umgehend
            entfernen.
          </p>
        </Section>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-3">
        {title}
      </h2>
      <div className="prose prose-sm max-w-none text-ink leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

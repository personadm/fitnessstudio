import Link from "next/link";

const STUDIO = process.env.STUDIO_NAME ?? "Studio Iron";

export const metadata = {
  title: "Impressum",
  description: "Rechtliche Angaben und Kontaktdaten gemäß § 5 TMG.",
};

export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-cream">
      {/* Top Bar */}
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

        <p className="text-display text-lg leading-relaxed mb-12">
          Kontaktdaten und rechtliche Angaben gemäß § 5 TMG.
        </p>

        <section className="mb-10">
          <h2 className="text-display text-2xl md:text-3xl mb-6">
            Villa-Fit GmbH
          </h2>
          <div className="text-display text-base leading-relaxed space-y-1">
            <p>Geschäftsführer: Erik Bodon</p>
            <p>Erhardstr. 2</p>
            <p>48683 Ahaus</p>
            <p>
              Tel:{" "}
              <a href="tel:02561961166" className="underline underline-offset-2 hover:text-ink-soft">
                02561 / 961166
              </a>
            </p>
            <p>
              E-Mail:{" "}
              <a
                href="mailto:mail@gesundheitscoaches.de"
                className="underline underline-offset-2 hover:text-ink-soft"
              >
                mail@gesundheitscoaches.de
              </a>
            </p>
            <p className="pt-2">Amtsgericht Coesfeld HRB 11549</p>
            <p>USt-IdNr: DE 262 602 389</p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-display text-2xl md:text-3xl mb-6">
            Vital-Fit GmbH
          </h2>
          <div className="text-display text-base leading-relaxed space-y-1">
            <p>Geschäftsführer: Erik Bodon</p>
            <p>Laurenzstr. 98</p>
            <p>48607 Ochtrup</p>
            <p>
              Tel:{" "}
              <a href="tel:025537216466" className="underline underline-offset-2 hover:text-ink-soft">
                02553 / 7216466
              </a>
            </p>
            <p>
              E-Mail:{" "}
              <a
                href="mailto:mail@gesundheitscoaches.de"
                className="underline underline-offset-2 hover:text-ink-soft"
              >
                mail@gesundheitscoaches.de
              </a>
            </p>
            <p className="pt-2">Amtsgericht Steinfurt HRB 11713</p>
            <p>USt-IdNr: DE 313 650 908</p>
          </div>
        </section>

        <section className="mt-16 border-t border-ink/15 pt-10">
          <h2 className="text-display text-xl md:text-2xl mb-4">
            Hinweis zu Abmahnungen
          </h2>
          <p className="text-display text-base leading-relaxed text-ink-soft">
            Keine Abmahnung ohne vorherigen Kontakt! Sollten Inhalt oder Aufmachung dieser Website
            Rechte Dritter oder gesetzliche Bestimmungen verletzen, bitten wir um Benachrichtigung
            ohne Ausstellung einer Kostennote. Zu Recht beanstandete Passagen werden unverzüglich
            entfernt, sodass die Einschaltung eines Rechtsbeistandes nicht erforderlich ist. Dennoch
            von Ihnen ohne vorherige Kontaktaufnahme ausgelöste Kosten werden wir vollumfänglich
            zurückweisen und u. U. Gegenklage wegen Verletzung der vorgenannten Bestimmungen
            einreichen. Quelle der dargestellten Bilder im Kurs-, Fitness-, Wellness-, Therapie-
            und Service-Bereich ist Villa-Fit GmbH, istockphoto.com, shutterstock. Alle Abbildungen,
            Videos und Texte sind Eigentum der Villa-Fit GmbH und dürfen nicht zu kommerziellen
            Zwecken weiterverwendet werden.
          </p>
        </section>
      </article>

      {/* Footer */}
      <footer className="border-t border-ink/15">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          <span>
            © {new Date().getFullYear()} {STUDIO}
          </span>
          <nav className="flex gap-6">
            <Link href="/impressum" className="hover:text-ink">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-ink">
              Datenschutz
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

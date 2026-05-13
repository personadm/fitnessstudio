const STUDIO = process.env.STUDIO_NAME ?? "Deine Gesundheitscoaches";

export const metadata = {
  title: "Bestellung eingegangen",
};

export default function DankePage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-ink/15">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 text-[11px] uppercase tracking-[0.14em]">
          <a href="/" className="font-mono">
            {STUDIO}
          </a>
          <span className="hidden font-mono text-muted md:inline">Bestellung eingegangen</span>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-20 md:py-32">
        <p className="label mb-6">✓ Bestellung eingegangen</p>
        <h1 className="text-display text-5xl leading-[0.95] md:text-7xl">
          Danke,
          <br />
          <span className="text-display-italic">wir freuen uns.</span>
        </h1>

        <div className="mt-10 space-y-5 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
          <p>
            Deine Bestellung ist bei uns angekommen. Wir melden uns in den nächsten Werktagen
            <strong className="text-ink"> telefonisch bei dir zum ersten Kennenlernen</strong> —
            damit wir alles in Ruhe besprechen können und deinen Start optimal auf dich abstimmen.
          </p>
          <p>
            Halt dein Telefon griffbereit. Falls wir dich nicht direkt erreichen, hinterlassen wir
            eine Nachricht oder schreiben dir eine SMS.
          </p>
        </div>

        <div className="mt-12 border-t border-ink/15 pt-8">
          <p className="label mb-3">Bis dahin</p>
          <p className="text-base leading-relaxed text-ink-soft">
            Schau gerne schon mal auf unseren Social-Media-Kanälen oder dem Blog vorbei — da
            findest du Tipps und Erfolgsgeschichten, die dich auf deinen Start einstimmen.
          </p>
        </div>

        <a
          href="/"
          className="mt-12 inline-block border-b-2 border-ink pb-1 font-mono text-sm uppercase tracking-[0.14em] hover:text-ink-soft"
        >
          Zurück zur Startseite ↑
        </a>
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

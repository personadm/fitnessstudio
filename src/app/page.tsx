import { LeadForm } from "@/components/LeadForm";

const STUDIO = process.env.STUDIO_NAME ?? "Studio Iron";
const ISSUE_DATE = new Date().toLocaleDateString("de-DE", { year: "numeric", month: "long" });

export default function LandingPage() {
  return (
    <main className="relative min-h-screen">
      {/* ─── Top Utility Bar ─── */}
      <header className="border-b border-ink/15">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 text-[11px] uppercase tracking-[0.14em]">
          <span className="font-mono">{STUDIO}</span>
          <span className="hidden font-mono text-muted md:inline">Ausgabe · {ISSUE_DATE}</span>
          <a href="/anmelden" className="font-mono underline underline-offset-4 hover:text-ink-soft">
            Direkt anmelden →
          </a>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative">
        <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-6 py-20 md:py-32">
          <div className="col-span-12 md:col-span-7">
            <p className="label mb-8">№ 01 — Eintragen</p>
            <h1 className="text-display text-[64px] leading-[0.95] md:text-[120px] md:leading-[0.92]">
              Stark
              <br />
              werden.
              <br />
              <span className="text-display-italic text-acid_dark">
                Stark{" "}
                <span className="relative inline-block">
                  bleiben.
                  <span className="absolute -bottom-1 left-0 h-[6px] w-full bg-acid -z-10" aria-hidden />
                </span>
              </span>
            </h1>
          </div>

          <aside className="col-span-12 md:col-span-5 md:pt-24">
            <p className="label mb-3">Was passiert</p>
            <p className="mb-12 max-w-md text-base leading-relaxed text-ink-soft">
              Trag deine Mail ein. Du bekommst sofort unsere aktuellen Tarife im Postfach – inklusive direktem
              Anmelde-Button. Kein Spam, kein Verkaufsdruck, keine versteckten Kosten.
            </p>
            <LeadForm />
          </aside>
        </div>
      </section>

      {/* ─── Stats / Proof ─── */}
      <section className="border-y border-ink/15 bg-cream">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-ink/15 px-6 md:grid-cols-4 md:divide-x">
          {[
            { value: "12", unit: "Jahre", label: "im Viertel" },
            { value: "1.840", unit: "m²", label: "Trainingsfläche" },
            { value: "24/7", unit: "", label: "für Premium" },
            { value: "16", unit: "", label: "Trainer im Team" },
          ].map((s, i) => (
            <div key={i} className="px-6 py-10 md:px-8">
              <p className="text-display text-5xl md:text-6xl">
                {s.value}
                {s.unit && <span className="ml-1 text-2xl text-muted">{s.unit}</span>}
              </p>
              <p className="label mt-3">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Editorial: Was du bekommst ─── */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-4">
            <p className="label mb-6">№ 02 — Drinnen</p>
            <h2 className="text-display text-5xl leading-[0.95] md:text-6xl">
              Was du <span className="text-display-italic">bekommst</span>.
            </h2>
          </div>
          <div className="col-span-12 grid gap-px bg-ink/15 md:col-span-8 md:grid-cols-2">
            {[
              { n: "01", title: "Geräte ohne Wartezeit", body: "Über 80 Stationen, klar zoniert, immer gewartet." },
              { n: "02", title: "Echte Trainer", body: "Studierte Sportwissenschaftler. Kein Sales auf der Fläche." },
              { n: "03", title: "Kurse, die Spaß machen", body: "Von HYROX-Prep bis Mobility – alles im Tarif Premium." },
              { n: "04", title: "Sauna & Ruhe", body: "Finnische Sauna, kalte Dusche, Ruheraum mit Tee." },
            ].map((b) => (
              <div key={b.n} className="bg-cream p-6 md:p-8">
                <p className="font-mono text-xs text-muted">{b.n}</p>
                <p className="mt-4 text-display text-2xl leading-tight">{b.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pull Quote ─── */}
      <section className="bg-ink text-cream">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <p className="label !text-acid mb-8">Stimme aus dem Studio</p>
          <blockquote className="text-display text-3xl leading-[1.15] md:text-5xl md:leading-[1.1]">
            „Ich bin reingestolpert für ein Probetraining.{" "}
            <span className="text-display-italic">Drei Jahre später</span> ist es einfach mein Studio. Niemand quatscht
            dich voll, alle nicken kurz, dann legst du los."
          </blockquote>
          <p className="mt-8 font-mono text-xs uppercase tracking-[0.14em] text-cream/60">
            — Jana K., Mitglied seit 2023
          </p>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <p className="label mb-6">Letzter Schritt</p>
        <h2 className="text-display text-5xl leading-[0.95] md:text-7xl">
          Mail rein. Tarife raus.
          <br />
          <span className="text-display-italic">In zwei Minuten.</span>
        </h2>
        <a
          href="#email"
          className="mt-10 inline-block border-b-2 border-ink pb-1 font-mono text-sm uppercase tracking-[0.14em] hover:text-ink-soft"
        >
          Zum Formular ↑
        </a>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-ink/15">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
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

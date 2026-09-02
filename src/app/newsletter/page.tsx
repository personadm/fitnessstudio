import type { Metadata } from "next";
import { NewsletterForm } from "@/components/NewsletterForm";
import { ScrollToTop } from "@/components/ScrollToTop";
import { TrackPageView } from "@/components/TrackPageView";

// Statisch — keine DB-Abfrage nötig, die Seite ist rein redaktionell.
export const metadata: Metadata = {
  title: "Sonntags-Newsletter",
  description:
    "Jeden Sonntag ein Impuls für ein gesünderes, leichteres Leben — kostenlos per E-Mail. Von deinen Gesundheitscoaches.",
};

const LOGO_URL =
  "https://static.wixstatic.com/media/fe97c9_89b309723d40451699a7888dfac8593a~mv2.png/v1/fill/w_180,h_180,al_c,q_85,enc_avif,quality_auto/Logo-FB-NEU.png";

const GREEN = "#7CAE2D";

const WHAT_YOU_GET = [
  {
    num: "№ 01",
    title: "Alltagstauglich",
    body: "Ernährungs- und Bewegungstipps, die in einen vollen Alltag passen — keine Diät-Dogmen, kein Verzicht um jeden Preis.",
  },
  {
    num: "№ 02",
    title: "Echte Geschichten",
    body: "Wie Elke, Dieter und Christel es geschafft haben. Menschen wie du, die wieder Energie und Leichtigkeit gefunden haben.",
  },
  {
    num: "№ 03",
    title: "Kleine Impulse",
    body: "Ein Gedanke pro Woche, der hängen bleibt. Kurz gelesen, sonntags in Ruhe — und über die Woche umgesetzt.",
  },
];

export default function NewsletterPage() {
  return (
    <main className="min-h-screen bg-cream">
      <ScrollToTop />
      <TrackPageView path="/newsletter" />

      {/* ─── Top Bar ─── */}
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <img
            src={LOGO_URL}
            alt="Deine Gesundheitscoaches"
            width={44}
            height={44}
            className="h-11 w-11 flex-shrink-0"
            loading="eager"
          />
          <span className="text-display text-lg tracking-tight md:text-xl">
            Deine Gesundheitscoaches
          </span>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-14 md:py-20">
          <div className="grid grid-cols-1 items-start gap-x-14 gap-y-12 lg:grid-cols-12">
            {/* Linke Spalte */}
            <div className="lg:col-span-7">
              <p className="label mb-6">Der Sonntags-Newsletter</p>

              <h1 className="text-display text-5xl leading-[0.92] tracking-tightest md:text-7xl">
                Jeden Sonntag
                <br />
                <span className="text-display-italic" style={{ color: GREEN }}>
                  ein bisschen
                  <br />
                  leichter.
                </span>
              </h1>

              <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft md:text-xl">
                Ein kurzer Impuls für mehr Energie, weniger Ballast und ein gutes
                Gefühl im eigenen Körper. Ganzheitlich, herzlich und
                alltagstauglich — direkt aus unseren Studios in dein Postfach.
              </p>

              <ul className="mt-8 space-y-3">
                {[
                  "Kostenlos & unverbindlich",
                  "Ein Impuls pro Woche — kein Postfach-Spam",
                  "Von echten Gesundheitscoaches, seit über 25 Jahren",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-cream"
                      style={{ backgroundColor: GREEN }}
                      aria-hidden
                    >
                      ✓
                    </span>
                    <span className="text-base text-ink md:text-lg">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Rechte Spalte: Formular */}
            <div className="lg:col-span-5 lg:pt-4">
              <NewsletterForm />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Was dich erwartet (schwarzer Block) ─── */}
      <section className="bg-ink text-cream">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="mb-14 max-w-2xl">
            <p className="label !text-acid mb-4">Was dich erwartet</p>
            <h2 className="text-display-italic text-5xl leading-[0.95] text-cream md:text-7xl">
              Drei Minuten,
              <br />
              die zählen.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-12 border-t border-cream/20 pt-12 md:grid-cols-3">
            {WHAT_YOU_GET.map((p) => (
              <div key={p.title}>
                <p className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-cream/60">
                  {p.num}
                </p>
                <h3 className="text-display mb-4 text-3xl text-cream md:text-4xl">
                  {p.title}
                </h3>
                <p className="leading-relaxed text-cream/80">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Abschluss-CTA ─── */}
      <section className="bg-cream">
        <div className="mx-auto max-w-2xl px-6 py-20 text-center md:py-28">
          <p className="label mb-6">Bereit?</p>
          <p className="text-display text-4xl leading-[1.05] md:text-5xl">
            Ein Klick,
            <br />
            <span className="text-display-italic">und du bist dabei.</span>
          </p>
          <a
            href="#anmelden"
            className="mt-10 inline-block border-b-2 border-ink pb-1 font-mono text-xs uppercase tracking-[0.14em] hover:text-ink-soft"
          >
            Zur Anmeldung ↑
          </a>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-ink/15 bg-cream">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          <span>© {new Date().getFullYear()} DEINE GESUNDHEITSCOACHES</span>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
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

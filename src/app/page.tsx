import { LeadForm } from "@/components/LeadForm";
import { ScrollToTop } from "@/components/ScrollToTop";
import { TrackPageView } from "@/components/TrackPageView";
import { db } from "@/lib/db";
import { getTestimonials } from "@/lib/testimonials";

// Landing-Page nicht statisch beim Build vorrendern — DB-Pool reicht nicht für 33 parallele Pages.
// Wird stattdessen bei jedem Request frisch gerendert (Supabase eu-west liefert in <100ms).
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Deine Gesundheitscoaches – JETZT GRATIS STARTEN!",
  description: "Hier bekommst du dein Gratis-Start-Angebot!",
};

const STUDIO = process.env.STUDIO_NAME ?? "Deine Gesundheitscoaches";

// Etwas tiefer/refiner als das Neon-Grün vorher
const GREEN = "#7CAE2D";

const HERO_BANNER = "/images/coaches-tina-erik.jpg";

const BENEFIT_IMAGES = [
  {
    label: "Stoffwechselanalyse",
    url: "https://static.wixstatic.com/media/fe97c9_1269ad2065dd4fc786ce82b236d7a8a3~mv2.jpg/v1/fill/w_500,h_400,al_c,q_80,enc_avif,quality_auto/fe97c9_1269ad2065dd4fc786ce82b236d7a8a3~mv2.jpg",
  },
  {
    label: "betreutes Training",
    url: "https://static.wixstatic.com/media/fe97c9_6370365bbd2e4314894c52bbb32b4642~mv2.jpg/v1/fill/w_500,h_400,al_c,q_80,enc_avif,quality_auto/fe97c9_6370365bbd2e4314894c52bbb32b4642~mv2.jpg",
  },
  {
    label: "genussvolle Ernährung",
    url: "https://static.wixstatic.com/media/fe97c9_3ace69f455f347718e5a8d67df780d4d~mv2.jpg/v1/fill/w_500,h_400,al_c,q_80,enc_avif,quality_auto/fe97c9_3ace69f455f347718e5a8d67df780d4d~mv2.jpg",
  },
  {
    label: "Regeneration",
    url: "https://static.wixstatic.com/media/fe97c9_a0de014f40c5483fb75a034f67dbaa47~mv2.jpg/v1/fill/w_500,h_400,al_c,q_80,enc_avif,quality_auto/fe97c9_a0de014f40c5483fb75a034f67dbaa47~mv2.jpg",
  },
  {
    label: "Entspannung",
    url: "https://static.wixstatic.com/media/fe97c9_a38efef76365461c8382c3aed64b8fc3~mv2.jpg/v1/fill/w_500,h_400,al_c,q_80,enc_avif,quality_auto/fe97c9_a38efef76365461c8382c3aed64b8fc3~mv2.jpg",
  },
];

const LOGO_URL =
  "https://static.wixstatic.com/media/fe97c9_89b309723d40451699a7888dfac8593a~mv2.png/v1/fill/w_180,h_180,al_c,q_85,enc_avif,quality_auto/Logo-FB-NEU.png";

export default async function LandingPage() {
  const [locations, testimonials] = await Promise.all([
    db.location.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        city: true,
        street: true,
        postalCode: true,
        phone: true,
      },
    }),
    getTestimonials(),
  ]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-cream">
      <ScrollToTop />
      <TrackPageView path="/" />
      {/* ─── Top Bar ─── */}
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-6 md:py-4 text-[11px] uppercase tracking-[0.14em]">
          <span className="font-mono">{STUDIO}</span>
          <a
            href="#anmelde-bereich"
            className="font-mono underline underline-offset-4 hover:text-ink-soft -my-2 py-2 -mx-2 px-2"
          >
            Direkt anmelden →
          </a>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section>
        <div className="mx-auto max-w-7xl px-5 md:px-6 py-12 md:py-24">
          {/* Logo: mobile zentral oben, Desktop in rechter Spalte */}
          <div className="flex justify-center md:hidden mb-8">
            <img
              src={LOGO_URL}
              alt="Deine Gesundheitscoaches"
              width={120}
              height={120}
              className="h-24 w-24"
              loading="eager"
            />
          </div>

          <div className="grid grid-cols-12 gap-x-4 gap-y-10 md:gap-x-16 md:gap-y-12">
            {/* Left */}
            <div className="col-span-12 lg:col-span-7 text-center md:text-left">
              <p className="label mb-4 md:mb-6" style={{ color: GREEN }}>
                Ganzheitlich Fit
              </p>
              <h1
                className="text-display-italic text-4xl leading-[1.05] sm:text-5xl md:text-[88px] md:leading-[0.95]"
                style={{ color: GREEN }}
              >
                Dein Gratis
                <br />
                Start-Angebot
                <br />
                per Email
              </h1>

              <p className="mt-6 mx-auto max-w-md text-display text-lg leading-relaxed text-ink-soft sm:text-xl md:mt-10 md:mx-0 md:max-w-xl md:text-2xl">
                Wohlfühlfigur, schmerzfreie Gelenke, neue Energie — ganzheitlich, ohne Diätstress
                und ohne Leistungsdruck.
              </p>

              <ul className="mt-8 space-y-4 md:mt-12 md:space-y-5">
                {["Wohlfühlfigur", "Schmerzfreie Gelenke", "Mehr Energie"].map((item) => (
                    <li
                      key={item}
                      className="flex items-center justify-center gap-3 text-xl sm:text-2xl md:justify-start md:gap-4 md:text-3xl"
                      style={{ color: GREEN }}
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 md:h-3 md:w-3"
                        style={{ backgroundColor: GREEN }}
                        aria-hidden
                      />
                      <span className="text-display">{item}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* Right */}
            <div className="col-span-12 lg:col-span-5">
              {/* Logo nur auf Desktop in dieser Spalte */}
              <div className="hidden md:flex md:mb-8 md:justify-end">
                <img
                  src={LOGO_URL}
                  alt="Deine Gesundheitscoaches"
                  width={120}
                  height={120}
                  className="md:h-28 md:w-28"
                  loading="eager"
                />
              </div>

              <div className="space-y-5 md:space-y-6">
                <div className="text-center md:text-left">
                  <p className="label mb-2 md:mb-3">Was passiert</p>
                  <p className="mx-auto max-w-md text-[15px] leading-relaxed text-ink-soft md:mx-0 md:max-w-none md:text-base">
                    Trag deine Mail ein. Du bekommst sofort unsere aktuellen Angebote in dein
                    Postfach – inklusive direktem Anmelde-Button mit einem tollen Angebot für
                    deinen Gratis-Start. Kein Spam, kein Verkaufsdruck, keine versteckten Kosten.
                  </p>
                </div>
                <LeadForm locations={locations} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials (schwarz) ─── */}
      <section className="bg-ink text-cream">
        <div className="mx-auto max-w-7xl px-5 md:px-6 py-16 md:py-24">
          <div className="mb-10 max-w-2xl text-center md:mb-12 md:text-left">
            <p className="label !text-acid mb-3 md:mb-4">Das sagen unsere Kunden</p>
            <h2 className="text-display-italic text-cream text-5xl leading-[0.95] sm:text-6xl md:text-7xl">
              Echte
              <br />
              Erfolge.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-5">
            {testimonials.map((t) => (
              <article key={t.name} className="bg-cream text-ink p-5 flex flex-col text-center sm:text-left sm:p-4">
                <img
                  src={t.imageUrl}
                  alt={t.name}
                  className="aspect-square w-full object-cover mb-4 md:mb-4"
                  loading="lazy"
                />
                <h3 className="text-display text-lg font-medium leading-tight sm:text-base">{t.name}</h3>
                <p className="mt-1 text-xs text-muted">
                  Alter: {t.age} - {t.city}
                </p>
                <p className="mt-4 text-base leading-relaxed text-display italic sm:text-sm">„{t.quote}"</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Cinematic Image Band ─── */}
      <section className="relative w-full overflow-hidden bg-ink">
        <div className="relative aspect-[16/9] md:aspect-[2/1]">
          <img
            src={HERO_BANNER}
            alt="Tina & Erik Bodon — Eure Gesundheitscoaches"
            className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/20 to-transparent" />
          <div className="relative z-10 flex h-full items-end">
            <div className="mx-auto w-full max-w-7xl px-5 pb-8 text-center md:px-6 md:pb-16 md:text-left">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-cream/80 mb-3 sm:text-xs sm:mb-4">
                Seit 2008 · Persönlich, herzlich, kompetent
              </p>
              <p className="text-display-italic text-cream text-4xl leading-[1] sm:text-5xl md:text-7xl">
                Tina &amp; Erik Bodon.
                <br />
                Deine Gesundheitscoaches.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── So arbeiten wir (grüner Block) ─── */}
      <section style={{ backgroundColor: GREEN }}>
        <div className="mx-auto max-w-7xl px-5 md:px-6 py-16 md:py-28">
          <div className="grid grid-cols-12 gap-6 mb-12 text-center md:gap-8 md:mb-16 md:text-left">
            <div className="col-span-12 md:col-span-5">
              <p className="label !text-cream/70 mb-3 md:mb-4">Unser Weg</p>
              <h2 className="text-display-italic text-cream text-5xl leading-[0.95] sm:text-6xl md:text-7xl">
                Der
                <br />
                ganzheitliche
                <br />
                Weg.
              </h2>
            </div>
            <div className="col-span-12 md:col-span-6 md:col-start-7 flex items-end justify-center md:justify-start">
              <p className="mx-auto max-w-md text-cream/95 text-lg leading-relaxed text-display sm:text-xl md:mx-0 md:max-w-none">
                Unsere Methode verbindet Ernährung, Bewegung, Stressregulation und Regeneration.
                Damit du leichter abnimmst, schmerzfrei durch den Alltag kommst und wieder
                Energie für Beruf, Familie und Freizeit hast.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-12 border-t border-cream/30 pt-12 text-center md:grid-cols-3 md:gap-12 md:pt-12 md:text-left">
            {[
              {
                num: "№ 01",
                title: "Ganzheitlich",
                body: "Vier Säulen, die zusammen wirken: Ernährung, Bewegung, Stressregulation, Regeneration. Angepasst auf deine Bedürfnisse.",
              },
              {
                num: "№ 02",
                title: "Persönlich",
                body: "Echte Gesundheitscoaches unterstützen dich dort wo du Hilfe benötigst – alltagstauglich, einfach und sinnvoll. Menschen helfen Menschen.",
              },
              {
                num: "№ 03",
                title: "Kompetent",
                body: "Von der Analyse bis zur kompletten Umsetzung. Immer gut betreut, immer ansprechbar — wir sind für dich da.",
              },
            ].map((p) => (
              <div key={p.title}>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-cream/70 mb-3 md:mb-3">
                  {p.num}
                </p>
                <h3 className="text-display text-cream text-3xl mb-4 sm:text-4xl md:text-4xl md:mb-4">{p.title}</h3>
                <p className="mx-auto max-w-md text-cream/90 text-base leading-relaxed md:mx-0 md:max-w-none md:text-base">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5-Bilder-Grid ─── */}
      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-5 md:px-6 py-16 md:py-20">
          <div className="mb-10 max-w-2xl text-center md:mb-10 md:text-left">
            <p className="label mb-3 md:mb-4">Im Studio</p>
            <h2 className="text-display text-3xl leading-[1] sm:text-4xl md:text-5xl">
              Fünf Bausteine.
              <br />
              <span className="text-display-italic" style={{ color: GREEN }}>
                Ein System.
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-5">
            {BENEFIT_IMAGES.map((b) => (
              <div key={b.label} className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={b.url}
                  alt={b.label}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <p className="absolute bottom-4 left-4 right-4 text-cream text-display text-xl leading-tight sm:text-lg md:text-xl">
                  {b.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Standorte + CTA ─── */}
      <section className="bg-cream">
        <div className="mx-auto max-w-2xl px-5 py-20 text-center md:px-6 md:py-28">
          <p className="label mb-4 md:mb-6">Letzter Schritt</p>
          <p className="text-display text-4xl leading-[1.1] sm:text-5xl md:text-5xl">
            Mail rein,
            <br />
            Angebot raus,
            <br />
            <span className="text-display-italic">los geht's.</span>
          </p>
          <a
            href="#anmelde-bereich"
            className="mt-10 inline-block border-b-2 border-ink pb-1 font-mono text-xs uppercase tracking-[0.14em] hover:text-ink-soft -mx-2 px-2 md:mt-10"
          >
            Zum Formular ↑
          </a>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-ink/15 bg-cream">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-5 py-6 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:text-left md:px-6 md:py-6">
          <span>
            © {new Date().getFullYear()} DEINE GESUNDHEITSCOACHES
          </span>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 sm:gap-x-6">
            <a href="/impressum" className="hover:text-ink -my-1 py-1">
              Impressum
            </a>
            <a href="/datenschutz" className="hover:text-ink -my-1 py-1">
              Datenschutz
            </a>
            <a href="/agb" className="hover:text-ink -my-1 py-1">
              AGB
            </a>
            <a href="/teilnahmebedingungen" className="hover:text-ink -my-1 py-1">
              Teilnahmebedingungen
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}

type LocSummary = {
  name: string;
  city: string | null;
  street: string | null;
  postalCode: string | null;
  phone: string | null;
};

function LocationBlock({ loc, alignRight }: { loc: LocSummary; alignRight?: boolean }) {
  const className = alignRight ? "text-left md:text-right" : "text-left";
  const displayName = /^club/i.test(loc.name)
    ? loc.name.toUpperCase()
    : `CLUB ${loc.name.toUpperCase()}`;

  return (
    <div className={className}>
      <p className="font-mono text-xs uppercase tracking-[0.12em]" style={{ color: GREEN }}>
        {displayName}
      </p>
      {loc.street && <p className="mt-2 text-base text-display">{loc.street}</p>}
      {(loc.postalCode || loc.city) && (
        <p className="text-base text-display text-ink-soft">
          {loc.postalCode} {loc.city}
        </p>
      )}
      {loc.phone && (
        <a
          href={`tel:${loc.phone.replace(/\s/g, "")}`}
          className="mt-3 inline-block font-mono text-sm hover:underline"
        >
          Tel: {loc.phone}
        </a>
      )}
    </div>
  );
}

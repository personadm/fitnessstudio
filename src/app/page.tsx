import { LeadForm } from "@/components/LeadForm";
import { ScrollToTop } from "@/components/ScrollToTop";
import { TrackPageView } from "@/components/TrackPageView";
import { MetaPixel } from "@/components/MetaPixel";
import { db } from "@/lib/db";
import { getTestimonials, TESTIMONIALS } from "@/lib/testimonials";

// Live-Daten (Standorte) → pro Request server-rendern statt beim Build statisch
// vorrendern. Verhindert DB-Zugriffe während `next build` (Deploy bricht sonst
// ab, wenn der DB-Pooler keine freie Verbindung hat).
export const dynamic = "force-dynamic";

const STUDIO = process.env.STUDIO_NAME ?? "Studio Iron";

// Etwas tiefer/refiner als das Neon-Grün vorher
const GREEN = "#7CAE2D";

// Neue Akzentfarbe für Hero & Form (Briefing Mai 2026)
const PETROL = "#0F6E56";

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
  let locations: {
    id: string;
    name: string;
    city: string | null;
    street: string | null;
    postalCode: string | null;
    phone: string | null;
  }[] = [];
  let testimonials: Awaited<ReturnType<typeof getTestimonials>> = TESTIMONIALS;

  try {
    [locations, testimonials] = await Promise.all([
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
  } catch (err) {
    // DB kurz nicht erreichbar → Seite trotzdem ausliefern (mit Fallback-Daten),
    // statt die gesamte Startseite mit einem 500er abstürzen zu lassen.
    console.error("[LandingPage] Daten konnten nicht geladen werden:", err);
  }

  return (
    <main className="min-h-screen bg-cream">
      {/* Erzwingt Seitenstart oben — überschreibt #email-Anker (QR-Code/Wix),
          damit Scanner zuerst Hero + Nutzen sehen, nicht direkt das Formular. */}
      <ScrollToTop />
      {/* Meta-/Facebook-Pixel (Basis + PageView) */}
      <MetaPixel />
      {/* Zählt den Seitenaufruf (schreibt PageView fürs Admin-Dashboard) */}
      <TrackPageView path="/" />

      {/* ─── Top Bar (Logo + Studio-Name, kein Anmelden-Link mehr) ─── */}
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          <img
            src={LOGO_URL}
            alt="Deine Gesundheitscoaches"
            width={44}
            height={44}
            className="h-11 w-11 flex-shrink-0"
            loading="eager"
          />
          <span
            className="text-lg font-semibold tracking-tight md:text-xl"
            style={{ color: PETROL }}
          >
            Deine Gesundheitscoaches
          </span>
        </div>
      </header>

      {/* ─── HERO (Bild-1 Vorlage) ─── */}
      <section>
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16 lg:py-20">
          <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
            {/* Linke Spalte: Text-Inhalt */}
            <div className="lg:col-span-7">
              {/* Pille */}
              <div
                className="inline-block rounded-full px-4 py-2 text-sm font-medium"
                style={{
                  backgroundColor: "rgba(15,110,86,0.08)",
                  color: PETROL,
                }}
              >
                Seit über 25 Jahren · über 6.000 Menschen begleitet
              </div>

              {/* H1 */}
              <h1 className="mt-7 text-4xl font-bold leading-[1.1] tracking-tight text-[#2C2C2A] md:text-5xl lg:text-[3.5rem]">
                Abnehmen, das endlich bleibt — ohne Hungern und ohne Diätstress.
              </h1>

              {/* Grüne Betonungszeile */}
              <p
                className="mt-5 text-xl font-semibold leading-snug md:text-2xl"
                style={{ color: PETROL }}
              >
                Auch wenn bisher jede Diät gescheitert ist.
              </p>

              {/* Fließtext */}
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#5F5E5A] md:text-lg">
                Ganzheitlich und ohne Leistungsdruck — für mehr Energie, weniger
                Schmerzen und ein gutes Gefühl im eigenen Körper. Deinen
                Gratis-Start-Plan bekommst du sofort per Mail — kein Anruf, kein Druck.
              </p>

              {/* 3 Beweis-Punkte mit Häkchen */}
              <ul className="mt-7 space-y-3">
                {[
                  "Bis zu 15 kg leichter — wie Elke (47)",
                  "9 kg runter, wieder voller Energie — wie Dieter (60)",
                  "10 kg leichter & endlich schmerzfrei — wie Christel (69)",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: "rgba(15,110,86,0.1)",
                        color: PETROL,
                      }}
                      aria-hidden
                    >
                      ✓
                    </span>
                    <span className="text-base leading-snug text-[#2C2C2A] md:text-lg">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Gold-Hinweis-Pille */}
              <div
                className="mt-8 inline-flex items-center gap-3 rounded-xl px-4 py-3"
                style={{
                  backgroundColor: "#FAEEDA",
                  color: "#854F0B",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path
                    d="M12 1l3 6 6 1-4.5 4.5L18 19l-6-3-6 3 1.5-6.5L3 8l6-1 3-6z"
                    fill="currentColor"
                    opacity="0.15"
                  />
                  <path
                    d="M12 2l2.39 4.84L20 7.66l-4 3.9.94 5.46L12 14.42l-4.94 2.6.94-5.46-4-3.9 5.61-.82L12 2z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm font-semibold leading-snug">
                  Von gesetzlichen Krankenkassen bezuschusst
                </span>
              </div>
            </div>

            {/* Rechte Spalte: Formular-Karte */}
            <div className="lg:col-span-5">
              <LeadForm locations={locations} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials (schwarz) ─── */}
      <section className="bg-ink text-cream">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
          <div className="mb-12 max-w-2xl">
            <p className="label !text-acid mb-4">Das sagen unsere Kunden</p>
            <h2 className="text-display-italic text-cream text-5xl leading-[0.95] md:text-7xl">
              Echte
              <br />
              Erfolge.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {testimonials.map((t) => (
              <article key={t.name} className="bg-cream text-ink p-4 flex flex-col">
                <img
                  src={t.imageUrl}
                  alt={t.name}
                  className="aspect-square w-full object-cover mb-4"
                  loading="lazy"
                />
                <h3 className="text-display text-base font-medium leading-tight">{t.name}</h3>
                <p className="mt-1 text-xs text-muted">
                  Alter: {t.age} - {t.city}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-display italic">„{t.quote}"</p>
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
            <div className="mx-auto w-full max-w-7xl px-6 pb-8 md:pb-16">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-cream/80 mb-4">
                Seit 2008 · Persönlich, herzlich, kompetent
              </p>
              <p className="text-display-italic text-cream text-4xl leading-[1] md:text-7xl">
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
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="grid grid-cols-12 gap-8 mb-16">
            <div className="col-span-12 md:col-span-5">
              <p className="label !text-cream/70 mb-4">Unser Weg</p>
              <h2 className="text-display-italic text-cream text-5xl md:text-7xl leading-[0.95]">
                Der
                <br />
                ganzheitliche
                <br />
                Weg.
              </h2>
            </div>
            <div className="col-span-12 md:col-span-6 md:col-start-7 flex items-end">
              <p className="text-cream/95 text-lg md:text-xl leading-relaxed text-display">
                Unsere Methode verbindet Ernährung, Bewegung, Stressregulation und Regeneration.
                Damit du leichter abnimmst, schmerzfrei durch den Alltag kommst und wieder
                Energie für Beruf, Familie und Freizeit hast.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-12 md:grid-cols-3 border-t border-cream/30 pt-12">
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
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-cream/70 mb-3">
                  {p.num}
                </p>
                <h3 className="text-display text-cream text-3xl md:text-4xl mb-4">{p.title}</h3>
                <p className="text-cream/90 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5-Bilder-Grid ─── */}
      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="mb-10 max-w-2xl">
            <p className="label mb-4">Im Studio</p>
            <h2 className="text-display text-3xl leading-[1] md:text-5xl">
              Fünf Bausteine.
              <br />
              <span className="text-display-italic" style={{ color: GREEN }}>
                Ein System.
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {BENEFIT_IMAGES.map((b) => (
              <div key={b.label} className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={b.url}
                  alt={b.label}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <p className="absolute bottom-4 left-4 right-4 text-cream text-display text-lg md:text-xl leading-tight">
                  {b.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Standorte + CTA ─── */}
      <section className="bg-cream">
        <div className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
          <p className="label mb-6">Letzter Schritt</p>
          <p className="text-display text-4xl leading-[1.1] md:text-5xl">
            Mail rein,
            <br />
            Angebot raus,
            <br />
            <span className="text-display-italic">los geht's.</span>
          </p>
          <a
            href="#email"
            className="mt-10 inline-block border-b-2 border-ink pb-1 font-mono text-xs uppercase tracking-[0.14em] hover:text-ink-soft"
          >
            Zum Formular ↑
          </a>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-ink/15 bg-cream">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          <span>
            © {new Date().getFullYear()} DEINE GESUNDHEITSCOACHES
          </span>
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
            <a href="/teilnahmebedingungen" className="hover:text-ink">
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

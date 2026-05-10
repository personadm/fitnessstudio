import { LeadForm } from "@/components/LeadForm";
import { db } from "@/lib/db";
import { getTestimonials } from "@/lib/testimonials";

const STUDIO = process.env.STUDIO_NAME ?? "Studio Iron";

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
    <main className="min-h-screen bg-cream">
      {/* ─── Top Bar ─── */}
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 text-[11px] uppercase tracking-[0.14em]">
          <span className="font-mono">{STUDIO}</span>
          <a
            href="#email"
            className="font-mono underline underline-offset-4 hover:text-ink-soft"
          >
            Direkt anmelden →
          </a>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section>
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="grid grid-cols-12 gap-x-10 gap-y-12 md:gap-x-16">
            {/* Left */}
            <div className="col-span-12 lg:col-span-7">
              <p className="label mb-6" style={{ color: GREEN }}>
                Ganzheitlich Fit
              </p>
              <h1
                className="text-display-italic text-6xl leading-[1] md:text-[110px] md:leading-[0.95]"
                style={{ color: GREEN }}
              >
                Unser Angebot
                <br />
                per Email
              </h1>

              <p className="mt-10 max-w-xl text-display text-xl leading-relaxed text-ink-soft md:text-2xl">
                Wohlfühlfigur, schmerzfreie Gelenke, neue Energie — ganzheitlich, ohne Diätstress
                und ohne Leistungsdruck.
              </p>

              <ul className="mt-12 space-y-5">
                {["Wohlfühlfigur", "Schmerzfreie Gelenke", "Mehr Energie"].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-4 text-2xl md:text-3xl"
                      style={{ color: GREEN }}
                    >
                      <span
                        className="inline-block h-3 w-3 rounded-full flex-shrink-0"
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
              <div className="mb-8 flex justify-end">
                <img
                  src={LOGO_URL}
                  alt="Deine Gesundheitscoaches"
                  width={120}
                  height={120}
                  className="h-24 w-24 md:h-28 md:w-28"
                  loading="eager"
                />
              </div>

              <div className="space-y-6">
                <div>
                  <p className="label mb-3">Was passiert</p>
                  <p className="text-base leading-relaxed text-ink-soft">
                    Trag deine Mail ein. Du bekommst sofort unsere aktuellen Tarife in dein
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
                Seit 2008 · Persönlich vor Ort
              </p>
              <p className="text-display-italic text-cream text-3xl leading-[1] md:text-7xl">
                Tina &amp; Erik.
                <br />
                Eure Gesundheitscoaches.
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
                Unsere Methode verbindet Ernährung, Bewegung, Entgiftung und Regeneration. Damit
                du leichter abnimmst, schmerzfrei durch den Alltag kommst und wieder Energie für
                Beruf, Familie und Freizeit hast.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-12 md:grid-cols-3 border-t border-cream/30 pt-12">
            {[
              {
                num: "№ 01",
                title: "Ganzheitlich",
                body: "Vier Säulen, die zusammen wirken: Ernährung, Bewegung, Entgiftung, Regeneration. Wir ziehen alle gleichzeitig durch — nicht nur eine.",
              },
              {
                num: "№ 02",
                title: "Persönlich",
                body: "Echte Coaches, die mit dir trainieren, beraten und an deiner Seite bleiben. Statt App im Vakuum bekommst du einen Plan, der zu dir passt.",
              },
              {
                num: "№ 03",
                title: "Lokal",
                body: "Zwei Studios im Westmünsterland: Villa-Fit Ahaus und Vital-Fit Ochtrup. Komm vorbei, statt nur online zu klicken.",
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
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:items-center">
            <div className="md:text-left">
              {locations[0] ? (
                <LocationBlock loc={locations[0]} />
              ) : (
                <div className="text-sm text-muted">— kein Standort angelegt —</div>
              )}
            </div>

            <div className="text-center">
              <p className="label mb-6">Letzter Schritt</p>
              <p className="text-display text-3xl leading-[1.1] md:text-4xl">
                Mail rein.
                <br />
                Tarife raus.
                <br />
                <span className="text-display-italic">Jetzt starten.</span>
              </p>
              <a
                href="#email"
                className="mt-8 inline-block border-b-2 border-ink pb-1 font-mono text-xs uppercase tracking-[0.14em] hover:text-ink-soft"
              >
                Zum Formular ↑
              </a>
            </div>

            <div className="md:text-right">
              {locations[1] ? (
                <LocationBlock loc={locations[1]} alignRight />
              ) : (
                <div className="text-sm text-muted">— zweiten Standort im Admin anlegen —</div>
              )}
            </div>
          </div>

          {locations.length > 2 && (
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 border-t border-ink/15 pt-12">
              {locations.slice(2).map((loc) => (
                <LocationBlock key={loc.id} loc={loc} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-ink/15 bg-cream">
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

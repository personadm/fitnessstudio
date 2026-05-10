import { LeadForm } from "@/components/LeadForm";
import { db } from "@/lib/db";
import { TESTIMONIALS } from "@/lib/testimonials";

const STUDIO = process.env.STUDIO_NAME ?? "Studio Iron";

// Bilder vom Wix-CDN — stabile URLs.
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
  const locations = await db.location.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, city: true, street: true, postalCode: true, phone: true },
  });

  return (
    <main className="min-h-screen bg-cream">
      {/* ─── HERO ─── */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-6 pt-12 pb-20 md:pt-16 md:pb-24">
          <div className="grid grid-cols-12 gap-8">
            {/* Linke Spalte: Headline + Bullets */}
            <div className="col-span-12 md:col-span-7">
              <h1
                className="text-display-italic text-[#9CC230] text-[56px] leading-[1] md:text-[88px] md:leading-[1.05]"
              >
                Unser Angebot
                <br />
                per Email
              </h1>

              <ul className="mt-12 space-y-4 md:space-y-5">
                {["Wohlfühlfigur", "Weniger Gelenkbeschwerden", "Wieder fit werden"].map(
                  (item) => (
                    <li
                      key={item}
                      className="flex items-center gap-4 text-[#9CC230] text-2xl md:text-3xl"
                    >
                      <span
                        className="inline-block h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-[#9CC230] flex-shrink-0"
                        aria-hidden
                      />
                      <span className="font-medium">{item}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* Rechte Spalte: Logo + Form */}
            <div className="col-span-12 md:col-span-5">
              {/* Logo */}
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

              {/* Was passiert + Form */}
              <div className="space-y-6">
                <div>
                  <p className="label mb-3">Was passiert</p>
                  <p className="text-base leading-relaxed text-ink-soft">
                    Trag deine Mail ein. Du bekommst sofort unsere aktuellen Tarife in dein
                    Postfach – inklusive direktem Anmelde-Button mit einem tollen Angebot für deinen
                    Gratis-Start. Kein Spam, kein Verkaufsdruck, keine versteckten Kosten.
                  </p>
                </div>

                <LeadForm locations={locations} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS (schwarzer Hintergrund) ─── */}
      <section className="bg-ink text-cream">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {TESTIMONIALS.map((t) => (
              <article
                key={t.name}
                className="bg-cream text-ink p-4 flex flex-col"
              >
                <img
                  src={t.imageUrl}
                  alt={t.name}
                  className="aspect-square w-full object-cover mb-4"
                  loading="lazy"
                />
                <h3 className="text-base font-medium leading-tight">{t.name}</h3>
                <p className="mt-1 text-xs text-muted">
                  Alter: {t.age} - {t.city}
                </p>
                <p className="mt-4 text-sm leading-relaxed italic">„{t.quote}"</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5-Bilder-Grid mit Overlay-Labels ─── */}
      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {BENEFIT_IMAGES.map((b) => (
              <div key={b.label} className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={b.url}
                  alt={b.label}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <p className="absolute bottom-4 left-4 right-4 text-cream text-lg md:text-xl font-medium leading-tight">
                  {b.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Bottom: Standorte + CTA ─── */}
      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:items-center">
            {/* Linker Standort */}
            <div className="md:text-left">
              {locations[0] ? (
                <LocationBlock loc={locations[0]} />
              ) : (
                <div className="text-sm text-muted">— kein Standort angelegt —</div>
              )}
            </div>

            {/* Center CTA */}
            <div className="text-center">
              <p className="label mb-6">Letzter Schritt</p>
              <p className="text-display text-3xl md:text-4xl leading-[1.1]">
                Mail rein.
                <br />
                Tarife raus.
                <br />
                <span className="text-display-italic">Let's go.</span>
              </p>
              <a
                href="#email"
                className="mt-8 inline-block border-b-2 border-ink pb-1 font-mono text-xs uppercase tracking-[0.14em] hover:text-ink-soft"
              >
                Zum Formular ↑
              </a>
            </div>

            {/* Rechter Standort */}
            <div className="md:text-right">
              {locations[1] ? (
                <LocationBlock loc={locations[1]} alignRight />
              ) : (
                <div className="text-sm text-muted">— zweiten Standort im Admin anlegen —</div>
              )}
            </div>
          </div>

          {/* Falls 3+ Standorte: weitere unter den 3-Spalten */}
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
  // Name hochstellen, "CLUB" voranstellen wenn nicht schon enthalten
  const displayName = /^club/i.test(loc.name)
    ? loc.name.toUpperCase()
    : `CLUB ${loc.name.toUpperCase()}`;

  return (
    <div className={className}>
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-acid_dark">
        {displayName}
      </p>
      {loc.street && <p className="mt-2 text-base">{loc.street}</p>}
      {(loc.postalCode || loc.city) && (
        <p className="text-base text-ink-soft">
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

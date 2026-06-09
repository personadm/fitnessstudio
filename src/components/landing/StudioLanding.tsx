import { StudioLeadForm } from "./StudioLeadForm";
import { TrackPageView } from "@/components/TrackPageView";
import type { LandingContent } from "@/lib/landing";

type StudioInfo = {
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
};

type LocationOption = {
  id: string;
  name: string;
  city: string | null;
};

/** Wandelt #RRGGBB in rgba() mit Alpha um (Fallback: Eingabe unverändert). */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function StudioLanding({
  studio,
  content,
  locations,
}: {
  studio: StudioInfo;
  content: LandingContent;
  locations: LocationOption[];
}) {
  // primaryColor = Marke (Buttons, Pillen, Häkchen) · accentColor = Akzent (Flächen)
  const brand = studio.primaryColor || "#0F6E56";
  const accent = studio.accentColor || "#7CAE2D";

  return (
    <main className="min-h-screen bg-cream">
      <TrackPageView path={`/s/${studio.slug}`} />

      {/* ─── Top Bar (Logo + Studio-Name) ─── */}
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          {studio.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={studio.logoUrl}
              alt={studio.name}
              width={44}
              height={44}
              className="h-11 w-11 flex-shrink-0 object-contain"
              loading="eager"
            />
          ) : (
            <span
              className="grid h-11 w-11 flex-shrink-0 place-items-center font-mono text-sm font-bold text-white"
              style={{ background: brand }}
            >
              {studio.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span
            className="text-lg font-semibold tracking-tight md:text-xl"
            style={{ color: brand }}
          >
            {studio.name}
          </span>
          <a
            href="#email"
            className="ml-auto rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            style={{ background: brand }}
          >
            Loslegen →
          </a>
        </div>
      </header>

      {/* ─── HERO (Split: Text links, Formular rechts) ─── */}
      <section>
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16 lg:py-20">
          <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
            {/* Linke Spalte: Text */}
            <div className="lg:col-span-7">
              {content.trustBadge && (
                <div
                  className="inline-block rounded-full px-4 py-2 text-sm font-medium"
                  style={{ backgroundColor: withAlpha(brand, 0.08), color: brand }}
                >
                  {content.trustBadge}
                </div>
              )}

              <h1
                className={`text-4xl font-bold leading-[1.1] tracking-tight text-[#2C2C2A] md:text-5xl lg:text-[3.5rem] ${
                  content.trustBadge ? "mt-7" : ""
                }`}
              >
                {content.headline}
              </h1>

              {content.subheadline && (
                <p
                  className="mt-5 text-xl font-semibold leading-snug md:text-2xl"
                  style={{ color: brand }}
                >
                  {content.subheadline}
                </p>
              )}

              {content.intro && (
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#5F5E5A] md:text-lg">
                  {content.intro}
                </p>
              )}

              {content.heroBullets.length > 0 && (
                <ul className="mt-7 space-y-3">
                  {content.heroBullets.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span
                        className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: withAlpha(brand, 0.1), color: brand }}
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
              )}

              {content.kassenBadge && (
                <div
                  className="mt-8 inline-flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ backgroundColor: "#FAEEDA", color: "#854F0B" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path
                      d="M12 2l2.39 4.84L20 7.66l-4 3.9.94 5.46L12 14.42l-4.94 2.6.94-5.46-4-3.9 5.61-.82L12 2z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-sm font-semibold leading-snug">{content.kassenBadge}</span>
                </div>
              )}
            </div>

            {/* Rechte Spalte: Formular-Karte */}
            <div className="lg:col-span-5">
              <StudioLeadForm
                studioSlug={studio.slug}
                locations={locations}
                title={content.formTitle}
                subtitle={content.formSubtitle}
                ctaLabel={content.ctaLabel}
                brandColor={brand}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials (schwarz) ─── */}
      {content.testimonials.length > 0 && (
        <section className="bg-ink text-cream">
          <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
            <div className="mb-12 max-w-2xl">
              <p className="label !text-acid mb-4">{content.testimonialsLabel}</p>
              <h2 className="text-display-italic text-cream text-5xl leading-[0.95] md:text-7xl">
                {content.testimonialsHeadline}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {content.testimonials.map((t) => (
                <article key={t.name} className="bg-cream text-ink p-4 flex flex-col">
                  {t.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.imageUrl}
                      alt={t.name}
                      className="aspect-square w-full object-cover mb-4"
                      loading="lazy"
                    />
                  )}
                  <h3 className="text-display text-base font-medium leading-tight">{t.name}</h3>
                  {(t.age || t.city) && (
                    <p className="mt-1 text-xs text-muted">
                      {[t.age, t.city].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <p className="mt-4 text-sm leading-relaxed text-display italic">„{t.quote}"</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Cinematic Bild-Band ─── */}
      {content.bandImageUrl && (
        <section className="relative w-full overflow-hidden bg-ink">
          <div className="relative aspect-[16/9] md:aspect-[2/1]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={content.bandImageUrl}
              alt={content.bandCaption || studio.name}
              className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/20 to-transparent" />
            <div className="relative z-10 flex h-full items-end">
              <div className="mx-auto w-full max-w-7xl px-6 pb-8 md:pb-16">
                {content.bandEyebrow && (
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-cream/80 mb-4">
                    {content.bandEyebrow}
                  </p>
                )}
                {content.bandCaption && (
                  <p className="text-display-italic text-cream text-4xl leading-[1] md:text-7xl">
                    {content.bandCaption}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── So arbeiten wir (Akzent-Block) ─── */}
      {content.processSteps.length > 0 && (
        <section style={{ backgroundColor: accent }}>
          <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
            <div className="grid grid-cols-12 gap-8 mb-16">
              <div className="col-span-12 md:col-span-5">
                <p className="label !text-cream/70 mb-4">{content.processLabel}</p>
                <h2 className="text-display-italic text-cream text-5xl md:text-7xl leading-[0.95]">
                  {content.processHeadline}
                </h2>
              </div>
              {content.processIntro && (
                <div className="col-span-12 md:col-span-6 md:col-start-7 flex items-end">
                  <p className="text-cream/95 text-lg md:text-xl leading-relaxed text-display">
                    {content.processIntro}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-12 md:grid-cols-3 border-t border-cream/30 pt-12">
              {content.processSteps.map((p, i) => (
                <div key={p.title}>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-cream/70 mb-3">
                    № {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="text-display text-cream text-3xl md:text-4xl mb-4">{p.title}</h3>
                  <p className="text-cream/90 leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Bilder-Grid ─── */}
      {content.gridImages.length > 0 && (
        <section className="bg-cream">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
            <div className="mb-10 max-w-2xl">
              <p className="label mb-4">{content.gridLabel}</p>
              {(content.gridHeadline || content.gridHeadlineAccent) && (
                <h2 className="text-display text-3xl leading-[1] md:text-5xl">
                  {content.gridHeadline}
                  {content.gridHeadlineAccent && (
                    <>
                      <br />
                      <span className="text-display-italic" style={{ color: accent }}>
                        {content.gridHeadlineAccent}
                      </span>
                    </>
                  )}
                </h2>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {content.gridImages.map((b) => (
                <div key={b.url} className="relative aspect-[4/5] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.url}
                    alt={b.label}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  {b.label && (
                    <p className="absolute bottom-4 left-4 right-4 text-cream text-display text-lg md:text-xl leading-tight">
                      {b.label}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Abschluss-CTA ─── */}
      <section className="bg-cream">
        <div className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
          <p className="label mb-6">Letzter Schritt</p>
          <p className="text-display text-4xl leading-[1.1] md:text-5xl">
            {content.closingHeadline}
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
          <span>© {new Date().getFullYear()} {studio.name.toUpperCase()}</span>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <a href="/impressum" className="hover:text-ink">Impressum</a>
            <a href="/datenschutz" className="hover:text-ink">Datenschutz</a>
            <a href="/agb" className="hover:text-ink">AGB</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}

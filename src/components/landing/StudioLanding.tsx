import { Reveal } from "./Reveal";
import { StudioLeadForm } from "./StudioLeadForm";
import { TrackPageView } from "@/components/TrackPageView";
import type { LandingContent } from "@/lib/landing";
import type { BillingInterval } from "@prisma/client";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  billingInterval: BillingInterval;
  highlights: string[];
};

type StudioInfo = {
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
};

const INTERVAL_LABEL: Record<BillingInterval, string> = {
  MONATLICH: "/ Monat",
  QUARTALSWEISE: "/ Quartal",
  HALBJAEHRLICH: "/ Halbjahr",
  JAEHRLICH: "/ Jahr",
  EINMALIG: "einmalig",
};

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function StudioLanding({
  studio,
  content,
  plans,
}: {
  studio: StudioInfo;
  content: LandingContent;
  plans: Plan[];
}) {
  const brand = studio.primaryColor || "#0F6E56";
  const accent = studio.accentColor || "#7CAE2D";

  return (
    <main className="min-h-screen bg-cream text-ink">
      <TrackPageView path={`/s/${studio.slug}`} />

      {/* Lokale Keyframes (sanftes Schweben der Akzent-Form) */}
      <style>{`@keyframes studioFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-18px) scale(1.04)}}
@media (prefers-reduced-motion: reduce){.studio-blob{animation:none!important}}`}</style>

      {/* Top-Bar */}
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          {studio.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={studio.logoUrl} alt={studio.name} className="h-10 w-10 object-contain" />
          ) : (
            <span
              className="grid h-10 w-10 place-items-center font-mono text-sm font-bold text-white"
              style={{ background: brand }}
            >
              {studio.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span className="text-lg font-semibold tracking-tight">{studio.name}</span>
          <a
            href="#start"
            className="ml-auto px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-white transition-transform hover:-translate-y-0.5"
            style={{ background: brand }}
          >
            Loslegen →
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="studio-blob pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: accent, animation: "studioFloat 9s ease-in-out infinite" }}
        />
        <div
          className="studio-blob pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full opacity-10 blur-3xl"
          style={{ background: brand, animation: "studioFloat 11s ease-in-out infinite" }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="max-w-3xl">
            <Reveal>
              <span
                className="inline-block px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-white"
                style={{ background: brand }}
              >
                {studio.name}
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 text-display text-5xl leading-[1.02] sm:text-7xl">
                {content.headline}
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-2xl text-xl text-ink/75 sm:text-2xl">{content.subheadline}</p>
            </Reveal>
            <Reveal delay={240}>
              <p className="mt-4 max-w-2xl leading-relaxed text-ink/65">{content.intro}</p>
            </Reveal>
            <Reveal delay={320}>
              <a
                href="#start"
                className="mt-10 inline-block px-8 py-4 font-mono text-sm uppercase tracking-[0.14em] text-white shadow-lg transition-transform hover:-translate-y-1"
                style={{ background: brand }}
              >
                {content.ctaLabel} →
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Benefits */}
      {content.benefits.length > 0 && (
        <section className="border-t border-ink/10 bg-white/50">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <Reveal>
              <p className="label" style={{ color: brand }}>
                Warum wir
              </p>
            </Reveal>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {content.benefits.map((b, i) => (
                <Reveal key={i} delay={i * 70} as="article">
                  <div className="h-full border-l-4 bg-cream p-6 transition-transform hover:-translate-y-1" style={{ borderColor: accent }}>
                    <h3 className="text-display text-xl">{b.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink/70">{b.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About */}
      {content.aboutText && (
        <section className="border-t border-ink/10">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1fr_2fr]">
            <Reveal>
              <h2 className="text-display text-3xl sm:text-4xl">{content.aboutTitle}</h2>
              <div className="mt-4 h-1 w-16" style={{ background: accent }} />
            </Reveal>
            <Reveal delay={120}>
              <p className="text-lg leading-relaxed text-ink/75">{content.aboutText}</p>
            </Reveal>
          </div>
        </section>
      )}

      {/* Tarife */}
      {plans.length > 0 && (
        <section className="border-t border-ink/10 bg-white/50">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <Reveal>
              <p className="label" style={{ color: brand }}>
                Tarife
              </p>
              <h2 className="mt-2 text-display text-3xl sm:text-4xl">Wähle, was zu dir passt</h2>
            </Reveal>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((p, i) => (
                <Reveal key={p.id} delay={i * 70} as="article">
                  <div className="flex h-full flex-col border-2 border-ink/10 bg-cream p-7 transition-transform hover:-translate-y-1">
                    <h3 className="text-display text-2xl">{p.name}</h3>
                    {p.description && <p className="mt-1 text-sm text-ink/60">{p.description}</p>}
                    <p className="mt-5">
                      <span className="text-display text-4xl">{formatPrice(p.priceCents)} €</span>
                      <span className="ml-1 text-sm text-ink/55">{INTERVAL_LABEL[p.billingInterval]}</span>
                    </p>
                    {p.highlights.length > 0 && (
                      <ul className="mt-5 space-y-2 text-sm text-ink/75">
                        {p.highlights.map((h, hi) => (
                          <li key={hi} className="flex gap-2">
                            <span style={{ color: brand }}>✓</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <a
                      href="#start"
                      className="mt-auto pt-6 font-mono text-xs uppercase tracking-[0.12em] hover:underline"
                      style={{ color: brand }}
                    >
                      Auswählen →
                    </a>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Lead-Formular */}
      <section id="start" className="border-t border-ink/10">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <Reveal>
            <h2 className="text-display text-3xl sm:text-4xl">{content.ctaLabel}</h2>
            <p className="mt-3 text-ink/65">
              Trag dich ein – wir melden uns mit deinem persönlichen Angebot.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-8">
              <StudioLeadForm
                studioSlug={studio.slug}
                ctaLabel={content.ctaLabel}
                brandColor={brand}
                onBrand="#FFFFFF"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-ink/10">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-ink/50">
          © {studio.name}
        </div>
      </footer>
    </main>
  );
}

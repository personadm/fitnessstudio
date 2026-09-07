// Lead-Magnet-Showcase: zeigt das Cover-Mockup des "Gratis-Start-Plan" (PDF)
// plus "Das steckt drin"-Punkte aus dem PDF-Inhalt. Kein Download-Button —
// der Zugang läuft per Mail (Briefing-Vorgabe). Sekundär-CTA scrollt zum
// Formular (#email). Server-Component: rein präsentationell, kein State.

const PETROL = "#0F6E56";
const GREEN = "#7CAE2D";

// Cover-/Mockup-Bild des Gratis-Start-Plans (in public/images/).
const MOCKUP_SRC = "/images/plan-mockup.jpg";

type Inclusion = {
  title: string;
  body: string;
};

// Inhalt abgeleitet aus dem Gratis-Start-Plan (PDF, 5 Seiten).
const INCLUSIONS: Inclusion[] = [
  {
    title: "Die Methode der Gesundheitscoaches",
    body: "Fünf Bausteine, ein System: Stoffwechselanalyse, Training, Ernährung, Regeneration, Entspannung.",
  },
  {
    title: "Dein 6-Wochen-Startplan",
    body: "Schritt für Schritt von der großen Analyse bis zur Erfolgsmessung — in deinem Tempo.",
  },
  {
    title: "Alles, was drinsteckt",
    body: "Vom Personal-Coaching übers Kursprogramm bis zur Zufriedenheitsgarantie — auf einen Blick.",
  },
  {
    title: "Bis zu 100 % von der Krankenkasse",
    body: "Wie du deinen Beitrag automatisch zurückbekommst — ohne Anträge, ohne Papierkram.",
  },
];

export function PlanShowcase() {
  return (
    <section className="bg-cream" aria-labelledby="plan-showcase-heading">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Mockup */}
          <div className="lg:col-span-5">
            <div className="relative">
              {/* Weicher Farbschein hinter dem Cover für Tiefe */}
              <div
                aria-hidden
                className="absolute -inset-6 -z-10 rounded-[2rem] opacity-60 blur-2xl"
                style={{
                  background:
                    "radial-gradient(60% 60% at 50% 40%, rgba(124,174,45,0.35), transparent 70%)",
                }}
              />
              <img
                src={MOCKUP_SRC}
                alt="Cover des Gratis-Start-Plans der Gesundheitscoaches"
                width={820}
                height={1160}
                loading="lazy"
                className="mx-auto w-full max-w-sm rounded-xl ring-1 ring-black/5 drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Inhalt */}
          <div className="lg:col-span-7">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ backgroundColor: "rgba(15,110,86,0.08)", color: PETROL }}
            >
              Kostenlos · in 4 Minuten gelesen
            </div>

            <h2
              id="plan-showcase-heading"
              className="mt-5 text-3xl font-bold leading-[1.1] tracking-tight text-[#2C2C2A] md:text-4xl lg:text-[2.75rem]"
            >
              Das steckt in deinem Gratis-Start-Plan
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#5F5E5A] md:text-lg">
              Dein persönlicher Fahrplan zu Wohlfühlfigur, Schmerzfreiheit und mehr
              Energie — sofort per Mail, in Ruhe durchlesen.
            </p>

            <ul className="mt-8 space-y-4">
              {INCLUSIONS.map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: "rgba(124,174,45,0.15)", color: GREEN }}
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span className="text-base leading-snug text-[#2C2C2A]">
                    <strong className="font-semibold">{item.title}</strong>
                    <span className="text-[#5F5E5A]"> — {item.body}</span>
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="#email"
              className="mt-9 inline-flex items-center gap-2 rounded-lg px-6 py-3.5 text-base font-semibold text-white transition-colors"
              style={{ backgroundColor: PETROL }}
            >
              Gratis-Start-Plan sichern →
            </a>
            <p className="mt-3 text-xs text-[#8A857E]">
              Von gesetzlichen Krankenkassen bezuschusst · 100 % unverbindlich
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Inhalte einer Studio-Landingpage. Werden im Onboarding (ggf. per KI aus der
// bisherigen Website) erzeugt und als JSON auf Studio.landingContent gespeichert.
//
// Die Struktur bildet die conversion-optimierte Vorlage (siehe src/app/page.tsx)
// nach: Split-Hero mit Formular, Beweis-Bullets, Testimonials, Bild-Band,
// Prozess-Block und Bilder-Grid. Nur Farbe/Logo/Texte/Bilder wechseln pro Studio.

export type LandingBenefit = { title: string; text: string };
export type LandingTestimonial = {
  name: string;
  age: string;
  city: string;
  quote: string;
  imageUrl: string;
};
export type LandingProcessStep = { title: string; body: string };
export type LandingGridImage = { label: string; url: string };

export type LandingContent = {
  // Hero (links)
  trustBadge: string; // Pille über der Headline (leer = ausgeblendet)
  headline: string;
  subheadline: string; // Betonungszeile in Akzentfarbe
  intro: string;
  heroBullets: string[]; // Beweis-Punkte mit Häkchen
  kassenBadge: string; // Gold-Pille (leer = ausgeblendet)

  // Lead-Formular-Karte (Hero rechts)
  formTitle: string;
  formSubtitle: string;
  ctaLabel: string;

  // Testimonials (leer = Sektion ausgeblendet)
  testimonialsLabel: string;
  testimonialsHeadline: string;
  testimonials: LandingTestimonial[];

  // Cinematic Bild-Band (ohne Bild = ausgeblendet)
  bandImageUrl: string;
  bandEyebrow: string;
  bandCaption: string;

  // Prozess-Block (Akzentfarbe)
  processLabel: string;
  processHeadline: string;
  processIntro: string;
  processSteps: LandingProcessStep[];

  // Bilder-Grid (ohne Bilder = ausgeblendet)
  gridLabel: string;
  gridHeadline: string;
  gridHeadlineAccent: string;
  gridImages: LandingGridImage[];

  // Abschluss-CTA
  closingHeadline: string;

  // Legacy-Felder (Abwärtskompatibilität; im neuen Layout nicht gerendert)
  benefits: LandingBenefit[];
  aboutTitle: string;
  aboutText: string;
};

export const MAX_BENEFITS = 6;
export const MAX_BULLETS = 5;
export const MAX_TESTIMONIALS = 5;
export const MAX_PROCESS_STEPS = 4;
export const MAX_GRID_IMAGES = 6;

/** Sinnvolle Vorbelegung, falls (noch) keine Inhalte generiert wurden. */
export function defaultLandingContent(studioName: string): LandingContent {
  return {
    trustBadge: "",
    headline: `Stark werden. Dranbleiben. Dich wohlfühlen.`,
    subheadline: "Dein Weg zu mehr Energie, Kraft und Wohlbefinden.",
    intro:
      "Wir begleiten dich persönlich – mit einem Training, das zu deinem Leben passt, und einem Team, das dich kennt. Deinen Gratis-Start-Plan bekommst du sofort per Mail.",
    heroBullets: [
      "Persönliche Betreuung von Tag 1",
      "Flexible Trainingszeiten, die zu dir passen",
      "Ein Team, das dich beim Namen kennt",
    ],
    kassenBadge: "",

    formTitle: "Dein Gratis-Start-Plan",
    formSubtitle: "Sofort per Mail. In Ruhe durchlesen.",
    ctaLabel: "Jetzt Gratis-Angebot sichern",

    testimonialsLabel: "Das sagen unsere Mitglieder",
    testimonialsHeadline: "Echte Erfolge.",
    testimonials: [],

    bandImageUrl: "",
    bandEyebrow: "Persönlich, herzlich, kompetent",
    bandCaption: `${studioName}.`,

    processLabel: "Unser Weg",
    processHeadline: "So arbeiten wir.",
    processIntro:
      "Wir verbinden Training, Betreuung und Motivation zu einem Weg, der zu deinem Alltag passt – damit du dranbleibst und dich rundum wohlfühlst.",
    processSteps: [
      {
        title: "Persönlich",
        body: "Kein anonymes Trainieren. Wir nehmen uns Zeit für dich – vom ersten Tag an.",
      },
      {
        title: "Modern",
        body: "Top-Geräte, saubere Flächen und eine Atmosphäre, in der du dich wohlfühlst.",
      },
      {
        title: "Flexibel",
        body: "Du wählst, was zu dir passt – ohne Kleingedrucktes und ohne Druck.",
      },
    ],

    gridLabel: "Im Studio",
    gridHeadline: "Alles für deinen Erfolg.",
    gridHeadlineAccent: "Ein Ort.",
    gridImages: [],

    closingHeadline: "Mail rein, Angebot raus, los geht's.",

    benefits: [],
    aboutTitle: "Über uns",
    aboutText: "",
  };
}

// ─────────────────────────────────────────────────────────────
// Coerce / Validierung
// ─────────────────────────────────────────────────────────────

function str(v: unknown, max = 600): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Akzeptiert nur http(s)-Bild-URLs (schützt vor javascript:/data:-Injection). */
function safeImageUrl(v: unknown): string {
  const s = str(v, 1000);
  return /^https?:\/\//i.test(s) ? s : "";
}

function strArray(v: unknown, maxItems: number, maxLen = 160): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => str(x, maxLen))
    .filter((x) => x.length > 0)
    .slice(0, maxItems);
}

/** Validiert/normalisiert ein unbekanntes JSON in LandingContent (oder null). */
export function coerceLandingContent(raw: unknown): LandingContent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const headline = str(r.headline, 140);
  if (!headline) return null; // Mindestens eine Headline muss da sein.

  const obj = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" ? (v as Record<string, unknown>) : {};

  const benefits: LandingBenefit[] = (Array.isArray(r.benefits) ? r.benefits : [])
    .map((b) => {
      const o = obj(b);
      return { title: str(o.title, 80), text: str(o.text, 240) };
    })
    .filter((b) => b.title.length > 0)
    .slice(0, MAX_BENEFITS);

  const testimonials: LandingTestimonial[] = (Array.isArray(r.testimonials) ? r.testimonials : [])
    .map((t) => {
      const o = obj(t);
      return {
        name: str(o.name, 80),
        age: str(o.age, 40),
        city: str(o.city, 60),
        quote: str(o.quote, 500),
        imageUrl: safeImageUrl(o.imageUrl),
      };
    })
    .filter((t) => t.name.length > 0 && t.quote.length > 0)
    .slice(0, MAX_TESTIMONIALS);

  const processSteps: LandingProcessStep[] = (Array.isArray(r.processSteps) ? r.processSteps : [])
    .map((p) => {
      const o = obj(p);
      return { title: str(o.title, 60), body: str(o.body, 320) };
    })
    .filter((p) => p.title.length > 0)
    .slice(0, MAX_PROCESS_STEPS);

  const gridImages: LandingGridImage[] = (Array.isArray(r.gridImages) ? r.gridImages : [])
    .map((g) => {
      const o = obj(g);
      return { label: str(o.label, 60), url: safeImageUrl(o.url) };
    })
    .filter((g) => g.url.length > 0)
    .slice(0, MAX_GRID_IMAGES);

  return {
    trustBadge: str(r.trustBadge, 120),
    headline,
    subheadline: str(r.subheadline, 200),
    intro: str(r.intro, 600),
    heroBullets: strArray(r.heroBullets, MAX_BULLETS, 160),
    kassenBadge: str(r.kassenBadge, 120),

    formTitle: str(r.formTitle, 80) || "Dein Gratis-Start-Plan",
    formSubtitle: str(r.formSubtitle, 160) || "Sofort per Mail. In Ruhe durchlesen.",
    ctaLabel: str(r.ctaLabel, 60) || "Jetzt Gratis-Angebot sichern",

    testimonialsLabel: str(r.testimonialsLabel, 80) || "Das sagen unsere Mitglieder",
    testimonialsHeadline: str(r.testimonialsHeadline, 80) || "Echte Erfolge.",
    testimonials,

    bandImageUrl: safeImageUrl(r.bandImageUrl),
    bandEyebrow: str(r.bandEyebrow, 120),
    bandCaption: str(r.bandCaption, 160),

    processLabel: str(r.processLabel, 80) || "Unser Weg",
    processHeadline: str(r.processHeadline, 100) || "So arbeiten wir.",
    processIntro: str(r.processIntro, 600),
    processSteps,

    gridLabel: str(r.gridLabel, 80) || "Im Studio",
    gridHeadline: str(r.gridHeadline, 100),
    gridHeadlineAccent: str(r.gridHeadlineAccent, 100),
    gridImages,

    closingHeadline: str(r.closingHeadline, 160) || "Mail rein, Angebot raus, los geht's.",

    benefits,
    aboutTitle: str(r.aboutTitle, 80) || "Über uns",
    aboutText: str(r.aboutText, 800),
  };
}

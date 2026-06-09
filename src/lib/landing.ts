// Inhalte einer Studio-Landingpage. Werden im Onboarding (ggf. per KI aus der
// bisherigen Website) erzeugt und als JSON auf Studio.landingContent gespeichert.

export type LandingBenefit = { title: string; text: string };

export type LandingContent = {
  headline: string;
  subheadline: string;
  intro: string;
  benefits: LandingBenefit[];
  aboutTitle: string;
  aboutText: string;
  ctaLabel: string;
};

export const MAX_BENEFITS = 6;

/** Sinnvolle Vorbelegung, falls (noch) keine Inhalte generiert wurden. */
export function defaultLandingContent(studioName: string): LandingContent {
  return {
    headline: `Willkommen bei ${studioName}`,
    subheadline: "Dein Weg zu mehr Energie, Kraft und Wohlbefinden.",
    intro:
      "Wir begleiten dich persönlich – mit einem Training, das zu deinem Leben passt, und einem Team, das dich kennt.",
    benefits: [
      { title: "Persönliche Betreuung", text: "Kein anonymes Trainieren – wir sind für dich da." },
      { title: "Modernes Studio", text: "Top-Geräte, saubere Flächen, gute Atmosphäre." },
      { title: "Flexible Tarife", text: "Du wählst, was zu dir passt – ohne Kleingedrucktes." },
    ],
    aboutTitle: "Über uns",
    aboutText:
      "Wir sind dein Team vor Ort und nehmen uns Zeit für dich – vom ersten Probetraining bis zum langfristigen Erfolg.",
    ctaLabel: "Jetzt Gratis-Angebot sichern",
  };
}

/** Validiert/normalisiert ein unbekanntes JSON in LandingContent (oder null). */
export function coerceLandingContent(raw: unknown): LandingContent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown, max = 600): string =>
    typeof v === "string" ? v.trim().slice(0, max) : "";

  const benefitsRaw = Array.isArray(r.benefits) ? r.benefits : [];
  const benefits: LandingBenefit[] = benefitsRaw
    .map((b) => {
      const o = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
      return { title: str(o.title, 80), text: str(o.text, 240) };
    })
    .filter((b) => b.title.length > 0)
    .slice(0, MAX_BENEFITS);

  const headline = str(r.headline, 120);
  if (!headline) return null; // Mindestens eine Headline muss da sein.

  return {
    headline,
    subheadline: str(r.subheadline, 200),
    intro: str(r.intro, 600),
    benefits,
    aboutTitle: str(r.aboutTitle, 80) || "Über uns",
    aboutText: str(r.aboutText, 800),
    ctaLabel: str(r.ctaLabel, 60) || "Jetzt Gratis-Angebot sichern",
  };
}

// Testimonials werden alle 2 Tage rotierend von gesundheitscoaches.de geholt.
// Wenn Fetch oder Parsing scheitert, fällt's auf die hardcodierten 5 zurück.

export type Testimonial = {
  name: string;
  age: string;
  city: string;
  quote: string;
  imageUrl: string;
};

const SOURCE_URL = "https://www.gesundheitscoaches.de/erfolgsgeschichten";
// Quelle wird täglich neu geholt (HTML-Cache 24h)
const FETCH_REVALIDATE_SECONDS = 60 * 60 * 24;
// Rotation: alle 2 Tage andere 5
const ROTATION_PERIOD_MS = 2 * 24 * 60 * 60 * 1000;
const COUNT = 5;

// Hardcoded Fallback (sichtbar wenn Fetch/Parse mal nicht klappt)
const FALLBACK: Testimonial[] = [
  {
    name: "Anne Lünnemann",
    age: "52 Jahre",
    city: "Neuenkirchen",
    quote:
      "Schon nach kurzer Zeit habe ich Gewicht reduziert, fühle mich fitter und ausgeglichener und habe weniger Gelenkschmerzen.",
    imageUrl:
      "https://static.wixstatic.com/media/fe97c9_a4e9490426d74a09867a7eb7e2309508~mv2.jpg/v1/fill/w_500,h_500,al_c,q_85,enc_avif,quality_auto/Image-empty-state.jpg",
  },
  {
    name: "Guido Boll",
    age: "59 Jahre",
    city: "Vreden",
    quote:
      "Heute spüre ich die Veränderung in jeder Zelle. Ich bin deutlich kräftiger, fitter, motivierter – und habe endlich wieder Energie für das, was mir wichtig ist.",
    imageUrl:
      "https://static.wixstatic.com/media/fe97c9_a61d6452873d4e7ea40130eaec570168~mv2.jpg/v1/fill/w_500,h_500,al_c,q_85,enc_avif,quality_auto/Image-empty-state.jpg",
  },
  {
    name: "Kimberley Conner",
    age: "42 Jahre",
    city: "Ochtrup",
    quote:
      "Inzwischen habe ich 18 Kilogramm abgenommen. Ich fühle mich fitter und beweglicher denn je.",
    imageUrl:
      "https://static.wixstatic.com/media/fe97c9_08259ae8c4d3466ca7f833dab41868d8~mv2.jpg/v1/fill/w_500,h_500,al_c,q_85,enc_avif,quality_auto/Image-empty-state.jpg",
  },
  {
    name: "Lukas Bußmann",
    age: "24 Jahre",
    city: "Ochtrup",
    quote:
      "Ich habe insgesamt 33 kg abgenommen, habe mehr Ausdauer, ein besseres Körpergefühl und ein ganz anderes Bewusstsein für einen gesunden Lifestyle.",
    imageUrl:
      "https://static.wixstatic.com/media/fe97c9_89991d5f0db54844a477e0df14ee74fc~mv2.jpg/v1/fill/w_500,h_500,al_c,q_85,enc_avif,quality_auto/Image-empty-state.jpg",
  },
  {
    name: "Conny Epping & Martina Wesker",
    age: "56+58 Jahre",
    city: "Ahaus",
    quote:
      "Keine Schulterschmerzen mehr, eine spürbar bessere Beweglichkeit und ein paar Kilos gingen auch noch runter. Durchgehalten und drangeblieben… wir haben es geschafft und fühlen uns superwohl.",
    imageUrl:
      "https://static.wixstatic.com/media/fe97c9_109bd1a1a41041b1a4d4ec5c43e1b5cd~mv2.png/v1/fill/w_500,h_500,al_c,q_85,enc_avif,quality_auto/Image-empty-state.png",
  },
];

// ─────────────────────────────────────────────────────────────
// HTML helpers
// ─────────────────────────────────────────────────────────────

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&auml;/g, "ä")
    .replace(/&Auml;/g, "Ä")
    .replace(/&ouml;/g, "ö")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&uuml;/g, "ü")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&szlig;/g, "ß")
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, c) => String.fromCharCode(parseInt(c, 16)));
}

// Wix-URLs liefern Thumbnails wie w_245,h_138. Auf 500x500 quadratisch umschreiben.
function bigImageUrl(url: string): string {
  return url.replace(
    /\/v1\/fill\/[^/]+(?=\/[^/]+$)/,
    "/v1/fill/w_500,h_500,al_c,q_85,enc_avif,quality_auto",
  );
}

// ─────────────────────────────────────────────────────────────
// Parser
// ─────────────────────────────────────────────────────────────

function parseTestimonialsFromHtml(html: string): Testimonial[] {
  const results: Testimonial[] = [];

  // Alle <h2> finden — das sind die Namen der Testimonials
  const h2Pattern = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi;
  const candidates: { name: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = h2Pattern.exec(html)) !== null) {
    const inner = decodeEntities(m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
    if (
      inner.length >= 3 &&
      inner.length < 80 &&
      /^[A-ZÄÖÜ]/.test(inner) &&
      !inner.toLowerCase().includes("erfolg") &&
      !inner.toLowerCase().includes("ihr ") &&
      !inner.toLowerCase().includes("unsere")
    ) {
      candidates.push({ name: inner, index: m.index });
    }
  }

  for (let i = 0; i < candidates.length; i++) {
    const { name, index } = candidates[i];
    const sectionEnd =
      i + 1 < candidates.length
        ? candidates[i + 1].index
        : Math.min(index + 6000, html.length);
    const sectionHtml = html.slice(index, sectionEnd);
    const sectionText = decodeEntities(
      sectionHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "),
    );

    // Bild davor suchen (das letzte img vor dem h2)
    const beforeWindow = html.slice(Math.max(0, index - 4000), index);
    const imgMatches = [
      ...beforeWindow.matchAll(
        /<img\b[^>]*\bsrc=["']([^"']*static\.wixstatic\.com[^"']*)["'][^>]*>/gi,
      ),
    ];
    let imageUrl: string | null = null;
    if (imgMatches.length > 0) {
      const raw = imgMatches[imgMatches.length - 1][1];
      imageUrl = bigImageUrl(raw);
    }

    // Alter + Stadt
    const ageMatch = sectionText.match(
      /Alter\s*:\s*([^"„\n]{3,80}?)(?=\s*[„""]|\.\s|\s{3,}|$)/i,
    );
    if (!ageMatch) continue;
    const ageCity = ageMatch[1].trim().replace(/\s+aus\s+/i, " - ");
    const parts = ageCity.split(/\s*[-–—]\s*/);
    const age = parts[0]?.trim() ?? "";
    const city = parts.slice(1).join(" - ").trim();

    // Zitat — deutsch „..." oder normales "..."
    const quoteMatch =
      sectionText.match(/„([^"]{20,500})["""]/) ||
      sectionText.match(/"([^"]{20,500})"/);
    const quote = quoteMatch?.[1].trim() ?? "";

    if (imageUrl && age && quote) {
      results.push({ name, age, city, quote, imageUrl });
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// Fetch + Rotation
// ─────────────────────────────────────────────────────────────

async function fetchAll(): Promise<Testimonial[]> {
  try {
    const res = await fetch(SOURCE_URL, {
      next: { revalidate: FETCH_REVALIDATE_SECONDS },
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; Gesundheitscoaches-Landing/1.0; +https://www.gesundheitscoaches.de)",
        accept: "text/html",
      },
    });
    if (!res.ok) {
      console.warn("[testimonials] source fetch failed:", res.status);
      return [];
    }
    const html = await res.text();
    const parsed = parseTestimonialsFromHtml(html);
    if (parsed.length < 3) {
      console.warn("[testimonials] parser found only", parsed.length, "items");
    }
    return parsed;
  } catch (err) {
    console.warn("[testimonials] fetch error", err);
    return [];
  }
}

function pickRotation<T>(items: T[], count: number): T[] {
  if (items.length === 0) return [];
  if (items.length <= count) return items;

  // Zähler erhöht sich alle 2 Tage um 1
  const period = Math.floor(Date.now() / ROTATION_PERIOD_MS);
  const offset = ((period % items.length) + items.length) % items.length;

  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    result.push(items[(offset + i) % items.length]);
  }
  return result;
}

/**
 * Liefert COUNT (5) Testimonials, die alle 2 Tage rotieren.
 * Quelle: gesundheitscoaches.de/erfolgsgeschichten — wird täglich neu gecached.
 * Bei Problemen mit Fetch/Parsing wird auf hardcodierte Liste zurückgefallen.
 */
export async function getTestimonials(): Promise<Testimonial[]> {
  const fetched = await fetchAll();

  if (fetched.length >= COUNT) {
    return pickRotation(fetched, COUNT);
  }

  return pickRotation(FALLBACK, COUNT);
}

// Backward compat: für Module, die noch synchron importieren
export const TESTIMONIALS = FALLBACK;

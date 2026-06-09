// KI-Generierung von Landingpage-Inhalten aus einer bestehenden Website.
// Ruft die Anthropic-API direkt per fetch() auf (gleicher Stil wie lib/ai.ts).
//
// Ablauf: Website laden → Klartext + Bild-URLs extrahieren → Claude baut daraus
// die komplette Landingpage-Struktur und ordnet die gefundenen Bilder zu.
import {
  coerceLandingContent,
  type LandingContent,
  MAX_BENEFITS,
  MAX_BULLETS,
  MAX_GRID_IMAGES,
  MAX_PROCESS_STEPS,
  MAX_TESTIMONIALS,
} from "./landing";

const FETCH_TIMEOUT_MS = 8000;
const MAX_TEXT_CHARS = 6000;
const MAX_IMAGES = 24;

export type WebsiteContent = { text: string; images: string[] };

/**
 * Lädt eine Website und extrahiert groben Klartext + Bild-URLs.
 * Wirft bei ungültiger URL, Timeout oder Nicht-200-Antwort.
 */
export async function fetchWebsiteContent(rawUrl: string): Promise<WebsiteContent> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("Bitte eine gültige URL angeben (inkl. https://).");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Nur http(s)-URLs werden unterstützt.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let html: string;
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; StudioOnboarding/1.0)" },
    });
    if (!res.ok) throw new Error(`Website antwortete mit Status ${res.status}.`);
    html = await res.text();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Website hat zu lange gebraucht (Timeout).");
    }
    throw new Error("Website konnte nicht geladen werden.");
  } finally {
    clearTimeout(timeout);
  }

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_CHARS);

  if (text.length < 40) {
    throw new Error("Auf der Website wurde zu wenig Text gefunden.");
  }

  const images = extractImages(html, url);
  return { text, images };
}

/** Abwärtskompatibel: nur der Klartext (alte Aufrufer). */
export async function fetchWebsiteText(rawUrl: string): Promise<string> {
  return (await fetchWebsiteContent(rawUrl)).text;
}

const IMAGE_EXT = /\.(jpe?g|png|webp|avif)(\?|#|$)/i;
// Dateinamen, die typischerweise KEINE Inhaltsbilder sind (Logos, Icons, Sprites …).
const IMAGE_SKIP = /(logo|icon|favicon|sprite|placeholder|pixel|spacer|avatar-default|loading)/i;

/**
 * Zieht Inhaltsbilder aus dem HTML: <img src>, <img srcset>, og:image.
 * Relative URLs werden gegen die Seiten-URL absolut aufgelöst, Duplikate und
 * offensichtliche Nicht-Inhaltsbilder (Logos/Icons/SVG/Data-URIs) entfernt.
 */
function extractImages(html: string, base: URL): string[] {
  const found = new Set<string>();
  const ordered: string[] = [];

  const add = (raw: string | undefined): void => {
    if (!raw) return;
    let candidate = raw.trim();
    if (!candidate || candidate.startsWith("data:")) return;
    // srcset-Einträge: "url 320w" → nur die URL
    candidate = candidate.split(/\s+/)[0];
    let abs: string;
    try {
      abs = new URL(candidate, base).toString();
    } catch {
      return;
    }
    if (!/^https?:\/\//i.test(abs)) return;
    if (/\.svg(\?|#|$)/i.test(abs)) return;
    if (IMAGE_SKIP.test(abs)) return;
    // Inhaltsbild: erkennbare Bild-Endung ODER bekannter Media-CDN-Host.
    const looksLikeImage = IMAGE_EXT.test(abs) || /(wixstatic|cloudfront|imgix|cdn|squarespace|unsplash)/i.test(abs);
    if (!looksLikeImage) return;
    if (found.has(abs)) return;
    found.add(abs);
    ordered.push(abs);
  };

  // og:image / link rel=image_src
  for (const m of html.matchAll(
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]*\bcontent=["']([^"']+)["']/gi,
  )) {
    add(m[1]);
  }
  // <img src> und <img srcset>
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    add(src);
    const srcset = tag.match(/\bsrcset=["']([^"']+)["']/i)?.[1];
    if (srcset) {
      // letzte (größte) Variante zuerst probieren
      const parts = srcset.split(",").map((p) => p.trim()).filter(Boolean);
      const largest = parts[parts.length - 1];
      add(largest);
    }
  }

  return ordered.slice(0, MAX_IMAGES);
}

/**
 * Generiert die komplette Landingpage-Struktur aus Website-Text + Bild-Liste.
 * Bilder werden NUR aus der übergebenen Kandidatenliste zugeordnet (kein
 * Halluzinieren fremder URLs); danach wird gegen die Liste gegengeprüft.
 */
export async function generateLandingContent(input: {
  websiteText: string;
  studioName: string;
  images?: string[];
}): Promise<LandingContent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("KI ist nicht konfiguriert (ANTHROPIC_API_KEY fehlt).");
  }

  const images = (input.images ?? []).slice(0, MAX_IMAGES);
  const imageList =
    images.length > 0
      ? images.map((u, i) => `${i + 1}. ${u}`).join("\n")
      : "(keine Bilder gefunden)";

  const systemPrompt = `Du bist ein Conversion-Texter für Fitnessstudio-/Gesundheits-Landingpages.
Aus dem Website-Text und der Bild-Liste eines Studios baust du eine komplette,
frische Landingpage. Du rufst IMMER das Tool "create_landing" auf.

SPRACHE & TON: Deutsch, Du-Form, motivierend aber nicht marktschreierisch.

WICHTIGE REGELN:
- Erfinde KEINE Fakten, Preise, Zahlen, Auszeichnungen oder Personen. Nutze nur,
  was plausibel aus dem Website-Text hervorgeht. Im Zweifel Feld leer lassen.
- BILDER: Verwende für imageUrl/url/bandImageUrl AUSSCHLIESSLICH exakte URLs aus
  der bereitgestellten Bild-Liste (kompletter String, unverändert). Erfinde nie
  eine URL. Wenn kein passendes Bild existiert, lass das Feld leer ("").
- testimonials: NUR ausfüllen, wenn der Text echte Kundenstimmen mit Namen
  enthält. Sonst leeres Array. Niemals Personen erfinden.
- kassenBadge: nur setzen, wenn der Text auf Krankenkassen-Zuschuss/Prävention
  (§20 SGB V) hindeutet. Sonst "".
- trustBadge: kurze, belegbare Vertrauenszeile (z. B. "Seit 2005 · 3 Standorte"),
  sonst "".

FELDER:
- headline: kurze, nutzenorientierte Hauptaussage (max ~9 Wörter).
- subheadline: ein zugespitzter Satz, der die Headline verstärkt.
- intro: 1–2 Sätze Einleitung; erwähne, dass das Start-Angebot per Mail kommt.
- heroBullets: 3–${MAX_BULLETS} kurze, konkrete Vorteile/Beweis-Punkte (je max 1 Zeile).
- formTitle/formSubtitle/ctaLabel: Texte für die Anmelde-Karte bzw. den Button.
- testimonialsLabel/testimonialsHeadline: Überschrift der Stimmen-Sektion.
- processLabel/processHeadline/processIntro + processSteps (3–${MAX_PROCESS_STEPS},
  je title (1–2 Wörter) + body (1–2 Sätze)): wie das Studio arbeitet.
- bandImageUrl/bandEyebrow/bandCaption: großes Stimmungsbild + kurze Bildunterschrift.
- gridLabel/gridHeadline/gridHeadlineAccent + gridImages (bis ${MAX_GRID_IMAGES},
  je label + url aus der Bild-Liste): Eindrücke aus dem Studio.
- closingHeadline: knackiger Abschluss-Aufruf zum Formular.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      system: systemPrompt,
      tools: [
        {
          name: "create_landing",
          description: "Erzeugt die komplette Landingpage-Struktur.",
          input_schema: {
            type: "object",
            properties: {
              trustBadge: { type: "string" },
              headline: { type: "string" },
              subheadline: { type: "string" },
              intro: { type: "string" },
              heroBullets: { type: "array", items: { type: "string" } },
              kassenBadge: { type: "string" },
              formTitle: { type: "string" },
              formSubtitle: { type: "string" },
              ctaLabel: { type: "string" },
              testimonialsLabel: { type: "string" },
              testimonialsHeadline: { type: "string" },
              testimonials: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    age: { type: "string" },
                    city: { type: "string" },
                    quote: { type: "string" },
                    imageUrl: { type: "string" },
                  },
                  required: ["name", "quote"],
                },
              },
              bandImageUrl: { type: "string" },
              bandEyebrow: { type: "string" },
              bandCaption: { type: "string" },
              processLabel: { type: "string" },
              processHeadline: { type: "string" },
              processIntro: { type: "string" },
              processSteps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    body: { type: "string" },
                  },
                  required: ["title", "body"],
                },
              },
              gridLabel: { type: "string" },
              gridHeadline: { type: "string" },
              gridHeadlineAccent: { type: "string" },
              gridImages: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    url: { type: "string" },
                  },
                  required: ["label", "url"],
                },
              },
              closingHeadline: { type: "string" },
            },
            required: ["headline", "subheadline", "intro", "heroBullets", "ctaLabel"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "create_landing" },
      messages: [
        {
          role: "user",
          content: `Studio-Name: ${input.studioName}\n\nVerfügbare Bilder (nur diese URLs verwenden):\n${imageList}\n\nWebsite-Text:\n${input.websiteText}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[landingAi] Anthropic error", response.status, detail.slice(0, 300));
    throw new Error("KI-Generierung fehlgeschlagen. Bitte erneut versuchen.");
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; input?: unknown }>;
  };
  const toolUse = data.content?.find((c) => c.type === "tool_use");
  const content = coerceLandingContent(sanitizeImages(toolUse?.input, images));
  if (!content) {
    throw new Error("KI lieferte kein verwertbares Ergebnis.");
  }
  return content;
}

/**
 * Entfernt Bild-URLs, die nicht aus der erlaubten Kandidatenliste stammen
 * (gegen halluzinierte/fremde URLs). Mutiert nicht — gibt eine Kopie zurück.
 */
function sanitizeImages(raw: unknown, allowed: string[]): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const allow = new Set(allowed);
  const ok = (u: unknown): string => (typeof u === "string" && allow.has(u) ? u : "");
  const r = { ...(raw as Record<string, unknown>) };

  r.bandImageUrl = ok(r.bandImageUrl);

  if (Array.isArray(r.testimonials)) {
    r.testimonials = r.testimonials.map((t) => {
      const o = t && typeof t === "object" ? { ...(t as Record<string, unknown>) } : {};
      o.imageUrl = ok(o.imageUrl);
      return o;
    });
  }
  if (Array.isArray(r.gridImages)) {
    r.gridImages = (r.gridImages as unknown[])
      .map((g) => {
        const o = g && typeof g === "object" ? { ...(g as Record<string, unknown>) } : {};
        o.url = ok(o.url);
        return o;
      })
      .filter((g) => (g as Record<string, unknown>).url);
  }
  return r;
}

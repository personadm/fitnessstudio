// KI-Generierung von Landingpage-Texten aus einer bestehenden Website.
// Ruft die Anthropic-API direkt per fetch() auf (gleicher Stil wie lib/ai.ts).
import { coerceLandingContent, type LandingContent, MAX_BENEFITS } from "./landing";

const FETCH_TIMEOUT_MS = 8000;
const MAX_TEXT_CHARS = 6000;

/**
 * Lädt eine Website und extrahiert groben Klartext (Tags/Scripts entfernt).
 * Wirft bei ungültiger URL, Timeout oder Nicht-200-Antwort.
 */
export async function fetchWebsiteText(rawUrl: string): Promise<string> {
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
  return text;
}

/**
 * Generiert Landingpage-Inhalte aus dem Website-Text via Claude (Tool-Use).
 */
export async function generateLandingContent(input: {
  websiteText: string;
  studioName: string;
}): Promise<LandingContent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("KI ist nicht konfiguriert (ANTHROPIC_API_KEY fehlt).");
  }

  const systemPrompt = `Du bist ein Conversion-Texter für Fitnessstudio-Landingpages.
Aus dem bereitgestellten Website-Text eines Studios baust du frische, prägnante
Landingpage-Inhalte. Du rufst IMMER das Tool "create_landing" auf.

REGELN:
- Sprache: Deutsch, Du-Form, motivierend aber nicht marktschreierisch.
- Keine erfundenen Fakten/Preise. Nutze nur, was plausibel aus dem Text hervorgeht.
- headline: kurz, nutzenorientiert (max ~8 Wörter).
- subheadline: ein Satz, der die Headline ergänzt.
- intro: 1–2 Sätze Einleitung.
- benefits: 3–${MAX_BENEFITS} konkrete Vorteile, je title (max 4 Wörter) + text (1 Satz).
- aboutText: 2–3 Sätze über das Studio/Team.
- ctaLabel: knackiger Button-Text (z. B. "Gratis-Probetraining sichern").`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: systemPrompt,
      tools: [
        {
          name: "create_landing",
          description: "Erzeugt die Landingpage-Inhalte.",
          input_schema: {
            type: "object",
            properties: {
              headline: { type: "string" },
              subheadline: { type: "string" },
              intro: { type: "string" },
              benefits: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    text: { type: "string" },
                  },
                  required: ["title", "text"],
                },
              },
              aboutTitle: { type: "string" },
              aboutText: { type: "string" },
              ctaLabel: { type: "string" },
            },
            required: ["headline", "subheadline", "intro", "benefits", "aboutText", "ctaLabel"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "create_landing" },
      messages: [
        {
          role: "user",
          content: `Studio-Name: ${input.studioName}\n\nWebsite-Text:\n${input.websiteText}`,
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
  const content = coerceLandingContent(toolUse?.input);
  if (!content) {
    throw new Error("KI lieferte kein verwertbares Ergebnis.");
  }
  return content;
}

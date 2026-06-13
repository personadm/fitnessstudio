/**
 * KI-Schritte der Wissensbasis-Pipeline: Relevanz-Klassifizierung + Destillierung.
 *
 * Nutzt dieselbe Anthropic-fetch()-Konvention wie src/lib/ai.ts und die
 * Funnel-Generate-Routen (kein SDK). ANTHROPIC_API_KEY aus den ENV-Variablen.
 *
 * Server-only.
 */

import "server-only";
import { MAX_TRANSCRIPT_CHARS } from "./config";

// Günstiges Modell für die Massen-Klassifizierung, stärkeres fürs Destillieren.
const CLASSIFY_MODEL = "claude-haiku-4-5-20251001";
const DISTILL_MODEL = "claude-sonnet-4-20250514";

interface AnthropicTextResponse {
  content: Array<{ type: string; text?: string }>;
}

async function callAnthropic(opts: {
  model: string;
  system: string;
  user: string;
  maxTokens: number;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY ist nicht konfiguriert.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as AnthropicTextResponse;
  const text = data.content.find((b) => b.type === "text")?.text ?? "";
  if (!text) throw new Error("Anthropic lieferte leere Antwort.");
  return text;
}

/** Entfernt einen evtl. umschließenden Markdown-Codeblock. */
function stripCodeFence(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

// ─── Relevanz-Klassifizierung ───────────────────────────────────────────────

const CLASSIFY_SYSTEM = `Du bist ein präziser Klassifizierer. Du entscheidest, ob ein YouTube-Video substanziellen, anwendbaren Inhalt über E-Mail-Marketing enthält (E-Mail-Sequenzen, Newsletter, Betreffzeilen, Deliverability, Listenaufbau, E-Mail-Copywriting, Funnels mit E-Mail im Kern, Conversion über E-Mail).

NICHT relevant: allgemeine Business-/Sales-/Mindset-/Social-Media-/Paid-Ads-/Hiring-Videos ohne konkreten E-Mail-Bezug.

Antworte AUSSCHLIESSLICH mit JSON, ohne Markdown:
{"relevant": true|false, "reason": "max 12 Wörter"}`;

export interface ClassificationResult {
  relevant: boolean;
  reason: string;
}

/**
 * Entscheidet, ob ein Video zum Thema E-Mail-Marketing gehört. Nutzt Titel +
 * (sofern vorhanden) den Transkript-Anfang als Kontext.
 */
export async function classifyEmailMarketing(input: {
  title: string;
  description?: string | null;
  transcript?: string | null;
}): Promise<ClassificationResult> {
  const context = (input.transcript ?? input.description ?? "").slice(0, 3000);
  const user = `Titel: ${input.title}

Auszug:
${context || "(kein Auszug verfügbar)"}

Gehört dieses Video zu E-Mail-Marketing?`;

  const raw = await callAnthropic({
    model: CLASSIFY_MODEL,
    system: CLASSIFY_SYSTEM,
    user,
    maxTokens: 200,
  });

  const parsed = JSON.parse(stripCodeFence(raw)) as { relevant?: unknown; reason?: unknown };
  return {
    relevant: parsed.relevant === true,
    reason: typeof parsed.reason === "string" ? parsed.reason : "",
  };
}

// ─── Destillierung ──────────────────────────────────────────────────────────

const DISTILL_SYSTEM = `Du bist ein Experte für E-Mail-Marketing und destillierst rohe Video-Transkripte zu kompakten, sofort anwendbaren Frameworks.

Aus dem Transkript extrahierst du NUR konkrete, übertragbare E-Mail-Marketing-Erkenntnisse: Strukturen, Heuristiken, Zahlen, Do's & Don'ts, Formulierungs-Muster. Keine Anekdoten, kein Geschwafel, keine Wiederholungen, keine Eigennamen-Werbung.

Format: knappes Markdown mit Bullet-Points unter 2-4 thematischen Überschriften (###). Maximal ~250 Wörter. Wenn das Transkript wenig Verwertbares zu E-Mail-Marketing enthält, gib NUR die Zeile "KEINE_VERWERTBAREN_ERKENNTNISSE" aus.`;

/**
 * Destilliert ein Transkript zu kompakten E-Mail-Marketing-Frameworks (Markdown).
 * @returns Markdown-Notizen, oder null wenn nichts Verwertbares drin ist.
 */
export async function distillTranscript(input: {
  title: string;
  transcript: string;
}): Promise<string | null> {
  const user = `Video-Titel: ${input.title}

Transkript:
${input.transcript.slice(0, MAX_TRANSCRIPT_CHARS)}

Destilliere die E-Mail-Marketing-Frameworks.`;

  const raw = await callAnthropic({
    model: DISTILL_MODEL,
    system: DISTILL_SYSTEM,
    user,
    maxTokens: 1200,
  });

  const text = raw.trim();
  if (!text || text.includes("KEINE_VERWERTBAREN_ERKENNTNISSE")) return null;
  return text;
}

// ─── Verdichtung der Gesamt-Wissensbasis ────────────────────────────────────

const COMPACT_SYSTEM = `Du bist Redakteur einer E-Mail-Marketing-Wissensbasis. Du bekommst mehrere destillierte Notiz-Blöcke aus verschiedenen Videos und verdichtest sie zu EINEM kohärenten, redundanzfreien Frameworks-Dokument.

Regeln:
- Dedupliziere überlappende Punkte, behalte den jeweils konkretesten.
- Gruppiere thematisch unter ### Überschriften (z.B. Betreffzeilen, Struktur, Deliverability, Sequenzen, Copywriting, Conversion).
- Nur anwendbare Heuristiken/Zahlen/Muster. Keine Eigennamen-Werbung, keine Anekdoten.
- Deutsch, kompakt, Bullet-Points. Maximal ~600 Wörter.
- Antworte NUR mit dem Markdown-Dokument, ohne Vorrede.`;

/**
 * Verdichtet viele Einzel-Notizen zu einem kompakten Gesamt-Dokument. Wird
 * aufgerufen, wenn die simple Konkatenation zu groß wird.
 */
export async function compactKnowledge(notesBlocks: string[]): Promise<string> {
  const joined = notesBlocks.join("\n\n---\n\n");
  const raw = await callAnthropic({
    model: DISTILL_MODEL,
    system: COMPACT_SYSTEM,
    user: `Hier sind die destillierten Notiz-Blöcke:\n\n${joined}\n\nVerdichte sie zu einem Dokument.`,
    maxTokens: 2000,
  });
  return raw.trim();
}

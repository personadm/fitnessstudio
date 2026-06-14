/**
 * Funnel-AI — System-Prompts mit destillierten E-Mail-Marketing-Frameworks.
 *
 * Die Basis-Frameworks sind fest verankert. Zusätzlich wird zur Laufzeit die
 * laufend aktualisierte KI-Wissensbasis injiziert (destilliert aus analysierten
 * Experten-Transkripten, siehe src/lib/knowledge/*).
 *
 * Zwei Builder:
 *   - buildFunnelSystemPrompt(knowledge?) → kompletter Funnel mit mehreren Mails
 *   - buildStepSystemPrompt(knowledge?)   → eine einzelne Mail
 */

// ─── GEMEINSAME BASIS-FRAMEWORKS ────────────────────────────────────────
const COMMON_FRAMEWORKS = `Du schreibst E-Mails für Tim Bodons Fitness-Studios "Deine Gesundheitscoaches" (Vital-Fit Ochtrup, Villa-Fit Ahaus). Zielgruppe: Erwachsene 40–70 mit Gewichtsproblemen, Gelenkschmerzen oder Energiemangel. Hauptangebot: 6-Wochen-Programm (99 €, von Krankenkassen erstattet), danach optionale Mitgliedschaft.

Du folgst diesen Hormozi-Frameworks STRIKT:

## Mozi-Minute-Struktur (jede einzelne Mail)
- **Subject**: Marken-Anker + spezifisches Versprechen. Kein Clickbait. Kein Übertreiben.
- **Reward** (1–2 Zeilen am Anfang): Quote, Mini-Stat oder eine schnelle Wahrheit. Belohnt den Klick BEVOR die eigentliche Mail beginnt.
- **Meat** (max. ~200 Wörter / unter 1 Min Lesezeit): GENAU ein Problem + GENAU eine Lösung + GENAU eine konkrete Taktik. Nicht zwei. Eines.
- **CTA** (eine, max. zwei): Klar, kontextuell. Niemals "Klick hier", immer "Sichere dir deinen Platz", "Hol dir den Plan", o.Ä.
- **PS-Statement**: Beyond Subject das meistgelesene Element. Zweite CTA, Geschenk, Cliffhanger zur nächsten Mail.

## Value Equation
Wert = (Dream Outcome × Wahrscheinlichkeit) ÷ (Zeitaufwand × Anstrengung)

In jeder Mail entweder Outcome verstärken, Wahrscheinlichkeit erhöhen (Beweise, Garantien), Zeit verkürzen oder Aufwand reduzieren.

## Reward-Loop
Verhalten wird durch das geformt was DANACH passiert. Konsequenz:
- Jeder Mail-Open MUSS sofort belohnt werden (Reward-Item oben).
- Jeder Klick MUSS auf etwas Wertvolles führen.
- Jede beantwortete Frage MUSS einen nächsten konkreten Schritt aufzeigen.

## Anti-Patterns — NIEMALS in eine Mail
- KEINE Bilder (außer wenn explizit gewünscht). E-Mails sollen aussehen wie persönliche E-Mails, nicht wie Vegas-Strip.
- KEINE "Geld-Sprache" im Body wenn vermeidbar (€-Zeichen, Preise, "Rabatt", "Sparen") — landet im Promo-Tab.
- MAX 1–2 Links pro Mail. Bei mehr Links sinkt die Deliverability.
- KEINE generischen Floskeln wie "Liebe Grüße aus dem Team", "Herzlich willkommen bei uns" am Anfang.
- KEIN Verkaufs-Pitch als ersten Eindruck. Erst Goodwill deponieren.
- KEINE langen Mails (> 250 Wörter ist zu lang außer Story-Mode wurde explizit gewünscht).

## Testimonial-Frameworks
Wenn Testimonials genutzt werden: IMMER pain-based hook am Anfang. Hormozi hat aus 2500+ Testimonials gefunden, dass die besten immer ein konkreter Moment der Verzweiflung sind:
- "Ich war 47 und hatte aufgegeben, je wieder in meine Lieblings-Jeans zu passen."
- "Jeden Morgen war Aufstehen ein Kampf — meine Knie haben mich gehasst."

NIE generisch: "Ich war unsicher" oder "Ich wollte mich verbessern."

## Deutsche Sprache + du-Form
ALLE Mails strikt **du-Form**. Niemals Sie. Niemals Englisch (außer Eigennamen). Stil: warm, direkt, ohne Diätstress, ohne Leistungsdruck — passt zum Markenversprechen.`;

// ─── PROMPT FÜR EINEN KOMPLETTEN FUNNEL ────────────────────────────────
const FUNNEL_SYSTEM_BASE = `${COMMON_FRAMEWORKS}

## Sequenz-Architektur (für mehrteilige Funnels)

Bei Funnels mit N Mails:
- **Mail 1 (sofort)**: Onboarding-Belohnung. "Du bist drin. Hier ist sofort etwas Wertvolles." KEIN Verkauf.
- **Mail 2 (typisch 3–24h)**: Pain-Agitate. Problem benennen mit konkretem Beispiel, ohne Lösung.
- **Mail 3 (1–3 Tage)**: Lösung anteasern + erstes Mini-Win.
- **Mail 4–N (gestaffelt)**: Beweise (Testimonials mit pain-based hook), Einwand-Behandlung, Offer-Konkretisierung.
- **Letzte Mail (Deadline)**: Klare Deadline + finaler Pitch — nur wenn das WIRKLICH so ist.

## Naming-Variation (für wiederkehrende Funnels / Quarterly Cleanup)
Falls später re-launched, variiere den Wrapper:
- Saisonal: "Slim für den Sommer", "Lean bis Weihnachten", "Frühlings-Reset"
- Schmerzpunkt: "Knieschmerz-Frei in 6 Wochen", "Treppe steigen ohne Pause"
- Outcome-Konkret: "10 kg bis zur Hochzeit", "Wieder in Jeans Größe 40"

---

# Output-Format

Antworte AUSSCHLIESSLICH mit JSON, OHNE Markdown-Codeblock, OHNE einleitenden Text:

{
  "name": "Funnel-Name",
  "description": "1-Satz-Beschreibung",
  "rationale": "2-3 Sätze warum diese Sequenz funktioniert (Hormozi-Frameworks zitieren)",
  "steps": [
    {
      "orderNum": 1,
      "delayDays": 0,
      "delayHours": 0,
      "subject": "Betreffzeile",
      "previewText": "Preview-Text (~100 Zeichen)",
      "bodyHtml": "<p>Mail-Body als sauberes HTML mit <p>, <strong>, <em>, max 1-2 <a> Tags. Keine <img>. Keine <div>. Keine inline styles.</p>",
      "rationale": "1 Satz warum dieser Step zu diesem Zeitpunkt"
    }
  ]
}

bodyHtml ist VALIDES HTML mit <p>, <strong>, <em>, <br>, <a href>. Sonst nichts. Variablen wie {{firstName}} erlaubt. Steps aufsteigend nach Gesamtzeit sortiert. Beginne JETZT mit dem JSON.`;

// ─── PROMPT FÜR EINE EINZELNE MAIL ─────────────────────────────────────
const STEP_SYSTEM_BASE = `${COMMON_FRAMEWORKS}

## Position der Mail im Funnel
Du generierst EINE einzelne Mail. Die Position im Funnel wird dir mit dem User-Prompt mitgeteilt:
- **"erste"**: Onboarding-Belohnung. Reine Wertvermittlung. KEIN Verkauf, KEIN Pitch.
- **"agitate"**: Pain-Agitate. Problem konkret benennen, oft mit Mini-Story. Lösung wird angeteasert oder ganz ausgelassen.
- **"solution"**: Lösung präsentieren, erstes Mini-Win zeigen. Macht den Wert der Lösung greifbar.
- **"proof"**: Beweise. Testimonials mit pain-based hook. Vorher/Nachher.
- **"objection"**: Einwand-Behandlung. "Aber ich habe keine Zeit", "Aber ich bin zu alt", "Aber Diäten haben nie geklappt".
- **"offer"**: Konkrete Offer. Konditionen, Garantie, was passiert nach dem Klick.
- **"deadline"**: Letzte Mail. Klare Deadline. Finaler Pitch.
- **"standalone"**: Einzelne Mail außerhalb einer Sequenz. Provide value + soft CTA.

---

# Output-Format

Antworte AUSSCHLIESSLICH mit JSON, OHNE Markdown-Codeblock, OHNE einleitenden Text:

{
  "subject": "Betreffzeile (max 60 Zeichen, Marken-Anker + Versprechen)",
  "previewText": "Preview-Text der in der Inbox unter dem Subject angezeigt wird (~100 Zeichen)",
  "bodyHtml": "<p>Mail-Body als sauberes HTML mit <p>, <strong>, <em>, max 1-2 <a> Tags. Keine <img>. Keine <div>. Keine inline styles.</p>",
  "rationale": "1-2 Sätze warum diese Mail in dieser Position so funktioniert"
}

bodyHtml ist VALIDES HTML mit <p>, <strong>, <em>, <br>, <a href>. Sonst nichts. Variablen wie {{firstName}} und {{lastName}} erlaubt. Beginne JETZT mit dem JSON.`;

// ─── SYSTEM-PROMPT-BUILDER (mit dynamischer Wissensbasis) ───────────────
/**
 * Hängt die laufend aktualisierte KI-Wissensbasis an einen Basis-System-Prompt.
 * Bei leerer Wissensbasis bleibt der Basis-Prompt unverändert (Fallback).
 */
function withKnowledge(base: string, knowledge: string): string {
  const trimmed = knowledge.trim();
  if (!trimmed) return base;
  return `${base}

## Aktuelle E-Mail-Marketing-Erkenntnisse (laufend aus Experten-Transkripten destilliert)
Beziehe die folgenden Frameworks aktiv mit ein, wo sie zur Aufgabe passen. Sie ergänzen — und bei Konflikt präzisieren — die obigen Basis-Frameworks:

${trimmed}`;
}

/** System-Prompt für einen kompletten Funnel (mehrere Mails). */
export function buildFunnelSystemPrompt(knowledge = ""): string {
  return withKnowledge(FUNNEL_SYSTEM_BASE, knowledge);
}

/** System-Prompt für eine einzelne Mail. */
export function buildStepSystemPrompt(knowledge = ""): string {
  return withKnowledge(STEP_SYSTEM_BASE, knowledge);
}

// ─── INPUT-SCHEMAS ──────────────────────────────────────────────────────

/** Eingabe für komplette Funnel-Generierung */
export interface FunnelGenerationInput {
  zielgruppe: string;
  ziel: string;
  painPoints?: string;
  ton?: "direkt" | "empathisch" | "story";
  anzahlMails?: number;
  zeitabstaendeStunden?: number[];
  zusatzkontext?: string;
  /** Ziel-URL der Landingpage — wird als href für alle CTA-Links genutzt. */
  landingPageUrl?: string;
}

/** Eingabe für Einzel-Mail-Generierung */
export interface StepGenerationInput {
  zielgruppe: string;
  /** Was diese eine Mail erreichen soll */
  zielDerMail: string;
  painPoints?: string;
  /** Position im Funnel — bestimmt Stil/Aufbau */
  position?:
    | "erste"
    | "agitate"
    | "solution"
    | "proof"
    | "objection"
    | "offer"
    | "deadline"
    | "standalone";
  ton?: "direkt" | "empathisch" | "story";
  zusatzkontext?: string;
}

// ─── PROMPT-BUILDER ─────────────────────────────────────────────────────

export function buildUserPrompt(input: FunnelGenerationInput): string {
  const anzahl = input.anzahlMails ?? 5;
  const defaultStunden = [0, 24, 72, 120, 168];
  const stunden = input.zeitabstaendeStunden ?? defaultStunden.slice(0, anzahl);

  const stundenFormatiert = stunden
    .map((h, i) => {
      const days = Math.floor(h / 24);
      const hours = h % 24;
      const label =
        days > 0 && hours > 0
          ? `${days} Tag${days > 1 ? "e" : ""} und ${hours} Stunden`
          : days > 0
            ? `${days} Tag${days > 1 ? "e" : ""}`
            : hours > 0
              ? `${hours} Stunden`
              : "sofort";
      return `Mail ${i + 1}: ${label} nach Funnel-Start (delayDays=${days}, delayHours=${hours})`;
    })
    .join("\n");

  return `Generiere einen Funnel mit folgenden Parametern:

**Zielgruppe**: ${input.zielgruppe}

**Ziel des Funnels**: ${input.ziel}

${input.painPoints ? `**Pain Points der Zielgruppe**: ${input.painPoints}` : ""}

**Tonalität**: ${input.ton ?? "empathisch"} (warmer Ton, ohne Druck, du-Form)

**Anzahl Mails**: ${anzahl}

**Zeitplan**:
${stundenFormatiert}

${input.zusatzkontext ? `**Zusatzkontext**: ${input.zusatzkontext}` : ""}

${
  input.landingPageUrl
    ? `**Landingpage-Link**: ${input.landingPageUrl}
Nutze GENAU diese URL als href für JEDEN Call-to-Action-Link (<a href="${input.landingPageUrl}">…</a>). Erfinde keine anderen URLs und verwende keine Platzhalter-Links. Beachte trotzdem das Limit von max. 1–2 Links pro Mail.`
    : ""
}

Beachte die Hormozi-Frameworks aus dem System-Prompt strikt. Generiere jetzt das JSON.`;
}

export function buildStepPrompt(input: StepGenerationInput): string {
  return `Generiere EINE einzelne Mail mit folgenden Parametern:

**Zielgruppe**: ${input.zielgruppe}

**Ziel dieser Mail**: ${input.zielDerMail}

${input.painPoints ? `**Pain Points der Zielgruppe**: ${input.painPoints}` : ""}

**Position im Funnel**: ${input.position ?? "standalone"}

**Tonalität**: ${input.ton ?? "empathisch"} (warmer Ton, ohne Druck, du-Form)

${input.zusatzkontext ? `**Zusatzkontext**: ${input.zusatzkontext}` : ""}

Beachte die Hormozi-Frameworks aus dem System-Prompt strikt. Generiere jetzt das JSON für genau diese eine Mail.`;
}

// ─── RESPONSE-VALIDIERUNG ───────────────────────────────────────────────

export interface GeneratedFunnel {
  name: string;
  description: string;
  rationale: string;
  steps: Array<{
    orderNum: number;
    delayDays: number;
    delayHours: number;
    subject: string;
    previewText: string;
    bodyHtml: string;
    rationale: string;
  }>;
}

export interface GeneratedStep {
  subject: string;
  previewText: string;
  bodyHtml: string;
  rationale: string;
}

export function isGeneratedFunnel(x: unknown): x is GeneratedFunnel {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.name !== "string" || typeof o.description !== "string") return false;
  if (!Array.isArray(o.steps)) return false;
  for (const step of o.steps) {
    if (!step || typeof step !== "object") return false;
    const s = step as Record<string, unknown>;
    if (typeof s.subject !== "string" || typeof s.bodyHtml !== "string") return false;
    if (typeof s.delayDays !== "number" || typeof s.delayHours !== "number") return false;
  }
  return true;
}

export function isGeneratedStep(x: unknown): x is GeneratedStep {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.subject === "string" && typeof o.bodyHtml === "string";
}

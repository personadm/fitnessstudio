// KI-Texter für Marketing-Mails. Ruft die Anthropic API direkt
// per fetch() auf — keine externe Abhängigkeit nötig.

const STUDIO_NAME = process.env.STUDIO_NAME ?? "Dein Fitnessstudio";

export type Tone = "warm" | "professionell" | "kurz" | "motivierend";
export type EmailKind = "newsletter" | "funnel";

const TONE_DESCRIPTIONS: Record<Tone, string> = {
  warm:
    "Warm, locker, persönlich. Du-Form. Wie ein guter Trainer der mit Mitgliedern direkt redet. Authentisch, gerne mal eine kurze rhetorische Frage. Keine Marketing-Floskeln.",
  professionell:
    "Sachlich, professionell, kompetent. Du-Form, aber respektvoll. Klare Aussagen, kein Übermarketing, keine leeren Phrasen.",
  kurz:
    "Sehr kurz, direkt auf den Punkt. Maximal 4 Sätze im Body. Du-Form. Kein Smalltalk, keine Floskeln, eine klare Aussage und ein klares CTA.",
  motivierend:
    "Energisch, motivierend, mit Drive. Du-Form. Aktive Verben, klare Action-Statements. Bringt den Leser in Bewegung. Aber kein Schreikram.",
};

interface ImageInput {
  base64: string; // ohne Data-URI-Prefix, nur die rohen base64-Bytes
  mediaType: string; // "image/jpeg", "image/png", "image/webp"
}

/**
 * Generiert Betreff + Body-HTML aus einem Briefing und optional Fotos.
 *
 * Bilder kommen mit als Vision-Input zur KI. Die KI darf an passenden
 * Stellen Platzhalter setzen: <!--IMAGE-1-->, <!--IMAGE-2-->, <!--IMAGE-3-->.
 * Diese werden anschließend in der Route durch echte <img>-Tags ersetzt.
 */
export async function generateEmailContent(input: {
  brief: string;
  images: ImageInput[];
  tone: Tone;
  kind: EmailKind;
}): Promise<{ subject: string; bodyHtml: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY ist nicht gesetzt.");
  }

  const isFunnel = input.kind === "funnel";
  const hasImages = input.images.length > 0;

  const imageInstruction = hasImages
    ? `- Bilder: Es sind ${input.images.length} Foto${input.images.length === 1 ? "" : "s"} dabei. Setze an inhaltlich passender Stelle im Body Platzhalter im Format <!--IMAGE-1-->, <!--IMAGE-2-->, <!--IMAGE-3--> (in Reihenfolge der Fotos). Jeder Platzhalter steht in einer eigenen Zeile zwischen Absätzen, NICHT innerhalb eines <p>-Tags. Wähle Stellen wo das Bild den Text unterstützt — z.B. nach dem Aufmacher, vor dem CTA, oder zur Auflockerung mittendrin. Diese Platzhalter werden später automatisch durch <img>-Tags ersetzt.`
    : `- Bilder: keine vorhanden, also keine Bild-Platzhalter setzen.`;

  const systemPrompt = `Du bist ein erfahrener E-Mail-Marketing-Texter für ${STUDIO_NAME}, ein Fitnessstudio.

Aus einem Briefing und ggf. Fotos baust du eine fertige Marketing-Mail. Du rufst dazu IMMER das Tool "create_email" auf — niemals normalen Text als Antwort.

REGELN:
- Sprache: Deutsch.
- Ton: ${TONE_DESCRIPTIONS[input.tone]}
- Anrede: ${
    isFunnel
      ? `Verwende {{firstName}} als Platzhalter — z.B. „Hallo {{firstName}}," oder „Hi {{firstName}},". Wird beim Versand automatisch durch den echten Vornamen ersetzt.`
      : `Allgemeine Anrede („Hallo zusammen,", „Hi,", „Liebe Mitglieder," — passend zum Ton).`
  }
- HTML: NUR diese Tags sind erlaubt: <p>, <strong>, <em>, <a href="..."> (mit echtem Link!), <br>, <ul>, <li>, <h2>, <h3>. KEIN <html>, <head>, <body>, <div>, <span>. KEIN style-Attribut, KEINE class. Das Studio-Layout (Header mit Studio-Name etc.) wird automatisch drumherum gebaut.
${imageInstruction}
- Länge: passend zum Ton. Bei "kurz und knapp" maximal 4 Sätze. Sonst: Aufmacher, Hauptteil (1-3 Absätze), klares Call-to-Action.
- Keine Unterschrift hinten ("— Studio XYZ" o.ä.) — die wird automatisch hinzugefügt.
- Kein "Liebe Grüße"/"Bis bald" am Ende, es sei denn der Ton verlangt es ausdrücklich.`;

  // User-Message mit Bildern und Briefing zusammenbauen
  const userContent: Array<
    | { type: "text"; text: string }
    | {
        type: "image";
        source: { type: "base64"; media_type: string; data: string };
      }
  > = [];

  for (let i = 0; i < input.images.length; i++) {
    const img = input.images[i];
    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType,
        data: img.base64,
      },
    });
    userContent.push({
      type: "text",
      text: `(Foto ${i + 1})`,
    });
  }

  userContent.push({
    type: "text",
    text: `Briefing: ${input.brief}`,
  });

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
      // Wir zwingen das Modell zur strukturierten Antwort via Tool-Use.
      // Damit umgehen wir das JSON-Roulette mit unescaped Quotes & Newlines —
      // die API garantiert valides Schema-Eingabe-Format.
      tools: [
        {
          name: "create_email",
          description: "Erstellt die fertige Marketing-E-Mail aus dem Briefing.",
          input_schema: {
            type: "object",
            properties: {
              subject: {
                type: "string",
                description:
                  "Betreffzeile der Mail. Maximal 70 Zeichen, knackig, ohne Emoji am Anfang.",
              },
              bodyHtml: {
                type: "string",
                description:
                  "HTML-Body der Mail. Nur erlaubte Tags: <p>, <strong>, <em>, <a href>, <br>, <ul>, <li>, <h2>, <h3>. KEINE style-Attribute, KEINE class. Bild-Platzhalter <!--IMAGE-1-->, <!--IMAGE-2-->, <!--IMAGE-3--> jeweils in eigener Zeile zwischen Absätzen.",
              },
            },
            required: ["subject", "bodyHtml"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "create_email" },
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[ai] API-Fehler:", response.status, errText);
    throw new Error(`KI-API antwortet mit Status ${response.status}.`);
  }

  const data = (await response.json()) as {
    content?: Array<{
      type: string;
      text?: string;
      name?: string;
      input?: { subject?: string; bodyHtml?: string };
    }>;
  };

  // Tool-Use-Block aus der Antwort fischen
  const toolUse = data.content?.find(
    (b) => b.type === "tool_use" && b.name === "create_email",
  );

  if (toolUse?.input?.subject && toolUse.input.bodyHtml) {
    return {
      subject: toolUse.input.subject,
      bodyHtml: toolUse.input.bodyHtml,
    };
  }

  // Fallback: falls die KI doch mit Text antwortet (sollte mit tool_choice nicht passieren,
  // aber zur Sicherheit), versuchen wir das alte JSON-Parsing
  const textBlock = data.content?.find((b) => b.type === "text");
  if (!textBlock?.text) {
    console.error("[ai] Weder tool_use noch text in Antwort:", JSON.stringify(data.content));
    throw new Error("Keine verwertbare Antwort von der KI bekommen.");
  }

  let parsed: { subject?: string; bodyHtml?: string };
  try {
    const cleaned = sanitizeJsonResponse(textBlock.text);
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("[ai] JSON-Parse fehlgeschlagen. Roh:", textBlock.text);
    console.error("[ai] Fehler:", err);
    throw new Error("KI-Antwort konnte nicht gelesen werden. Versuch's nochmal.");
  }

  if (!parsed.subject || !parsed.bodyHtml) {
    throw new Error("KI-Antwort unvollständig.");
  }

  return { subject: parsed.subject, bodyHtml: parsed.bodyHtml };
}

// ─────────────────────────────────────────────────────────────
// JSON-Sanitizer
// ─────────────────────────────────────────────────────────────

/**
 * Bereitet eine KI-Antwort für JSON.parse vor:
 *  1. Entfernt Markdown-Code-Fences (```json ... ```)
 *  2. Escaped literale Newlines INNERHALB von String-Werten
 *
 * Beides nötig, weil das Modell — trotz expliziter Aufforderung —
 * gerne beides verschickt.
 */
function sanitizeJsonResponse(raw: string): string {
  let cleaned = raw.trim();

  // 1) Code-Fences am Anfang und Ende entfernen
  cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/i, "");
  cleaned = cleaned.replace(/\n?\s*```\s*$/i, "");

  // 2) Falls noch Müll vor dem ersten { oder nach dem letzten } ist (z.B. "Hier ist das JSON:"),
  //    auf den JSON-Bereich beschränken
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace > 0 || (lastBrace >= 0 && lastBrace < cleaned.length - 1)) {
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
  }

  // 3) Literale Newlines/Tabs in String-Values escapen
  //    char-by-char durch, wir tracken ob wir innerhalb eines Strings sind
  let out = "";
  let inString = false;
  let escapeNext = false;
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];

    if (escapeNext) {
      out += c;
      escapeNext = false;
      continue;
    }
    if (c === "\\") {
      out += c;
      escapeNext = true;
      continue;
    }
    if (c === '"') {
      out += c;
      inString = !inString;
      continue;
    }

    if (inString) {
      // Innerhalb eines Strings: literale Steuerzeichen escapen
      if (c === "\n") {
        out += "\\n";
        continue;
      }
      if (c === "\r") {
        out += "\\r";
        continue;
      }
      if (c === "\t") {
        out += "\\t";
        continue;
      }
    }

    out += c;
  }

  return out;
}

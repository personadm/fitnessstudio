import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  buildStepSystemPrompt,
  buildStepPrompt,
  isGeneratedStep,
  type StepGenerationInput,
} from "@/lib/funnelAi";
import { getKnowledgeContent } from "@/lib/knowledge/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/admin/funnels/generate-step
 *
 * Generiert EINE einzelne Funnel-Mail nach bewährten E-Mail-Frameworks.
 *
 * Body: { zielgruppe, zielDerMail, painPoints?, position?, ton?, zusatzkontext? }
 * Response: { ok: true, step: GeneratedStep } oder { ok: false, message }
 *
 * Nutzt ANTHROPIC_API_KEY. Modell: claude-sonnet-4-20250514.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Nicht angemeldet." }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: "ANTHROPIC_API_KEY ist nicht konfiguriert." },
      { status: 500 },
    );
  }

  let input: StepGenerationInput;
  try {
    input = (await req.json()) as StepGenerationInput;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Ungültiger JSON-Body." },
      { status: 400 },
    );
  }

  if (!input.zielgruppe?.trim() || !input.zielDerMail?.trim()) {
    return NextResponse.json(
      { ok: false, message: "Zielgruppe und Ziel der Mail werden benötigt." },
      { status: 400 },
    );
  }

  const userPrompt = buildStepPrompt(input);
  const knowledge = await getKnowledgeContent();
  const systemPrompt = buildStepSystemPrompt(knowledge);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[generate-step] Anthropic API error:", res.status, errorText);
      return NextResponse.json(
        { ok: false, message: `KI-Service nicht erreichbar (HTTP ${res.status}).` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string }>;
    };
    const textBlock = data.content.find((b) => b.type === "text");
    const rawText = textBlock?.text ?? "";

    if (!rawText) {
      return NextResponse.json(
        { ok: false, message: "KI hat keine Antwort geliefert." },
        { status: 502 },
      );
    }

    const cleaned = rawText
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[generate-step] Parse error:", parseErr, "Raw:", cleaned.slice(0, 500));
      return NextResponse.json(
        { ok: false, message: "KI hat ungültiges JSON geliefert. Bitte nochmal probieren." },
        { status: 502 },
      );
    }

    if (!isGeneratedStep(parsed)) {
      return NextResponse.json(
        { ok: false, message: "KI-Antwort entspricht nicht dem erwarteten Format." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, step: parsed });
  } catch (err) {
    console.error("[generate-step] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, message: "Unerwarteter Fehler bei der Generierung." },
      { status: 500 },
    );
  }
}

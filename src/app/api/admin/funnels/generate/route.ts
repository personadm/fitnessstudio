import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  HORMOZI_SYSTEM_PROMPT,
  buildUserPrompt,
  isGeneratedFunnel,
  type FunnelGenerationInput,
} from "@/lib/funnelAi";

export const runtime = "nodejs";
// KI-Generierung kann bis ~60s dauern bei vielen Steps
export const maxDuration = 90;

/**
 * POST /api/admin/funnels/generate
 *
 * Body: { zielgruppe, ziel, painPoints?, ton?, anzahlMails?, zeitabstaendeStunden?, zusatzkontext? }
 * Response: { ok: true, funnel: GeneratedFunnel } oder { ok: false, message: string }
 *
 * Nutzt ANTHROPIC_API_KEY aus den Render-ENV-Variablen.
 * Modell: claude-sonnet-4-20250514 (schnell, günstig, gut für strukturierte Outputs)
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

  let input: FunnelGenerationInput;
  try {
    input = (await req.json()) as FunnelGenerationInput;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Ungültiger JSON-Body." },
      { status: 400 },
    );
  }

  // Minimum-Validierung
  if (!input.zielgruppe || !input.zielgruppe.trim()) {
    return NextResponse.json(
      { ok: false, message: "Zielgruppe fehlt." },
      { status: 400 },
    );
  }
  if (!input.ziel || !input.ziel.trim()) {
    return NextResponse.json(
      { ok: false, message: "Ziel des Funnels fehlt." },
      { status: 400 },
    );
  }

  const userPrompt = buildUserPrompt(input);

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
        max_tokens: 8000,
        system: HORMOZI_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[funnel-generate] Anthropic API error:", res.status, errorText);
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

    // Defensiv: JSON aus eventuellem Markdown-Codeblock extrahieren.
    // Manche Modelle ignorieren die "kein Markdown"-Anweisung gelegentlich.
    const cleaned = rawText
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[funnel-generate] Parse error:", parseErr, "Raw:", cleaned.slice(0, 500));
      return NextResponse.json(
        { ok: false, message: "KI hat ungültiges JSON geliefert. Bitte nochmal probieren." },
        { status: 502 },
      );
    }

    if (!isGeneratedFunnel(parsed)) {
      return NextResponse.json(
        { ok: false, message: "KI-Antwort entspricht nicht dem erwarteten Format." },
        { status: 502 },
      );
    }

    // Steps nach Gesamtzeit sortieren (sollte die KI schon machen, aber sicherheitshalber)
    parsed.steps.sort((a, b) => {
      const aHours = a.delayDays * 24 + a.delayHours;
      const bHours = b.delayDays * 24 + b.delayHours;
      return aHours - bHours;
    });
    // orderNum neu durchnummerieren nach Sortierung
    parsed.steps.forEach((s, i) => {
      s.orderNum = i + 1;
    });

    return NextResponse.json({ ok: true, funnel: parsed });
  } catch (err) {
    console.error("[funnel-generate] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, message: "Unerwarteter Fehler bei der Generierung." },
      { status: 500 },
    );
  }
}

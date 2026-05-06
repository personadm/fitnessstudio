import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateEmailContent, type Tone, type EmailKind } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60; // KI-Aufruf kann ein paar Sekunden dauern

interface ImageInput {
  base64: string;
  mediaType: string;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "ANTHROPIC_API_KEY ist nicht gesetzt. Trage ihn in den Environment Variables auf Render ein.",
      },
      { status: 500 },
    );
  }

  let body: {
    brief?: string;
    tone?: string;
    kind?: string;
    images?: ImageInput[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body ungültig." }, { status: 400 });
  }

  const brief = String(body.brief ?? "").trim();
  const tone = body.tone as Tone;
  const kind = body.kind as EmailKind;
  const images = Array.isArray(body.images) ? body.images : [];

  // Validierung
  if (!brief) {
    return NextResponse.json({ ok: false, message: "Briefing fehlt." }, { status: 400 });
  }
  if (brief.length > 2000) {
    return NextResponse.json(
      { ok: false, message: "Briefing zu lang (max. 2000 Zeichen)." },
      { status: 400 },
    );
  }
  if (!["warm", "professionell", "kurz", "motivierend"].includes(tone)) {
    return NextResponse.json({ ok: false, message: "Ungültiger Ton." }, { status: 400 });
  }
  if (!["newsletter", "funnel"].includes(kind)) {
    return NextResponse.json({ ok: false, message: "Ungültige Mail-Art." }, { status: 400 });
  }
  if (images.length > 3) {
    return NextResponse.json(
      { ok: false, message: "Maximal 3 Bilder erlaubt." },
      { status: 400 },
    );
  }

  // Bilder validieren — Format und grobe Größe
  const validImages: ImageInput[] = [];
  for (const img of images) {
    if (!img || typeof img.base64 !== "string" || typeof img.mediaType !== "string") {
      continue;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(img.mediaType)) {
      return NextResponse.json(
        { ok: false, message: `Bildformat nicht unterstützt: ${img.mediaType}` },
        { status: 400 },
      );
    }
    // Anthropic-API hat Limit ~5MB pro Bild (base64). Wir setzen 4MB als Schwelle.
    const approxBytes = (img.base64.length * 3) / 4;
    if (approxBytes > 4 * 1024 * 1024) {
      return NextResponse.json(
        {
          ok: false,
          message: "Mindestens ein Bild ist zu groß (>4MB nach Komprimierung).",
        },
        { status: 400 },
      );
    }
    validImages.push({ base64: img.base64, mediaType: img.mediaType });
  }

  try {
    const result = await generateEmailContent({
      brief,
      images: validImages,
      tone,
      kind,
    });

    // Bild-Platzhalter durch echte <img>-Tags mit Data-URI ersetzen
    let html = result.bodyHtml;
    validImages.forEach((img, i) => {
      const placeholder = `<!--IMAGE-${i + 1}-->`;
      const imgTag = `<p style="margin:24px 0;text-align:center;"><img src="data:${img.mediaType};base64,${img.base64}" alt="" style="max-width:100%;height:auto;display:inline-block;border:0;" /></p>`;
      html = html.split(placeholder).join(imgTag);
    });
    // Übrig gebliebene Platzhalter (falls KI mehr als geliefert wurden) entfernen
    html = html.replace(/<!--IMAGE-\d+-->/g, "");

    return NextResponse.json({
      ok: true,
      subject: result.subject,
      bodyHtml: html,
    });
  } catch (err) {
    console.error("[/api/admin/ai-compose]", err);
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : "Generierung fehlgeschlagen.",
      },
      { status: 500 },
    );
  }
}

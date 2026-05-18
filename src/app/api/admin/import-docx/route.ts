import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60; // große Dokumente brauchen ggf. Zeit

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

/**
 * POST /api/admin/import-docx
 * Multipart-Form mit Feld "docx" — eine .docx-Datei.
 *
 * Konvertiert das Dokument in HTML inkl. eingebetteter Bilder (als base64
 * data-URLs). User exportiert aus Pages via „Ablage → Exportieren als → Word".
 *
 * Resultierender HTML-Body kann direkt in Funnel-Steps eingespeist werden.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Nicht angemeldet." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Body ungültig." }, { status: 400 });
  }

  const file = formData.get("docx");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "Keine Datei hochgeladen." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { ok: false, message: "Datei zu groß (max. 20 MB)." },
      { status: 400 },
    );
  }
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json(
      {
        ok: false,
        message: `Bitte eine .docx-Datei hochladen. In Pages: „Ablage → Exportieren als → Word".`,
      },
      { status: 400 },
    );
  }

  // mammoth dynamisch importieren — verhindert dass es zur Build-Zeit
  // im Edge-Bundle landet
  let mammoth: typeof import("mammoth");
  try {
    mammoth = await import("mammoth");
  } catch (err) {
    console.error("[import-docx] mammoth import failed", err);
    return NextResponse.json(
      {
        ok: false,
        message:
          "Mammoth-Library nicht installiert. Lokal `npm install mammoth` ausführen und neu deployen.",
      },
      { status: 500 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const result = await mammoth.convertToHtml(
      { buffer },
      {
        // Bilder als base64 data-URLs eingebettet, damit Mail standalone ist
        convertImage: mammoth.images.imgElement(async (image) => {
          const imageBuffer = await image.read("base64");
          return {
            src: `data:${image.contentType};base64,${imageBuffer}`,
          };
        }),
      },
    );

    return NextResponse.json({
      ok: true,
      html: result.value,
      warnings: result.messages
        .filter((m) => m.type === "warning")
        .slice(0, 10)
        .map((m) => m.message),
    });
  } catch (err) {
    console.error("[import-docx] convertToHtml failed", err);
    return NextResponse.json(
      { ok: false, message: "Konvertierung fehlgeschlagen. Datei eventuell korrupt." },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────
// PDF-Erzeugung: AGB + Widerrufsbelehrung (dauerhafter Datenträger)
//
// Wird als Anhang an die Anmeldebestätigung gehängt (src/lib/mail.ts).
// Inhalte kommen zentral aus src/lib/legal.ts; die studioabhängige GmbH
// (Anbieter) wird als Parameter übergeben.
//
// Reines JS (pdf-lib) — läuft im Node-Runtime ohne native Abhängigkeiten.
// ─────────────────────────────────────────────────────────────

import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import {
  AGB_SECTIONS,
  AGB_STAND,
  anbieterAdresse,
  LEGAL_MAIL,
  widerrufsfolgenText,
  widerrufsrechtText,
  type Anbieter,
} from "./legal";

const PAGE_WIDTH = 595.28; // A4 Hochformat (pt)
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

// pdf-lib-Standardfonts nutzen WinAnsi-Encoding. Typografische Sonderzeichen
// (geschweifte Anführungszeichen, Geviertstrich, Auslassungspunkte, geschützte
// Leerzeichen) werden vorsichtshalber auf ASCII-nahe Varianten gemappt, damit
// das Encoding nie an einem Zeichen scheitert. §, €, äöüß bleiben erhalten
// (in CP1252 vorhanden).
function sanitize(text: string): string {
  return text
    .replace(/[„“”‟]/g, '"')
    .replace(/[‚‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[   ]/g, " ");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = sanitize(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

interface Cursor {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
}

interface ParagraphOptions {
  size: number;
  font: PDFFont;
  gapAfter?: number;
  lineGap?: number;
}

function drawParagraph(cursor: Cursor, text: string, opts: ParagraphOptions): void {
  const lineHeight = opts.size + (opts.lineGap ?? 3);
  const lines = wrapText(text, opts.font, opts.size, CONTENT_WIDTH);
  for (const line of lines) {
    if (cursor.y - lineHeight < MARGIN) {
      cursor.page = cursor.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      cursor.y = PAGE_HEIGHT - MARGIN;
    }
    cursor.page.drawText(line, {
      x: MARGIN,
      y: cursor.y - opts.size,
      size: opts.size,
      font: opts.font,
    });
    cursor.y -= lineHeight;
  }
  cursor.y -= opts.gapAfter ?? 6;
}

export async function buildLegalPdf(anbieter: Anbieter): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("AGB und Widerrufsbelehrung");
  doc.setSubject("Allgemeine Geschäftsbedingungen und Widerrufsbelehrung");

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const cursor: Cursor = {
    doc,
    page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    y: PAGE_HEIGHT - MARGIN,
  };

  // Kopf
  drawParagraph(cursor, "AGB und Widerrufsbelehrung", { size: 16, font: bold, gapAfter: 4 });
  drawParagraph(cursor, `${anbieterAdresse(anbieter)} · ${LEGAL_MAIL}`, {
    size: 9,
    font,
    gapAfter: 16,
  });

  // Widerrufsbelehrung
  drawParagraph(cursor, "Widerrufsbelehrung", { size: 12, font: bold, gapAfter: 6 });
  drawParagraph(cursor, "Widerrufsrecht", { size: 10, font: bold, gapAfter: 2 });
  drawParagraph(cursor, widerrufsrechtText(anbieter), { size: 9.5, font, gapAfter: 8 });
  drawParagraph(cursor, "Widerrufsfolgen", { size: 10, font: bold, gapAfter: 2 });
  drawParagraph(cursor, widerrufsfolgenText(), { size: 9.5, font, gapAfter: 18 });

  // AGB
  drawParagraph(cursor, "Allgemeine Geschäftsbedingungen (Dienstleistung)", {
    size: 12,
    font: bold,
    gapAfter: 2,
  });
  drawParagraph(cursor, `Stand: ${AGB_STAND}`, { size: 8.5, font, gapAfter: 10 });
  for (const section of AGB_SECTIONS) {
    drawParagraph(cursor, section.heading, { size: 10, font: bold, gapAfter: 2 });
    drawParagraph(cursor, section.body, { size: 9.5, font, gapAfter: 8 });
  }

  return doc.save();
}

// Base64-Variante für den Resend-Attachment-Content.
export async function buildLegalPdfBase64(anbieter: Anbieter): Promise<string> {
  const bytes = await buildLegalPdf(anbieter);
  return Buffer.from(bytes).toString("base64");
}

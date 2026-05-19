// Konvertierung zwischen einfachem Editor-Text und HTML-Body für Marketing-Mails.
//
// Der Editor-Text nutzt eine Mini-Markdown-Syntax:
//   **fett**, *kursiv*, URLs auto-link, [BILD-1]/[BILD-2]/[BILD-3] = Bild-Platzhalter
//
// Damit kann der User Mails bearbeiten, ohne HTML zu kennen.

export interface UploadedImage {
  base64: string;
  mediaType: string;
  filename: string;
}

// ─────────────────────────────────────────────────────────────
// HTML → editierbarer Text (für Edit-Modus)
// ─────────────────────────────────────────────────────────────

/**
 * Konvertiert ein bestehendes HTML-Body in einen editierbaren Text mit
 * Markdown-Stil. Eingebettete Bilder (data:base64) werden extrahiert und
 * durch [BILD-N]-Marker ersetzt.
 *
 * Best-effort — ungewöhnliche HTML-Konstrukte werden vereinfacht.
 */
export function htmlToEditableText(html: string): {
  text: string;
  images: UploadedImage[];
} {
  const images: UploadedImage[] = [];
  let imgCounter = 0;
  let text = html;

  // 1) Bilder extrahieren → [BILD-N]-Marker setzen, Bilder in Array sammeln.
  //    Wir akzeptieren maximal 3 Bilder (Rest wird ignoriert).
  text = text.replace(
    /<img\b[^>]*src=["']data:([^;]+);base64,([^"']+)["'][^>]*\/?>/gi,
    (_match, mediaType: string, base64: string) => {
      if (imgCounter >= 3) return ""; // mehr als 3 Bilder → weglassen
      imgCounter++;
      images.push({
        base64,
        mediaType,
        filename: `bild-${imgCounter}`,
      });
      return `\n\n[BILD-${imgCounter}]\n\n`;
    },
  );

  // 2) KI-Marker (vor Bild-Replacement) auch zu unseren Markern
  text = text.replace(/<!--\s*IMAGE-([123])\s*-->/gi, "[BILD-$1]");

  // 3) Block-Tags zu Markdown
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n\n");
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n\n");

  // 4) Listen
  text = text.replace(/<\/?ul[^>]*>/gi, "\n");
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");

  // 5) Inline-Formatting
  text = text.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
  text = text.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
  text = text.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
  text = text.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");

  // 6) Links: <a href="X">Y</a> → wenn X === Y nur die URL, sonst [Y](X)
  text = text.replace(
    /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_match, href: string, inner: string) => {
      const clean = inner.replace(/<[^>]+>/g, "").trim();
      if (!clean || clean === href) return href;
      return `[${clean}](${href})`;
    },
  );

  // 7) Paragraphen → doppelte Newlines
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, "\n\n");
  text = text.replace(/<p[^>]*>/gi, "");
  text = text.replace(/<\/p>/gi, "\n\n");

  // 8) <br> → newline
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // 9) Unbekannte Tags weg
  text = text.replace(/<[^>]+>/g, "");

  // 10) HTML-Entities decoden (grob)
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // 11) Mehrfache Newlines → max. zwei
  text = text.replace(/\n{3,}/g, "\n\n");

  return { text: text.trim(), images };
}

// ─────────────────────────────────────────────────────────────
// Text + Bilder → HTML (für Versand)
// ─────────────────────────────────────────────────────────────

/**
 * Konvertiert Editor-Text + Bilder in HTML für den Mail-Versand.
 * Spiegelbild von htmlToEditableText.
 */
export function editableTextToHtml(
  text: string,
  images: (UploadedImage | null)[],
): string {
  const paragraphs = text.split(/\n\s*\n+/);

  const blocks = paragraphs
    .map((para) => {
      let p = para.trim();
      if (!p) return "";

      // Reines Bild → eigenständig, zentriert
      const onlyImage = p.match(/^\[BILD-([123])\]$/);
      if (onlyImage) {
        const idx = parseInt(onlyImage[1], 10) - 1;
        const img = images[idx];
        if (!img) return "";
        return `<p><img src="data:${img.mediaType};base64,${img.base64}" alt="" style="max-width:100%;height:auto;" /></p>`;
      }

      // Headings
      if (p.startsWith("## ")) {
        return `<h2>${escapeHtml(p.slice(3))}</h2>`;
      }
      if (p.startsWith("### ")) {
        return `<h3>${escapeHtml(p.slice(4))}</h3>`;
      }

      // Listen (wenn alle Zeilen mit "- " beginnen)
      const lines = p.split("\n");
      if (lines.every((l) => l.trim().startsWith("- "))) {
        const items = lines
          .map((l) => `<li>${formatInline(l.trim().slice(2), images)}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }

      // Normaler Paragraph
      p = formatInline(p, images);
      // Einzelne Newlines → <br>
      p = p.replace(/\n/g, "<br>");
      return `<p>${p}</p>`;
    })
    .filter(Boolean);

  return blocks.join("\n");
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatInline(s: string, images: (UploadedImage | null)[]): string {
  // Bild-Platzhalter inline (nicht-allein) → inline-img
  let out = s.replace(/\[BILD-([123])\]/g, (_m, n: string) => {
    const idx = parseInt(n, 10) - 1;
    const img = images[idx];
    if (!img) return "";
    return `<img src="data:${img.mediaType};base64,${img.base64}" alt="" style="max-width:100%;height:auto;" />`;
  });

  // Markdown-Links: [Text](URL) → <a href="URL">Text</a>
  // (vor auto-link für nakte URLs, sonst würde die URL in der Klammer zuerst gematcht)
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_match, text: string, url: string) => `<a href="${url}">${text}</a>`,
  );

  // **fett**
  out = out.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
  // *kursiv* (nicht ** zweimal hintereinander)
  out = out.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>");

  // Nackte URLs auto-linken — nur wenn sie NICHT schon in einem href stecken
  // (durch [Text](URL)-Konvertierung oben). Wir nutzen einen Negativ-Lookbehind
  // auf href=" und auf > (das schließt URLs als href und als Linktext aus).
  out = out.replace(
    /(?<!href=["'])(?<!>)(https?:\/\/[^\s<)]+)/g,
    '<a href="$1">$1</a>',
  );

  return out;
}

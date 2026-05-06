"use client";

import { useState } from "react";

interface Props {
  subject: string;
  bodyHtml: string;
}

/**
 * Zeigt eine Live-Vorschau einer Mail im echten Studio-Layout.
 * Tab-Switcher zwischen gerenderter Ansicht und Roh-HTML.
 *
 * Das HTML wird in einem sandboxed iframe gerendert — komplett isoliert
 * vom Dashboard-CSS, kein XSS, keine Skripte. Bilder (auch data: URIs) gehen.
 */
export function EmailPreview({ subject, bodyHtml }: Props) {
  const [view, setView] = useState<"preview" | "html">("preview");

  if (!bodyHtml.trim()) return null;

  const wrappedHtml = wrapForPreview(bodyHtml);

  return (
    <div className="border border-ink/15">
      {/* Header: Betreff + Tab-Switcher */}
      <div className="flex items-center justify-between gap-3 border-b border-ink/15 bg-ink/5 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            Betreff
          </p>
          <p className="mt-0.5 truncate text-sm font-medium">
            {subject || "(noch kein Betreff)"}
          </p>
        </div>
        <div className="flex border border-ink/20 shrink-0">
          <button
            type="button"
            onClick={() => setView("preview")}
            className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors ${
              view === "preview" ? "bg-ink text-cream" : "hover:bg-ink/5"
            }`}
          >
            Vorschau
          </button>
          <button
            type="button"
            onClick={() => setView("html")}
            className={`border-l border-ink/20 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors ${
              view === "html" ? "bg-ink text-cream" : "hover:bg-ink/5"
            }`}
          >
            HTML
          </button>
        </div>
      </div>

      {/* Inhalt */}
      {view === "preview" ? (
        <iframe
          srcDoc={wrappedHtml}
          title="E-Mail-Vorschau"
          sandbox=""
          className="block w-full bg-cream"
          style={{ height: "560px", border: 0 }}
        />
      ) : (
        <pre className="max-h-[560px] overflow-auto bg-ink/5 p-4 font-mono text-xs text-ink whitespace-pre-wrap break-words">
          {bodyHtml}
        </pre>
      )}
    </div>
  );
}

/**
 * Bettet den Body in das echte Studio-Mail-Layout ein.
 * Identisch zu campaignWrapperTemplate in src/lib/mail.ts —
 * so siehst du wirklich was beim Empfänger ankommt.
 */
function wrapForPreview(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin:0; padding:0; background:#F5F0E8; font-family:Georgia,serif; color:#1A1815; }
  img { max-width: 100%; height: auto; }
  a { color:#1A1815; }
</style>
</head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #D8D2C7;max-width:100%;">
        <tr><td style="padding:40px;font-size:16px;line-height:1.6;">
          <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8A857E;margin:0 0 24px;">— Vorschau —</p>
          ${bodyHtml}
        </td></tr>
      </table>
      <p style="font-family:'Courier New',monospace;font-size:11px;color:#8A857E;margin:16px 0 0;">So sieht die Mail beim Empfänger aus</p>
    </td></tr>
  </table>
</body></html>`;
}

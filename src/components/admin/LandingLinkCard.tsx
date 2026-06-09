"use client";

import { useState } from "react";

/**
 * Zeigt die öffentliche Landingpage-Adresse des Studios mit Öffnen- und
 * Kopier-Button. `url` ist die vollständige URL (inkl. Host).
 */
export function LandingLinkCard({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard nicht verfügbar — Nutzer kann den Link manuell markieren */
    }
  }

  return (
    <div className="border border-ink/15 bg-white/60 p-4 md:p-6">
      <p className="label">Deine Landingpage</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate font-mono text-sm text-acid_dark underline underline-offset-2 hover:text-ink"
          title={url}
        >
          {url}
        </a>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copy}
            className="border border-ink/20 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-ink hover:text-cream"
          >
            {copied ? "Kopiert ✓" : "Kopieren"}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-acid hover:bg-ink-soft"
          >
            Öffnen →
          </a>
        </div>
      </div>
    </div>
  );
}

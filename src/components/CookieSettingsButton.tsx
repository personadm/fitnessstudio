"use client";

import { REOPEN_EVENT } from "./CookieConsent";

/**
 * Dezenter Footer-Link, der die Cookie-Leiste erneut öffnet — Widerruf bzw.
 * Änderung der Einwilligung. Sieht aus wie die übrigen Footer-Links.
 */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(REOPEN_EVENT))}
      className={className}
    >
      Cookie-Einstellungen
    </button>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { loadMetaPixel } from "@/lib/pixel";

// Persistenz-Schlüssel & Werte. Der beforeInteractive-Consent-Default in
// GoogleAds.tsx liest denselben localStorage-Key, um wiederkehrende Besucher
// mit "Okay" schon vor dem Banner-Klick auf granted zu setzen.
const STORAGE_KEY = "cookie-consent";
const GRANTED = "granted";
const DENIED = "denied";

// Event, mit dem der dezente Footer-Link "Cookie-Einstellungen" den Banner
// erneut öffnet (Widerruf/Änderung der Entscheidung).
export const REOPEN_EVENT = "cookie:reopen";

function updateGoogleConsent(granted: boolean): void {
  const value = granted ? GRANTED : DENIED;
  window.gtag?.("consent", "update", {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    analytics_storage: value,
  });
}

/**
 * Dezente Cookie-Consent-Leiste am unteren Bildschirmrand.
 *
 * - Kein Overlay, kein Blur, keine Blockade: Seite und Lead-Formular bleiben
 *   ohne Interaktion mit dem Banner voll nutzbar.
 * - Google Consent Mode v2: "Okay" → alle Kategorien granted; "Nur Notwendige"
 *   → bleibt denied (Default aus GoogleAds.tsx).
 * - Meta-Pixel wird erst nach "Okay" initialisiert.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage blockiert → Banner sicherheitshalber zeigen.
    }

    if (stored === GRANTED) {
      // Wiederkehrender Besucher mit Einwilligung: Pixel nachladen (der
      // Google-Consent-Default wurde bereits in GoogleAds.tsx hochgesetzt).
      loadMetaPixel();
    } else if (stored !== DENIED) {
      // Noch keine Entscheidung → Leiste einblenden.
      setVisible(true);
    }

    const reopen = () => setVisible(true);
    window.addEventListener(REOPEN_EVENT, reopen);
    return () => window.removeEventListener(REOPEN_EVENT, reopen);
  }, []);

  const persist = useCallback((value: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Nicht persistierbar → Entscheidung gilt zumindest für diese Sitzung.
    }
  }, []);

  const accept = useCallback(() => {
    persist(GRANTED);
    updateGoogleConsent(true);
    loadMetaPixel();
    setVisible(false);
  }, [persist]);

  const reject = useCallback(() => {
    persist(DENIED);
    updateGoogleConsent(false);
    setVisible(false);
  }, [persist]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie-Hinweis"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-ink/15 bg-cream/95 backdrop-blur-none"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs leading-relaxed text-ink-soft">
          Wir nutzen Cookies für Statistik &amp; Marketing, um unser Angebot zu
          verbessern.{" "}
          <a
            href="/datenschutz"
            className="underline underline-offset-2 hover:text-ink"
          >
            Datenschutz
          </a>
        </p>
        <div className="flex flex-shrink-0 gap-2">
          <button
            type="button"
            onClick={reject}
            className="rounded-md border border-ink/25 px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-ink/50 hover:text-ink"
          >
            Nur Notwendige
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-md bg-ink px-4 py-1.5 text-xs font-semibold text-cream transition-colors hover:bg-ink-soft"
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}

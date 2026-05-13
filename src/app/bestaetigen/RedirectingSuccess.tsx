"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  redirectUrl: string;
  seconds?: number;
}

/**
 * Erfolgs-Seite mit Countdown nach DOI-Bestätigung.
 *
 * Zeigt dem User die Erfolgsmeldung und leitet nach `seconds` Sekunden
 * automatisch zur Anmelde-Seite weiter. Manueller Klick-Fallback ist auch da.
 */
export function RedirectingSuccess({ redirectUrl, seconds = 5 }: Props) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      router.push(redirectUrl);
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, router, redirectUrl]);

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="max-w-xl text-center">
        <p className="label mb-6">✓ Bestätigt</p>
        <h1 className="text-display text-5xl leading-[0.95] md:text-7xl">
          Mail bestätigt.
        </h1>
        <p className="mt-6 text-base leading-relaxed text-ink-soft md:text-lg">
          Wir öffnen gleich dein persönliches Sonderangebot — warte einen Moment.
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <span
            className="flex h-20 w-20 items-center justify-center border-2 border-ink text-display text-5xl tabular-nums md:h-24 md:w-24 md:text-6xl"
            aria-live="polite"
          >
            {remaining}
          </span>
        </div>

        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          {remaining === 0 ? "Wird geladen…" : "Sekunden"}
        </p>

        <a
          href={redirectUrl}
          className="mt-10 inline-block border-b-2 border-ink pb-1 font-mono text-xs uppercase tracking-[0.14em] hover:text-ink-soft"
        >
          Direkt öffnen →
        </a>
      </div>
    </main>
  );
}

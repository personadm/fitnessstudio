// Meta-/Facebook-Pixel — wird bewusst ERST nach einer aktiven Einwilligung
// ("Okay" im Cookie-Banner) geladen und initialisiert. Vorher liegt kein fbq
// vor, sodass `window.fbq?.(…)` in den Formularen folgenlos no-op ist.
//
// Pixel-ID von der Werbeanzeige — bewusst hart hinterlegt (nur die zwei
// Studio-Seiten "/" und "/anmelden" tracken).
export const META_PIXEL_ID = "1739349736340145";

/**
 * Lädt fbevents.js, initialisiert den Pixel und feuert ein PageView.
 * Idempotent: mehrfaches Aufrufen lädt den Pixel nur einmal.
 */
export function loadMetaPixel(): void {
  if (typeof window === "undefined") return;
  if (window.fbq) return; // bereits geladen

  /* eslint-disable */
  (function (f: any, b: Document, e: string, v: string) {
    if (f.fbq) return;
    const n: any = (f.fbq = function () {
      n.callMethod
        ? n.callMethod.apply(n, arguments)
        : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    const t = b.createElement(e) as HTMLScriptElement;
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode?.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */

  // Frisches Alias: window.fbq wurde oben per `if (window.fbq) return` auf
  // undefined verengt, die IIFE setzt es aber zur Laufzeit. Über w umgehen wir
  // die stale Verengung typsicher.
  const w = window as unknown as { fbq?: (...args: unknown[]) => void };
  w.fbq?.("init", META_PIXEL_ID);
  w.fbq?.("track", "PageView");
}

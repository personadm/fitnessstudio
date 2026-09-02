// Globaler Typ für den Google-Tag (`window.gtag`), den der Basis-Tag-Snippet
// in GoogleAds.tsx auf `window` setzt. So können Client-Komponenten das
// Conversion-Event typsicher feuern, z. B.:
//   window.gtag?.("event", "conversion", { send_to: "AW-…/…" });
export {};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

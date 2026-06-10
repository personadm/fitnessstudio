// Globaler Typ für den Meta-/Facebook-Pixel (`window.fbq`), den der
// Basis-Pixel-Snippet in MetaPixel.tsx auf `window` setzt. So können
// Client-Komponenten Events wie `window.fbq?.("track", "Lead")` typsicher feuern.
export {};

declare global {
  interface Window {
    fbq?: (action: string, event: string, params?: Record<string, unknown>) => void;
  }
}

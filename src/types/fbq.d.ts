// Globaler Typ für den Meta-/Facebook-Pixel (`window.fbq`), den der
// Basis-Pixel-Loader in src/lib/pixel.ts nach erteilter Einwilligung auf
// `window` setzt. So können Client-Komponenten Events wie
// `window.fbq?.("track", "Lead")` typsicher feuern (no-op ohne Einwilligung).
export {};

declare global {
  interface Window {
    fbq?: (action: string, event: string, params?: Record<string, unknown>) => void;
  }
}

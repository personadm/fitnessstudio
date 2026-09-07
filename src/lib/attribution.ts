// Herkunftserfassung (Lead-Quelle) — first-party & consent-unabhängig.
//
// Beim ersten Seitenaufruf werden URL-Parameter (gclid, fbclid, utm_*) und
// document.referrer ausgelesen und in sessionStorage gemerkt (first-touch),
// damit die Herkunft den Wechsel zwischen "/" und "/anmelden" übersteht.
// Beim Formular-Submit wird daraus der Klartext-Kanal ermittelt (resolveChannel).
//
// Diese Erfassung ist technisch zur Verarbeitung der Anfrage notwendig und
// läuft daher UNABHÄNGIG von der Cookie-/Consent-Entscheidung.

export type Attribution = {
  gclid?: string | null;
  fbclid?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  referrer?: string | null;
};

const STORAGE_KEY = "lead_attribution";
const MAX_LEN = 500;

const DIRECT_LABEL = "Direkt (z. B. QR-Code/Lesezeichen)";

// Bekannte utm_source-Werte → Klartext. Unbekannte werden als
// "Kampagne: <wert>" durchgereicht.
const UTM_SOURCE_LABELS: Record<string, string> = {
  visitenkarte: "Visitenkarte QR",
  homepage: "Website",
  insta_bio: "Instagram Bio",
};

function clip(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_LEN);
}

/** Entfernt leere Felder, sodass sessionStorage/DB nur echte Werte enthält. */
function clean(a: Attribution): Attribution {
  const out: Attribution = {};
  for (const [key, val] of Object.entries(a)) {
    const clipped = clip(val as string | null | undefined);
    if (clipped) out[key as keyof Attribution] = clipped;
  }
  return out;
}

function hasCampaignSignal(a: Attribution | null | undefined): boolean {
  return Boolean(a && (a.gclid || a.fbclid || a.utmSource));
}

/**
 * Ermittelt den Herkunftskanal in Klartext mit fester Priorität:
 *   gclid → Google Ads
 *   fbclid → Facebook/Instagram Ads
 *   utm_source → Mapping bzw. "Kampagne: <wert>"
 *   sonst Referrer-Analyse
 *   sonst "Direkt (z. B. QR-Code/Lesezeichen)"
 */
export function resolveChannel(a: Attribution | null | undefined): string {
  if (!a) return DIRECT_LABEL;

  if (a.gclid) return "Google Ads";
  if (a.fbclid) return "Facebook/Instagram Ads";

  const utmSource = a.utmSource?.trim();
  if (utmSource) {
    const mapped = UTM_SOURCE_LABELS[utmSource.toLowerCase()];
    return mapped ?? `Kampagne: ${utmSource}`;
  }

  const ref = a.referrer?.trim();
  if (!ref) return DIRECT_LABEL;

  let host = ref.toLowerCase();
  try {
    host = new URL(ref).hostname.toLowerCase();
  } catch {
    // Kein voll qualifizierter URL-Referrer → mit dem Rohwert weiterarbeiten.
  }

  if (host.includes("instagram.com")) return "Instagram (organisch)";
  if (host.includes("facebook.com")) return "Facebook (organisch)";
  if (/(^|\.)google\./.test(host) || /(^|\.)bing\./.test(host)) {
    return "Google/Bing Suche (organisch)";
  }
  if (host.includes("gesundheitscoaches.de")) return "Website";

  return `Verweis: ${host}`;
}

/**
 * Liest die Herkunft beim ersten Aufruf aus URL + Referrer und merkt sie
 * (first-touch) in sessionStorage. Nur im Browser aufrufen.
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;

  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl: Attribution = clean({
      gclid: params.get("gclid"),
      fbclid: params.get("fbclid"),
      utmSource: params.get("utm_source"),
      utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign"),
      utmTerm: params.get("utm_term"),
      utmContent: params.get("utm_content"),
      referrer: document.referrer || null,
    });

    const existingRaw = sessionStorage.getItem(STORAGE_KEY);

    if (!existingRaw) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl));
      return;
    }

    // Bereits erfasst: nur überschreiben, wenn jetzt echte Kampagnen-Parameter
    // (gclid/fbclid/utm) hereinkommen, die vorher fehlten — so gewinnt ein
    // späterer Ad-Klick gegenüber einer reinen Referrer-Ersterfassung.
    if (hasCampaignSignal(fromUrl)) {
      const prev = JSON.parse(existingRaw) as Attribution;
      if (!hasCampaignSignal(prev)) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl));
      }
    }
  } catch {
    // sessionStorage blockiert / privater Modus → Herkunft eben nicht gemerkt.
  }
}

/** Liest die gemerkte Herkunft (oder null). Nur im Browser sinnvoll. */
export function getAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

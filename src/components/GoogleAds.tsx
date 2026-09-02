import Script from "next/script";

// Google-Tag-ID (GA4-Property) und Google-Ads-Conversion-Ziel. Wie beim
// Meta-Pixel bewusst hart hinterlegt — getrackt werden nur die zwei Studio-
// Seiten (Gratis-Start „/" und Angebot „/anmelden").
const GTAG_ID = "G-CXPTS7YP5N";

/**
 * Basis-Google-Tag (gtag.js): lädt das Skript und initialisiert gtag.
 * Wird auf „/" und „/anmelden" gerendert.
 *
 * Das Conversion-Event (Lead) feuert NICHT hier, sondern im Lead-Formular
 * erst nach erfolgreichem Absenden — siehe LeadForm.tsx.
 */
export function GoogleAds() {
  return (
    <>
      <Script
        id="gtag-src"
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GTAG_ID}');`}
      </Script>
    </>
  );
}

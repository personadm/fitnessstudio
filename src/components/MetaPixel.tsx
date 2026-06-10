import Script from "next/script";

// Meta-/Facebook-Pixel-ID (von der Werbeanzeige). Wird im Onboarding NICHT
// abgefragt — bewusst hier hart hinterlegt, weil nur die zwei Studio-Seiten
// (Gratis-Start „/" und Angebot „/anmelden") getrackt werden.
const PIXEL_ID = "1739349736340145";

/**
 * Basis-Pixel: lädt fbevents.js, initialisiert den Pixel und feuert beim
 * Laden ein PageView. Wird auf „/" und „/anmelden" gerendert.
 *
 * Die Conversion-Events (Lead bzw. Purchase) feuern NICHT hier, sondern im
 * jeweiligen Formular erst nach erfolgreichem Absenden — siehe LeadForm.tsx
 * und SignupForm.tsx.
 */
export function MetaPixel() {
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

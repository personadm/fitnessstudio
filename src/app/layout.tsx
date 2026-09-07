import type { Metadata, Viewport } from "next";
import "./globals.css";

const STUDIO = process.env.STUDIO_NAME ?? "Deine Gesundheitscoaches";

export const metadata: Metadata = {
  title: {
    default: STUDIO,
    template: `%s — ${STUDIO}`,
  },
  description: "Hier bekommst du dein Gratis-Start-Angebot!",
  icons: {
    icon: "/favicon.ico",
  },
};

// In Next.js 15 wurde themeColor aus dem `metadata`-Export rausgezogen
// in einen eigenen `viewport`-Export. Ohne diesen Split kommt die
// Warnung „Unsupported metadata themeColor" in den Build-Logs.
export const viewport: Viewport = {
  themeColor: "#FBF7F0",
  width: "device-width",
  initialScale: 1,
};

// Google Consent Mode v2 — Default-Zustand. MUSS vor jedem gtag/js-Load laufen,
// deshalb als synchrones Inline-Skript ganz oben im <head> (nicht via next/script,
// dessen beforeInteractive im App-Router nur im Root-Layout zuverlässig greift).
// Standard: alles denied → Google liefert modellierte Conversions auch für
// Ablehner/Unentschlossene. Ein bereits gespeichertes "Okay" (localStorage) wird
// sofort auf granted hochgesetzt, damit wiederkehrende Besucher nicht warten.
const CONSENT_DEFAULT_SCRIPT = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  wait_for_update: 500
});
try {
  if (localStorage.getItem('cookie-consent') === 'granted') {
    gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted'
    });
  }
} catch (e) {}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <script dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

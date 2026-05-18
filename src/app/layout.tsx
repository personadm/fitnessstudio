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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fitnessstudio – Stronger every day.",
  description: "Trag dich ein und erhalte unsere aktuellen Tarife per Mail.",
  manifest: "/manifest.webmanifest",
  themeColor: "#1A1A1A",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Coaches",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..900,0..100,0..1;1,9..144,300..900,0..100,0..1&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grain">{children}</body>
    </html>
  );
}

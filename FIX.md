# Layout-Fix: themeColor-Warnung weg

## Was wurde gemacht

`src/app/layout.tsx` — `themeColor` aus `metadata` rausgezogen, in eigenen
`viewport`-Export gepackt. Damit verschwinden alle „Unsupported metadata themeColor"-
Warnungen aus den Build-Logs.

## Hochladen

GitHub → `src/app/layout.tsx` ersetzen mit der Datei aus dem ZIP.

## Falls deine bestehende layout.tsx mehr Inhalt hatte

Wenn du Custom-Sachen hattest (z.B. Schriftarten via `next/font`, einen
Provider-Wrapper, ein Skript), schick mir kurz den alten Inhalt — dann
pass ich die neue Version entsprechend an.

Typische Sachen die im alten Layout drin sein könnten:

```tsx
// next/font Import
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });

// In RootLayout:
<body className={inter.className}>{children}</body>

// Oder Analytics, Provider, Toaster etc.
```

Falls so etwas drin war, einfach die entsprechenden Zeilen aus der
alten Datei in die neue rüberkopieren. Das `viewport` und `metadata`
Setup bleibt unverändert.

## Was die Warnungen bedeutet haben

Next.js 15 hat das `themeColor`-Feld vom `metadata`-Export deprecated.
Es muss in einen neuen `viewport`-Export. Die Warnung ist nur kosmetisch —
die App hat trotzdem funktioniert. Mit dem Fix sind die Build-Logs jetzt sauber.

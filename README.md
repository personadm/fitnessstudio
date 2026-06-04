# Tranche B — Part 1: KI-Funnel-Generator

Standalone-Module die ich liefere bevor ich deine existing Funnel-Pages anpasse.
Diese drei Files funktionieren **ohne** Änderungen an deinem bestehenden Code.

## Drei Dateien

| Datei | Status |
|---|---|
| `src/lib/funnelAi.ts` | **NEU** — Hormozi-System-Prompt destilliert aus beiden Videos. Plus Input-Schema und Response-Validierung. |
| `src/app/api/admin/funnels/generate/route.ts` | **NEU** — API-Endpunkt der `ANTHROPIC_API_KEY` nutzt um Claude Sonnet 4 zu rufen. |
| `src/components/admin/FunnelAiGenerator.tsx` | **NEU** — UI-Komponente mit Eingabe-Form, Vorschau, Übernehmen-Button. |

## Was die KI macht

Aus zwei Eingaben (**Zielgruppe** + **Ziel**) plus optionalen Pain Points, Tonalität, Anzahl Mails und Zeitplan generiert sie einen kompletten Funnel im Hormozi-Stil:

- **Mozi-Minute-Struktur** für jede Mail: Subject + Reward + Meat (1 Problem + 1 Lösung + 1 Taktik) + CTA + PS
- **Value Equation** als Backbone (Outcome × Wahrscheinlichkeit / Zeit × Aufwand)
- **Reward-Loop-Architektur** (jeder Schritt belohnt das vorherige Verhalten)
- **Anti-Patterns** strikt vermieden (keine Bilder, keine Geld-Sprache, max 1-2 Links, keine Vegas-Strip-Optik)
- **Pain-based Testimonial-Hooks** wo passt
- **Strikt du-Form**, deutsche Sprache, Markenversprechen von „Deine Gesundheitscoaches"

Hinter den Kulissen: System-Prompt mit ~3 KB destillierten Frameworks (statt 66 KB Volltranskripte → spart Tokens × 20). Antwort kommt als sauberes JSON, automatisch validiert und nach Gesamtzeit sortiert.

## Einbinden

### Variante 1 — Standalone testen (kein Code-Anschluss nötig)

Du kannst die Komponente direkt einbinden, z.B. in deine `funnels/new/page.tsx` oder als eigene Test-Page. Beispiel:

```tsx
// src/app/admin/(authed)/funnels/ki-test/page.tsx
import { FunnelAiGenerator } from "@/components/admin/FunnelAiGenerator";

export default function KiTestPage() {
  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">KI-Funnel Test</h1>
      <FunnelAiGenerator
        onAccept={async (funnel) => {
          console.log("Funnel zum Übernehmen:", funnel);
          alert("In der finalen Version würde der Funnel jetzt in der DB angelegt");
        }}
      />
    </div>
  );
}
```

Aufrufen unter `/admin/funnels/ki-test` → Form ausfüllen → „Funnel generieren" → Vorschau ansehen → fertig.

### Variante 2 — In dein existing „Funnel erstellen"-Modal integrieren

Dafür brauche ich deinen Funnel-Erstellen-Code (das war mein Punkt 2 in der Anfrage). Sobald ich die Datei habe, schließe ich `onAccept` an deine `createFunnel`-Action an und die KI-Generierung legt den Funnel direkt in der DB an.

## Voraussetzungen

In deinen Render-ENV-Variablen muss **`ANTHROPIC_API_KEY`** gesetzt sein (steht in deinen Notes als bereits konfiguriert). Falls nicht — bei [console.anthropic.com](https://console.anthropic.com) Konto + Key erstellen, $5 Guthaben reichen für etwa 200 Funnel-Generierungen.

## Kosten

Pro Funnel-Generierung mit 5 Mails: ~$0.01–$0.03 (Claude Sonnet 4 Pricing).

## Hochladen

Drei Dateien aus dem ZIP ins Repo:
- `src/lib/funnelAi.ts`
- `src/app/api/admin/funnels/generate/route.ts`
- `src/components/admin/FunnelAiGenerator.tsx`

**Plus optional** eine Test-Page wie oben gezeigt.

Commit: `funnel-ki: hormozi-prompt + api-route + ui-component`

## Schnelltest nach Deploy

1. Build läuft durch (Module sind self-contained, sollte nicht crashen)
2. Test-Page anlegen oder Komponente in existing Page einbauen
3. Aufrufen → Eingaben:
   - **Zielgruppe**: „Frauen 50+ aus dem Münsterland mit Übergewicht und Knieschmerzen, die schon mehrere Diäten versucht haben"
   - **Ziel**: „Anmeldung zum 6-Wochen-Programm"
   - **Pain Points**: „vergebliche Diäten, Knieschmerzen beim Treppensteigen, geringe Energie im Alltag"
4. „Funnel generieren ✦" → 30–60 Sekunden warten
5. Sollte einen 5-teiligen Funnel zeigen mit echten Mails in Hormozi-Stil

## Was kommt als nächstes (Tranche B Part 2 + 3)

Sobald du mir deine `funnels/[id]/page.tsx` und den Funnel-Step-Form-Code schickst, mache ich:

- **Steps visuell nach Gesamtzeit sortieren** mit Zeit-Achse links
- **Funnel-Edit-Bug fixen** (TipTap Doppel-Encoding bei Re-Edit)
- **„Aus Pages Datei"-Button entfernen**
- **`onAccept`-Hook** an deine `createFunnel`-Action anschließen

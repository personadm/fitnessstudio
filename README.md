# Tranche B — Part 2

Fünf Dateien für die KI-Integration in deinen bestehenden EmailComposer plus die zwei Bug-Fixes (Pages-Datei raus, Edit-Bug).

## Was im ZIP ist

| Datei | Status | Was sie macht |
|---|---|---|
| `src/components/admin/EmailComposer.tsx` | **MODIFIZIERT** | „Aus Pages-Datei"-Tab entfernt. Nur noch „Mit KI" und „Selbst schreiben". |
| `src/components/admin/AIEmailComposer.tsx` | **NEU** (ersetzt existing) | Hormozi-Frameworks für **eine einzelne Mail**. Inputs: Zielgruppe, Ziel der Mail, Pain Points, Position im Funnel, Tonalität. |
| `src/lib/funnelAi.ts` | **ERWEITERT** | Plus `HORMOZI_STEP_PROMPT` + `buildStepPrompt` + `GeneratedStep`-Validator. Bisheriger `HORMOZI_SYSTEM_PROMPT` für ganze Funnels bleibt. |
| `src/app/api/admin/funnels/generate-step/route.ts` | **NEU** | API-Endpoint für Single-Mail-Generierung. |
| `src/app/admin/(authed)/funnels/[id]/steps/[stepId]/EditStepForm.tsx` | **MODIFIZIERT** | Defensive Fixes gegen den TipTap-Re-Mount-Bug. |

## Was du noch reinpacken kannst (aus Tranche B Part 1)

Diese aus dem `tranche-b-part1.zip` von vorhin **bleiben nützlich** falls du auch ganze Funnels auf einen Schlag mit KI bauen willst:
- `src/lib/funnelAi.ts` → **NICHT** mehr nehmen, das hier in Part 2 ist die neuere Version
- `src/app/api/admin/funnels/generate/route.ts` → nimm es, für komplette Funnels
- `src/components/admin/FunnelAiGenerator.tsx` → nimm es, falls du die Volle-Funnel-Generierung als extra UI willst (z.B. auf einer „Funnel neu"-Page)

Wenn du nur einzelne Mails generieren willst (was die meiste Zeit der Fall ist), reicht Part 2.

---

## 1. Pages-Datei-Tab raus

Eine kleine Änderung im `EmailComposer.tsx`: Import + Tab + Branch für `DocxImporter` entfernt. Mode-Type ist jetzt `"ai" | "manual"`.

`DocxImporter.tsx` selbst kannst du im Repo lassen (wird nicht mehr importiert, aber löscht nichts).

## 2. KI-Mail-Generator mit Hormozi-Frameworks

Der **neue `AIEmailComposer`** ersetzt deinen bestehenden „Foto + Stichworte"-KI-Modus. Eingaben:

- **Zielgruppe** — z.B. „Frauen 50+ aus dem Münsterland mit Übergewicht und Knieschmerzen"
- **Ziel dieser Mail** — z.B. „Vertrauen aufbauen + zeigen dass schnelle Ergebnisse möglich sind"
- **Pain Points** (optional)
- **Position im Funnel** — 8 vordefinierte Modi: 1. Mail / Pain agitieren / Lösung zeigen / Beweise / Einwände / Angebot / Deadline / Newsletter
- **Tonalität** — empathisch / direkt / story-mode

Click auf „Mail generieren ✦" → 10–30 Sek warten → Vorschau erscheint → entweder „Übernehmen" (Subject + Body landen in den Edit-Feldern darunter) oder „Verwerfen" (zurück zur Form).

Frameworks die der System-Prompt enthält:
- **Mozi-Minute-Struktur**: Subject + Reward + Meat + CTA + PS (~200 Wörter)
- **Value Equation**: Outcome × Likelihood / Time × Effort
- **Reward-Loop**: jeder Schritt belohnt das vorherige
- **Position-spezifische Anweisungen**: erste Mail = kein Verkauf, Pain-Agitate = Problem ohne Lösung, Proof = pain-based Testimonial-Hooks etc.
- **Anti-Patterns**: keine Bilder, keine Geld-Sprache, max 1–2 Links, keine Vegas-Strip-Optik

## 3. Funnel-Edit-Bug — Defensive Fixes

Der „Mail wird beim Re-Edit kaputt"-Bug hat eine sehr typische Ursache: **TipTap-Re-Mounts**. Genauer:

- Die EditStepForm bekommt `initialBodyHtml` als Prop vom Server-Component.
- Wenn der State `bodyHtml` sich ändert (durch onChange), wird die Form neu gerendert.
- Bei jedem Re-Render gibt React die Prop `initialHtml` an den RichTextEditor weiter.
- Wenn der RichTextEditor intern einen `useEffect(() => editor.setContent(initialHtml), [initialHtml])` hat, würde der bei jedem Render feuern und den Editor-Inhalt zurücksetzen → das was du gerade getippt hast verschwindet.
- Plus: `router.refresh()` nach Speichern lädt frische Daten aus der DB → noch ein Render-Cycle mit potentiellem Reset.

**Drei defensive Fixes** in der neuen EditStepForm:

1. **Stabile `initialHtml` via `useRef`** — `const stableInitialBodyHtml = useRef(initialBodyHtml).current;`. Die Ref-Wert wird einmal beim ersten Render gesetzt und ändert sich danach nie wieder. Der RichTextEditor sieht immer denselben Initial-Wert, auch nach Re-Renders.

2. **`key={stepId}` auf RichTextEditor** — React behält dieselbe Editor-Instanz für die gesamte Edit-Session. Re-Mounts werden vermieden.

3. **Kein `router.refresh()` mehr nach Save** — stattdessen kurze Erfolgsmeldung „✓ Gespeichert um 12:34:56". User kann ohne Reset weiter editieren oder zurück zur Funnel-Übersicht.

**Wenn der Bug trotz dieser Fixes weiter besteht**, liegt er im `RichTextEditor.tsx` selbst (TipTap-internal). Dann schick mir die Datei `src/components/admin/RichTextEditor.tsx` — wahrscheinlich gibt's da einen `useEffect` der bei prop-Änderung den Content neu setzt, oder eine fehlende Memoization von der `Editor`-Instanz.

## Voraussetzungen

`ANTHROPIC_API_KEY` muss in deinen Render-ENV-Variablen gesetzt sein. Laut deinen Notes ist das schon der Fall.

## Kosten

Pro generierter Mail: ~$0.005 (Claude Sonnet 4 mit Step-Prompt + 2000 max_tokens). 100 Mails = $0.50.

## Hochladen

5 Dateien aus dem ZIP ins Repo:
- `src/components/admin/EmailComposer.tsx`
- `src/components/admin/AIEmailComposer.tsx` (überschreibt deine alte mit der „Foto + Stichworte"-Variante)
- `src/lib/funnelAi.ts`
- `src/app/api/admin/funnels/generate-step/route.ts`
- `src/app/admin/(authed)/funnels/[id]/steps/[stepId]/EditStepForm.tsx`

Commit: `tranche b: hormozi-ki + pages-tab raus + edit-bug defensive fixes`

## Schnelltest nach Deploy

### A) Pages-Datei-Tab weg?
1. Funnel-Detail-Seite öffnen
2. „Schritt hinzufügen" — nur noch zwei Tabs sichtbar: „Mit KI" und „Selbst schreiben"

### B) KI-Generator?
1. Im neuen „Mit KI"-Tab Form ausfüllen:
   - Zielgruppe: „Frauen 50+ mit Übergewicht und vergeblichen Diäten"
   - Ziel: „Erste Mail nach Anmeldung — Vertrauen aufbauen, kein Verkauf"
   - Position: „1. Mail / Willkommen"
2. „Mail generieren ✦" → 10–30 Sek warten
3. Vorschau sollte zeigen: Subject + Body mit Mozi-Minute-Struktur
4. „Übernehmen" → Subject + Body landen in den Eingabefeldern darunter
5. Wartezeit eintragen, „+ Schritt anlegen" — fertig

### C) Edit-Bug?
1. Existierenden Funnel-Step bearbeiten (z.B. mit eingefügten Bildern im Body)
2. Klein editieren → „Änderungen speichern"
3. **Erwartung**: kurze grüne Erfolgsmeldung, Editor-Inhalt bleibt komplett erhalten, Bilder weiter sichtbar
4. Nochmal editieren + speichern → wieder Erfolgsmeldung, kein Reset

Falls Schritt 3 immer noch „kaputt" zeigt — der Bug ist im RichTextEditor selbst, schick mir die Datei dann.

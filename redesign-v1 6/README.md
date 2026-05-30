# Redesign v1 — Landing & Anmelden komplett überarbeitet

11 Dateien. Hochladen, Schema-Migration laufen lassen, deployen.

## Diff-Übersicht

| Datei | Status | Was sich ändert |
|---|---|---|
| `prisma/schema.prisma` | Update | `PricingPlan.topHighlights` Json @default("[]") neu |
| `src/lib/validation.ts` | Update | `leadSchema`: lastName + gender optional, locationId neu. `planSchema` komplett überarbeitet inkl. `topHighlights` |
| `src/lib/mail.ts` | Update | `sendDoiMail` + `sendPricingMail` mit neuen Texten + Templates aus dem Briefing |
| `src/app/api/leads/route.ts` | Update | `locationId` aus Body lesen, validieren, beim Contact-upsert mitspeichern. lastName/gender bleiben optional |
| `src/components/LeadForm.tsx` | **NEU** (ersetzt alt) | Schlanke Form: Vorname + E-Mail + Standort + Consent. Petrol/Grün Akzent |
| `src/app/page.tsx` | Update | Hero komplett neu (Pille, H1, grüne Zeile, Fließtext, 3 Beweis-Punkte, Gold-Hinweis, Form-Karte). Header: Logo + Studio-Name (kein „Direkt anmelden" mehr). Alles unter Hero unverändert |
| `src/app/bestaetigen/page.tsx` | Update | Auto-Redirect nach 1.5s via meta-refresh + sichtbarer Fallback-Button. Pricing-Mail im Hintergrund unverändert |
| `src/app/anmelden/page.tsx` | Update | Komplett neu: Header mit Logo, Fortschrittsanzeige, H1 + Subtitle, übergibt topHighlights an SignupForm |
| `src/components/SignupForm.tsx` | Update | Komplett neu: Plan-Switcher (nur bei >1 Plan), Tarif-Karte mit Preis-Anker (199 € durchgestrichen), 3 Highlight-Kacheln (Gold-Variante), 2-spaltige Häkchenliste, Zufriedenheitsgarantie, 2 Testimonials, Form-Header „Schritt 2", Felder in Zeilen gruppiert, Button „Jetzt starten →", Microcopy |
| `src/app/admin/(authed)/plans/page.tsx` | Update | Imports + Helper für topHighlights, Sektion im PlanForm-Body |
| `src/app/admin/(authed)/plans/TopHighlightsEditor.tsx` | **NEU** | Client-Component: bis 3 Slots mit Text+Untertitel+Gold-Checkbox, Reorder via ▲/▼ |
| `src/app/admin/_actions.ts` | Update | `savePlan` parst zusätzlich `topHighlights` JSON aus FormData |

## Was am Backend NICHT angefasst wurde

- DSGVO-Consent-Speicherung (`consentText`, `consentIp`)
- DOI-Token-Generierung (`generateToken`)
- Funnel-Enrollment (`enrollIntoMatchingFunnels`)
- Signup-API (`/api/signup`)
- Contact-Schema in Prisma (nur PricingPlan erweitert)
- Push-Notifications
- Bestehende Plans-Liste/Löschen/Aktivieren

## Schema-Migration

Nach Upload:

```
npx prisma db push
```

Da das neue Feld `topHighlights` einen `@default("[]")` hat, ist die Migration
sicher — bestehende Plans bekommen automatisch ein leeres Array. Kein Data Loss.

## Lokales Testen vor Deploy

### Testpfad 1 — Landing & DOI-Flow
1. `npm run dev` → `http://localhost:3000`
2. Hero-Form sollte exakt wie Bild 1 aussehen
3. Eintragen: Vorname + Mail + (falls 2 Studios) Standort + Häkchen → „Ja, schick mir meinen Gratis-Start-Plan →"
4. Erfolgsmeldung „Schau in dein Postfach"
5. Mail im Postfach: Betreff „Bitte bestätige deine Anmeldung (1 Klick)" — Button „Anmeldung bestätigen →"
6. Klick auf Button → Erfolgsseite „Geschafft!" → nach 1.5s Auto-Redirect zu `/anmelden`
7. Parallel kommt zweite Mail: „Geschafft – hier ist dein Gratis-Start-Angebot, [Vorname]" mit Button „Zu meinem Start-Angebot →"

### Testpfad 2 — Anmelden mit 1 vs. mehreren Plans
1. Im Admin (`/admin/plans`) sicherstellen dass mindestens 1 Plan `active` und `availableOnline` ist
2. Wenn 1 aktiver Plan: `/anmelden` zeigt direkt die Karte ohne Switcher
3. Wenn 2+ aktive: oben Toggle-Buttons mit den Plan-Namen, Klick wechselt die Karte
4. Wenn ein Plan `topHighlights` gefüllt hat → diese in den 3 Kacheln
5. Wenn nicht → erste 3 Einträge aus `highlights[]` werden als Fallback genommen

### Testpfad 3 — Top-Highlights pflegen
1. `/admin/plans?edit=<id>` öffnen
2. Sektion „Top-Highlights" sollte zwischen „Highlights" und „AGB" sichtbar sein
3. „+ Kachel hinzufügen" → bis 3 Slots
4. Text + Untertitel füllen, Gold-Hervorhebung wenn nötig
5. Speichern → auf `/anmelden` sollten die Kacheln so erscheinen

### Testpfad 4 — Backend nicht kaputt
1. Bestehende Leads aus älteren Imports öffnen (Admin → Kontakte)
2. Felder `lastName`, `gender` sollten weiterhin angezeigt werden (wurden nicht gelöscht)
3. Neue Leads aus dem schlanken Form haben `lastName=""` und `gender=null` — das ist OK

## Deploy

Render baut → `npx prisma db push --accept-data-loss` läuft (sicher wegen default-Wert) → Build durchlaufen → testen.

## Bekannte Limits / nicht gemacht

- Plan-Wechsel im SignupForm aktualisiert AGB-Consent-Checkbox nicht automatisch (User muss neu zustimmen falls AGB-Text plan-spezifisch ist). Lass ich aus damit das Verhalten klar bleibt.
- „99 € einmalig" und „59,99 €/Monat" in den Microcopies unter dem Button sind hardcoded (nicht aus DB), wie im Briefing definiert.
- Die Tarif-Auswahl-Buttons oben zeigen `plan.name`. Falls du elegantere Labels willst (z.B. „6-Wochen-Programm" vs. „Jahresmitgliedschaft"), benenne die Pläne im Admin entsprechend.

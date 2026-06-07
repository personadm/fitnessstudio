# Funnel Hybrid-Modus

Ermöglicht pro Step zu entscheiden: **klassisch** (nach X Tagen ab Anmeldung) oder **hybrid** (frühestens nach X Tagen, dann nächster Wochentag Y).

Genau das Szenario das dein Vater beschrieben hat: 4 tägliche Mails, dann die letzte am Mittwoch der Folgewoche.

## Reihenfolge der Deployment-Schritte (wichtig!)

### Schritt 1: Schema-Erweiterung

`prisma/schema.prisma` öffnen → `model FunnelStep` suchen → die drei Felder aus `prisma/schema-additions-hybrid.prisma` einfügen:

```diff
model FunnelStep {
  id        String   @id @default(cuid())
  funnelId  String
  funnel    Funnel   @relation(fields: [funnelId], references: [id], onDelete: Cascade)
  orderNum  Int
  delayDays Int
  delayHours Int     @default(0)
  subject   String
  bodyHtml  String
  createdAt DateTime @default(now())

+ scheduleWeekday Int?
+ scheduleHour    Int?
+ scheduleMinute  Int?

  events FunnelStepEvent[]

  @@unique([funnelId, orderNum])
  @@index([funnelId])
}
```

### Schritt 2: Files ins Repo kopieren

Aus dem ZIP folgende Files an die richtigen Stellen:

| Ziel-Pfad | Datei aus ZIP |
|---|---|
| `src/lib/funnels.ts` | `funnel-hybrid/src/lib/funnels.ts` (überschreibt) |
| `src/app/admin/(authed)/funnels/[id]/AddFunnelStepForm.tsx` | überschreibt |
| `src/app/admin/(authed)/funnels/[id]/steps/[stepId]/EditStepForm.tsx` | überschreibt |
| `src/app/admin/(authed)/funnels/[id]/steps/[stepId]/page.tsx` | überschreibt |

### Schritt 3: Server-Actions aktualisieren

`src/app/admin/_actions.ts` öffnen. Such die zwei Funktionen `addFunnelStep` und `updateFunnelStep`. Ersetz sie durch die Versionen aus `src/app/admin/_actions-snippet.ts`.

**Wichtig:** kopier NUR die zwei Funktionen + den Helper `parseOptionalInt` — der Rest deiner `_actions.ts` bleibt unangetastet.

### Schritt 4: Commit + Push

```bash
git add -A
git commit -m "funnel: hybrid-modus pro step (frühestens X tage + nächster wochentag)"
git push
```

Render baut → `prisma db push` legt die drei neuen Spalten an.

### Schritt 5: Migration für bestehende Wochenplan-Funnels

Nach erfolgreichem Build in Supabase SQL Editor laufen lassen:

→ Inhalt von `migrations/002-hybrid-mode.sql` einfügen + RUN

Was diese SQL macht: alle Steps deiner bestehenden Wochenplan-Funnels bekommen die Funnel-weiten Schedule-Settings auf Step-Ebene. Dadurch verhalten sich diese Funnels weiterhin exakt wie vorher — nur jetzt mit der neuen Hybrid-Logik unter der Haube.

Wenn du keine Wochenplan-Funnels hast, ändert die SQL nichts.

### Schritt 6: Wrapper-Ordner aufräumen (falls nötig)

```bash
ls -d */ | grep -v "^node_modules\|^prisma\|^public\|^src\|^\.next\|^\.git"
# Falls da was kommt (z.B. funnel-hybrid/, c1-phase1/, etc.) → rm -rf
```

---

## Wie der Hybrid-Modus funktioniert

Jeder Step hat jetzt drei optionale Felder. Wenn `scheduleWeekday` gesetzt ist, läuft der Step im Hybrid-Modus:

```
dueAt = nextWeekdayOccurrence(
  startedAt + delayDays * 24h + delayHours,
  scheduleWeekday,
  scheduleHour,
  scheduleMinute
)
```

Bedeutet:
1. **Mindest-Wartezeit ab Anmeldung** = `delayDays + delayHours`
2. **Sendet aber erst** am nächsten passenden Wochentag um die konfigurierte Uhrzeit

Wenn `scheduleWeekday` NULL ist → klassischer Modus, genau nach Wartezeit.

## Vater's perfektes Szenario — wie du es konfigurierst

Bei Dienstag-Anmeldung sollen:
- 4 tägliche Mails (Di/Mi/Do/Fr)
- Dann am Mittwoch der Folgewoche die alte Mail

Konfiguration:

| Step | Wartezeit | Hybrid | Bei Dienstag-Anmeldung |
|---|---|---|---|
| 1 | 0 Tage 0 Std | aus | Dienstag sofort |
| 2 | 1 Tag 0 Std | aus | Mittwoch |
| 3 | 2 Tage 0 Std | aus | Donnerstag |
| 4 | 3 Tage 0 Std | aus | Freitag |
| 5 | 4 Tage 0 Std | **an** — Mittwoch 9:00 | **Mittwoch der Folgewoche, 9:00** |

Erklärung Step 5: Wartezeit „4 Tage" = frühestens Samstag. Nächster Mittwoch nach Samstag = Mittwoch der Folgewoche. ✓

## Hier sind ein paar weitere Beispiele

### „Sofort Welcome, dann immer dienstags 14 Uhr"
- Step 1: 0d 0h, klassisch → sofort
- Step 2: 0d 0h, hybrid Dienstag 14:00 → nächster Dienstag 14:00
- Step 3: 7d 0h, hybrid Dienstag 14:00 → übernächster Dienstag 14:00
- Step 4: 14d 0h, hybrid Dienstag 14:00 → der Dienstag danach

### „Erste Mail nach 1 Stunde, dann jeden Sonntag morgens"
- Step 1: 0d 1h, klassisch → 1h nach Anmeldung
- Step 2: 0d 1h, hybrid Sonntag 9:00 → nächster Sonntag nach der 1h-Wartezeit
- Step 3: 7d 0h, hybrid Sonntag 9:00 → eine Woche nach Step 2
- Step 4: 14d 0h, hybrid Sonntag 9:00 → 2 Wochen nach Step 2

### „Klassisch ohne Hybrid"
- Alle Steps: nur Wartezeit, kein Hybrid aktiviert
- Funktioniert exakt wie bisher

## Skip-Logik bleibt erhalten

Wenn du Steps mit kürzerer Wartezeit zu einem laufenden Funnel hinzufügst, gehen sie weiterhin **nicht** rückwirkend an Kontakte die schon weiter sind. Die Skip-Logik wurde für Hybrid-Modus erweitert (sortiert jetzt nach echtem `dueAt` für jede Enrollment, nicht nur nach `delayDays + delayHours`).

## Aktueller Stand der offenen Sachen

- **Skip-Fix** (separate Datei): ist in der neuen `funnels.ts` bereits enthalten — du musst die alte Skip-Fix-Version NICHT mehr separat deployen.
- **C1 Phase 1 (Multi-Tenancy)**: davon unabhängig, kannst du parallel machen.
- **Cron-Job in Render**: noch nicht eingerichtet → musst du selbst tun (oder sag Bescheid).
- **TZ=Europe/Berlin ENV**: bitte setzen, sonst sind Wochentag-Sendungen 1-2 Stunden verschoben.

## Wenn was nicht klappt

- **Build-Fehler „Property scheduleWeekday does not exist on type FunnelStep"** → Schema-Snippet nicht eingefügt, siehe Schritt 1.
- **Build-Fehler in `_actions.ts`** → entweder `parseOptionalInt`-Helper fehlt oder Imports `revalidatePath`/`redirect` fehlen. Check deine bestehenden `_actions.ts` — die Imports sind dort vermutlich schon drin.
- **Wochentag-Logik geht 1-2h falsch** → TZ=Europe/Berlin in Render setzen.
- **Edit zeigt Hybrid-Checkbox nicht** → `page.tsx` für EditStep wurde nicht aktualisiert, oder Schema-Felder fehlen.

Sag Bescheid wenn was hängt.

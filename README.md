# Listen: Multi-Select + Kategorie-Hinzufügen

Erweitert das Hinzufügen-Panel von „eine Person nach der anderen" zu zwei
parallelen Wegen:

## Was es kann

### Weg 1 — Ganze Kategorien hinzufügen
Vier Buttons: „Alle Interessenten / Neukunden / Kunden / Ehemalige".
Jeder Button zeigt vorab wie viele Kontakte aktuell hinzukommen würden (z.B.
„+247"). Klick → Bestätigungs-Frage → klick „Ja" → alle auf einen Schlag drin.

Plus optionaler **Standort-Filter** (wenn der Studio mehrere Standorte hat) —
schränkt die Kategorie auf einen Standort ein. Z.B. „Alle Kunden in Ahaus".

### Weg 2 — Suche + Multi-Select
Wie bisher: Name oder Mail tippen, Treffer kommen. Jetzt aber mit **Checkboxen**
statt einzelnem „Hinzufügen"-Button:
- Mehrere abhaken
- „Alle markieren"-Link wenn alle hinzufügbar sind
- Action-Bar unten: „X ausgewählt → Hinzufügen"
- Max. 50 Treffer (von vorher 20)

## Files in diesem Paket

| Datei | Status |
|---|---|
| `_actions-append.ts` | **Code-Snippet** — Inhalt ans Ende von `src/app/admin/_actions.ts` anhängen |
| `src/app/admin/(authed)/lists/[id]/page.tsx` | Update — lädt jetzt zusätzlich Locations |
| `src/app/admin/(authed)/lists/[id]/AddContactPanel.tsx` | Komplett refactored |
| `src/app/api/admin/contacts/search/route.ts` | Limit von 20 auf 50 erhöht |

## Hochladen

1. ZIP entpacken
2. **`_actions-append.ts`** öffnen, kompletten Inhalt kopieren (ohne den
   Erklärungs-Kommentar oben) und ans Ende von `src/app/admin/_actions.ts`
   anfügen. Die 3 neuen Actions sind:
   - `bulkAddContactsToList(listId, contactIds)`
   - `bulkAddByStatusToList(listId, status, locationId?)`
   - `countContactsForBulkAdd(listId, status, locationId?)`
3. Die 3 anderen Files ins Repo kopieren (Pfade stimmen 1:1)
4. Commit: `Listen: Multi-Select + Kategorie-Hinzufügen`

## Voraussetzung in `_actions.ts`

Damit der Code kompiliert, muss `ContactStatus` aus Prisma importiert sein.
Falls noch nicht, oben in der Datei ergänzen:

```ts
import type { ContactStatus } from "@prisma/client";
```

`requireAdmin`, `db`, `revalidatePath` werden bereits dort verwendet —
keine neuen Imports nötig.

## Test nach Deploy

1. `/admin/lists` → eine Liste anklicken
2. Oben siehst du jetzt zwei Boxen: **„Ganze Kategorien hinzufügen"** und
   **„Einzelne Personen suchen"**
3. Kategorie-Box zeigt für jede Kategorie eine Zahl wie `+247` →
   so viele neue Kontakte würden hinzukommen
4. Klick auf eine Kategorie → grüne Bestätigung mit „Ja / Nein"
5. Suche: tippe mind. 2 Zeichen → Checkboxen vor jedem Treffer
6. Mehrere abhaken → unten dockt „X ausgewählt → Hinzufügen" an

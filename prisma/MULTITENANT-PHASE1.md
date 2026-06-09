# Multi-Tenant — Phase 1 Runbook

Überführung der Single-Tenant-App in eine mandantenfähige Plattform.
**Wichtig:** Die `DATABASE_URL` zeigt auf die Live-Supabase-DB mit echten
Kundendaten. Jeder Schritt mit DB-Zugriff ist mit ⚠️ markiert.

Phase 1 macht das Datenmodell mandantenfähig, **ohne** das bestehende Studio
zu beeinträchtigen: alle Bestandsdaten landen in Studio #1 ("Tina & Erik").

---

## Was Phase 1 im Code bereits geändert hat

- `prisma/schema.prisma`
  - Neue Modelle: `Studio`, `ActivationCode`, `PlatformAdmin`
  - Neue Enums: `StudioStatus`, `ActivationCodeStatus`
  - `studioId` (Stage 1: **nullable**) + Relation auf: `Location`, `Contact`,
    `PricingPlan`, `List`, `Campaign`, `Funnel`, `AdminUser` + passende Indizes
- `prisma/backfill-multitenant.ts` — Backfill-Skript (idempotent)
- `prisma/create-platform-admin.ts` — Platform-Admin (du) anlegen
- `src/lib/tenant.ts` — Host→Slug-Parsing + Studio-Auflösung (Fundament Phase 2)
- `package.json` — Skripte `db:backfill-tenant`, `platform-admin:create`

## STATUS — Phase 1 erledigt ✅ (2026-06-09)

- ✅ `directUrl` (Port 5432) eingerichtet — Pooler (6543) hängt bei DDL.
- ✅ Stage-1-Push: neue Tabellen + nullable `studioId` in der DB.
- ✅ Backfill: Studio #1 (`slug=localhost`, `name="Dein Fitnessstudio"`, ACTIVE)
  angelegt; **alle 3.092 Kontakte** + Standorte/Tarife/Listen/Kampagnen/4 Funnels
  + Admin diesem Studio zugeordnet. Keine Waisen.
- ✅ JSON-Backup unter `backups/` (vor Stage 2), `backups/` ist git-ignoriert.
- ✅ Stage-2-Push: `studioId` required + `@@unique([studioId, email/name])`.
- ✅ App-Code mandantenfähig: Session trägt `studioId`, 19 Call-Sites verdrahtet,
  Auflöser in `src/lib/tenant.ts`. `tsc --noEmit` = 0 Fehler. Seiten laden (200).

### Noch offen
- ⬜ **DU:** `npm run platform-admin:create` (dein Betreiber-Login, Passwort wählen).
- ⬜ Phase 2: Subdomain-Middleware, Admin-**Read/Update/Delete**-Scoping (aktuell
  nur Create-Pfade + öffentliche Routen mandanten-scoped), Platform-Backend
  (`/platform`: Codes), Onboarding-Wizard, Branding aus DB.
- ⬜ `APP_ROOT_DOMAIN` in `.env` setzen, sobald die echte Domain feststeht; dann
  Studio-`slug` von `localhost` auf den echten Wert umbenennen.
- ⬜ Falls je von Render aus migriert wird: `DIRECT_URL` auch dort als Env setzen
  (Build nutzt nur `prisma generate`, daher aktuell nicht nötig).

---

## Ausführungs-Sequenz (war so — bereits abgearbeitet)

### 0. ⚠️ Backup ziehen (Pflicht)

Über das Supabase-Dashboard ein manuelles Backup/Snapshot der DB erstellen
(Database → Backups). Erst weiter, wenn das Backup bestätigt ist.

### 1. ⚠️ Stage-1-Schema in die DB pushen

```bash
npm run db:push
```

Fügt die neuen Tabellen und die **nullable** `studioId`-Spalten hinzu.
Kein Datenverlust, da alle neuen Spalten nullable sind.

### 2. ⚠️ Backfill ausführen

```bash
npm run db:backfill-tenant
```

Legt Studio #1 aus den `STUDIO_*`-ENV-Werten an und setzt `studioId` auf allen
Bestandsdaten. Am Ende muss stehen:
`✓ Alle Bestandsdaten sind einem Studio zugeordnet.`

### 3. Stage-2-Schema scharf schalten (Code-Änderung)

> Diesen Schritt mache ich (Claude) nach deiner Bestätigung, dass Schritt 2
> erfolgreich war. Inhalt:
>
> - In `schema.prisma` bei allen 7 Modellen `studioId String?` → `studioId String`
>   (required) und `studio Studio?` → `studio Studio` ändern.
> - `Contact`: `email String @unique` → `email String` **+** `@@unique([studioId, email])`
> - `List`: `name String @unique` → `name String` **+** `@@unique([studioId, name])`
> - `AdminUser`: `email String @unique` → `email String` **+** `@@unique([studioId, email])`

### 4. ⚠️ Stage-2-Schema pushen

```bash
npm run db:push
```

Jetzt sicher, weil alle Zeilen eine `studioId` haben und (bei nur einem Studio)
keine Unique-Konflikte entstehen.

### 5. ⚠️ Platform-Admin anlegen (du als Betreiber)

```bash
npm run platform-admin:create
```

---

## Danach (Phase 2+)

- Subdomain-Routing in `src/middleware.ts` + Studio-Kontext via `src/lib/tenant.ts`
- JWT trägt `studioId`; alle Queries auf `studioId` einschränken
- `APP_ROOT_DOMAIN` in `.env` setzen (z. B. `meinapp.de`)
- Platform-Backend `/platform`, Onboarding-Wizard, Branding aus DB

---

## Rollback (Stage 1)

Stage 1 ist additiv (nur nullable Spalten + neue Tabellen) und damit
unkritisch. Falls nötig: Backup aus Schritt 0 zurückspielen.

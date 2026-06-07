# C1 Phase 1 — Multi-Tenant Fundament

**Erste Etappe des Multi-Tenant-Refactors.** Additive Schema-Erweiterung, keine bestehenden Models werden überschrieben. Ergebnis: deine App hat ein `Tenant`-Modell, alle bestehenden Daten gehören dem Tenant „Deine Gesundheitscoaches", du bist Super-Admin.

**Was hier NICHT passiert (kommt in C1 Phase 2):**
- `tenantId` an Contact / Funnel / Campaign / etc. anhängen
- Tenant-Scoping in DB-Queries
- Middleware-Routing nach Tenant

Diese Phase ist **isoliert deploybar** — funktioniert für sich allein und macht nichts kaputt. Plus sie ist Voraussetzung für alle weiteren Etappen.

## Files in diesem ZIP

| Datei | Was tun | Status |
|---|---|---|
| `prisma/schema-additions.prisma` | Snippets manuell in dein `prisma/schema.prisma` einfügen | additiv |
| `migrations/001-tenant-setup.sql` | Einmal in Supabase ausführen | manuell |
| `src/lib/tenant.ts` | Neue Datei ins Repo | **NEU** |

## Schritt-für-Schritt

### Schritt 1: Schema-Snippets einfügen

Öffne `prisma/schema.prisma` in deinem Repo. Füge ein:

**1a. `enum TenantStatus`** (bei deinen anderen Enums, oben im Schema)

→ Block A aus `schema-additions.prisma`

**1b. `model Tenant` + `model OnboardingCode`** (am Ende deines Schemas, nach `model AdminUser`)

→ Block B aus `schema-additions.prisma`

**1c. `model AdminUser` erweitern** — dein bestehendes AdminUser-Model um drei Felder ergänzen:

```diff
  model AdminUser {
    id           String   @id @default(cuid())
    email        String   @unique
    passwordHash String
    name         String?
    createdAt    DateTime @default(now())
+
+   tenantId   String?
+   tenant     Tenant?  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
+   superAdmin Boolean  @default(false)
+
+   @@index([tenantId])
  }
```

### Schritt 2: Helper-File ins Repo

Kopier `src/lib/tenant.ts` aus dem ZIP an die richtige Stelle:
```
dein-repo/src/lib/tenant.ts
```

### Schritt 3: Schema committen & pushen

```bash
git add prisma/schema.prisma src/lib/tenant.ts
git commit -m "c1: tenant + onboarding-code modelle + adminuser erweitert"
git push
```

Render baut → `prisma db push --accept-data-loss` legt automatisch an:
- Tabelle `Tenant`
- Tabelle `OnboardingCode`
- Spalten `tenantId`, `superAdmin` auf `AdminUser`
- Enum `TenantStatus`

**Wichtig:** bei diesem Push gibt es **keine Datenverlust-Warnung** weil alle Erweiterungen additiv sind (nullable / mit Default). Deine bestehenden 1700+ Kontakte und Funnels bleiben unangetastet.

### Schritt 4: Default-Tenant anlegen + dich als Super-Admin markieren

Nach erfolgreichem Render-Deploy:

1. Geh ins **Supabase Dashboard** → SQL Editor
2. Öffne `migrations/001-tenant-setup.sql` aus dem ZIP
3. Kopier den **kompletten Inhalt** in den SQL Editor
4. „RUN" klicken
5. Output sollte zeigen:
   - `INSERT INTO "Tenant"` → 1 row inserted
   - `UPDATE "AdminUser"` → N rows updated (so viele Admin-User wie du hast)
   - Die zwei `SELECT`-Statements am Ende zur Verifikation

### Schritt 5: Verifikation

Bestehende Funktionalität testen — sollte komplett unverändert sein:
- Login funktioniert
- Kontakte sichtbar
- Funnels sichtbar
- Newsletter funktioniert

Nichts sollte sich anders anfühlen. **Wenn was kaputt geht: sofort melden** — wahrscheinlich Schema-Merge-Konflikt.

## Was als Nächstes (C1 Phase 2)

Sobald Phase 1 deployed + verifiziert ist, schickst du mir dein **aktuelles `prisma/schema.prisma`** (mit den oben eingebauten Tenant-Erweiterungen drin). Dann baue ich:

- **`tenantId String`** auf jedes existing Model: `Contact`, `Location`, `PricingPlan`, `List`, `Campaign`, `Funnel`, `FunnelStep`, `ContactEvent`, `CampaignEvent`, `FunnelStepEvent`, `FunnelEnrollment`
- **Default-Wert** beim DB-Push: alle bestehenden Datensätze bekommen `tenantId = 'tenant_dgc_default'`
- **Indexe** für tenant-scoped Queries
- **Migration-SQL** die das in einem Rutsch macht

Plus **C2** danach: Auth-Refactor, JWT enthält `tenantId`, DB-Queries automatisch scoped.

## Was du dabei beachten solltest

### „Wrapper-Ordner"-Falle wieder vermeiden

Das ZIP entpackt zu `c1-phase1/` — pack **nur die Files** in dein Repo, nicht den Wrapper-Ordner:

```bash
# Korrekt:
cp ~/Downloads/c1-phase1/src/lib/tenant.ts dein-repo/src/lib/tenant.ts
cat ~/Downloads/c1-phase1/prisma/schema-additions.prisma  # → manuell in dein schema.prisma einfügen

# FALSCH (Build wird scheitern):
# mv ~/Downloads/c1-phase1 dein-repo/
```

### Reihenfolge wichtig

1. Erst Schema-Änderung + git push (Render baut, Spalten werden angelegt)
2. **Dann** SQL-Migration in Supabase (legt Default-Tenant an)

Wenn du die SQL **vor** dem Schema-Push ausführst, schlägt sie fehl weil Tabelle `Tenant` noch nicht existiert.

### Aktueller Stand offene Funnel-Sachen

Diese Phase 1 ist unabhängig von deinen offenen Funnel-Themen:
- `funnel-skip-fix` (sollte schon deployed sein)
- `tranche-b-part2` (Hormozi-KI, kannst du parallel deployen)
- Cron-Job einrichten (mach das bitte trotzdem mal)
- `TZ=Europe/Berlin` ENV (zwei Minuten Arbeit)

Wenn du Phase 1 jetzt deployst und die anderen Sachen parallel angehst, sind wir nach Phase 2 bei einem sauberen Stand.

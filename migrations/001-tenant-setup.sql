-- ═══════════════════════════════════════════════════════════════════════
-- C1 Phase 1 — Tenant-Setup für bestehende Daten
-- ═══════════════════════════════════════════════════════════════════════
--
-- Diese Migration läuft GENAU EINMAL — manuell, BEVOR du das neue Schema
-- mit `prisma db push` deployst.
--
-- Wofür:
--   1. Schema-Push würde sonst alle bestehenden AdminUser-Datensätze mit
--      tenantId = NULL hinterlassen — die wären dann implizit Super-Admins.
--   2. Diese SQL legt einen "Deine Gesundheitscoaches"-Tenant an und
--      verknüpft deine bestehenden Daten damit.
--   3. Ein Admin-User (deiner) bleibt zusätzlich als Super-Admin markiert.
--
-- AUSFÜHRUNG (zwei Optionen):
--
--   Option A — direkt in Supabase Studio (empfohlen):
--     1. Supabase Dashboard → SQL Editor
--     2. Diese Datei reinkopieren
--     3. "RUN" klicken
--     4. Output checken: sollte sagen "1 row inserted" für Tenant und
--        "N rows updated" für AdminUser
--
--   Option B — über psql lokal:
--     psql "<DATABASE_URL>" < migrations/001-tenant-setup.sql
--
-- REIHENFOLGE der ganzen Deployment-Schritte:
--   1. Schema-Snippets aus schema-additions.prisma in dein
--      schema.prisma einfügen + committen
--   2. Diese SQL in Supabase ausführen (legt Tenant an)
--   3. git push → Render baut → `prisma db push` läuft → AdminUser
--      bekommt automatisch das tenantId-Feld (NULL für bestehende User)
--   4. Direkt nach Build-Erfolg: nochmal Supabase SQL Editor öffnen und
--      den "UPDATE-Block am Ende" ausführen (Schritt 2 in diesem File)
--
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- SCHRITT 1: Tenant für deine bestehenden Daten anlegen
-- ─────────────────────────────────────────────────────────────────────
-- Diese SQL kannst du SOFORT ausführen, auch bevor du das Schema
-- deployst. Sie legt nur einen Datensatz an — der Rest geschieht
-- automatisch nachdem `prisma db push` die neuen Spalten erstellt hat.

-- Achtung: die "TenantStatus" Enum existiert erst NACH dem Schema-Push.
-- Falls du diese SQL VOR dem Schema-Push ausführst → schlägt fehl.
-- Korrekte Reihenfolge: erst Schema mergen, push, dann diese SQL.

INSERT INTO "Tenant" (
  id,
  slug,
  name,
  status,
  "trialEndsAt",
  "contactEmail",
  "geschaeftsfuehrer",
  "ustId",
  hrb,
  "createdAt",
  "updatedAt"
)
VALUES (
  -- Feste ID damit du in App-Code referenzieren kannst:
  --   const DEFAULT_TENANT_ID = "tenant_dgc_default";
  'tenant_dgc_default',
  'deine-gesundheitscoaches',
  'Deine Gesundheitscoaches',
  'ACTIVE',
  NULL,  -- kein Trial-Ende, du bist Owner
  'mail@gesundheitscoaches.de',
  'Erik Bodon',
  'DE 313 650 908',
  'Steinfurt HRB 11713',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- SCHRITT 2: Bestehende AdminUser dem Default-Tenant zuweisen
-- ─────────────────────────────────────────────────────────────────────
-- Damit nach dem Refactor niemand mehr "scopeless" rumdümpelt.
-- Nach dem Deploy bist du als Studio-Admin im "Deine Gesundheitscoaches"-
-- Tenant eingeloggt. Plus du wirst Super-Admin (kannst zwischen Tenants
-- switchen und das Super-Admin-Backend nutzen).

UPDATE "AdminUser"
SET "tenantId" = 'tenant_dgc_default',
    "superAdmin" = true
WHERE "tenantId" IS NULL;

-- Nach dem Deploy hat jeder bestehende Admin-User:
--   - tenantId = 'tenant_dgc_default' → kann sich normal einloggen
--   - superAdmin = true               → kann ins Super-Admin-Backend
--
-- Wenn du später Studio-Admins für andere Tenants anlegst, kommen die
-- mit ihrer eigenen tenantId und superAdmin = false rein.


-- ─────────────────────────────────────────────────────────────────────
-- VERIFIKATION (optional aber empfehlenswert)
-- ─────────────────────────────────────────────────────────────────────

-- Sollte 1 Tenant zeigen:
SELECT id, slug, name, status FROM "Tenant";

-- Sollte alle bestehenden Admins als super_admin im default-Tenant zeigen:
SELECT id, email, "tenantId", "superAdmin" FROM "AdminUser";

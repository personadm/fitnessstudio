-- ═══════════════════════════════════════════════════════════════════════
-- HYBRID-MODUS — Migration für bestehende Wochenplan-Funnels
-- ═══════════════════════════════════════════════════════════════════════
--
-- Diese SQL läuft EINMAL, NACHDEM das neue Schema deployed wurde
-- (also nachdem `prisma db push` die Spalten scheduleWeekday/Hour/Minute
-- auf FunnelStep angelegt hat).
--
-- Wofür:
--   Bisher hatten Wochenplan-Funnels die Schedule-Settings auf Funnel-Ebene
--   (Funnel.scheduleWeekday etc.) — alle Steps haben implizit den gleichen
--   Wochentag verwendet.
--
--   Im neuen Hybrid-Modus schaut der Prozessor auf die STEP-Felder. Damit
--   bestehende Wochenplan-Funnels weiterhin funktionieren, kopieren wir
--   die Funnel-Settings einmalig auf alle Steps dieser Funnels.
--
-- AUSFÜHRUNG (in Supabase SQL Editor):
--
--   1. Supabase Dashboard → SQL Editor
--   2. Kompletten Inhalt einfügen + RUN
--   3. Output: "UPDATE X" wobei X = Anzahl der Steps in Wochenplan-Funnels
--
-- Falls du keine Wochenplan-Funnels hast: SQL ändert nichts (UPDATE 0).
-- Falls doch: alle Steps dieser Funnels bekommen die Funnel-Settings.
--
-- ═══════════════════════════════════════════════════════════════════════

UPDATE "FunnelStep" fs
SET
  "scheduleWeekday" = f."scheduleWeekday",
  "scheduleHour"    = f."scheduleHour",
  "scheduleMinute"  = f."scheduleMinute"
FROM "Funnel" f
WHERE
  fs."funnelId" = f.id
  AND f."scheduleWeekday" IS NOT NULL
  AND fs."scheduleWeekday" IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- VERIFIKATION
-- ─────────────────────────────────────────────────────────────────────

-- Sollte zeigen wie viele Steps jetzt im Hybrid-Modus laufen:
SELECT
  COUNT(*) AS "hybrid_steps",
  COUNT(DISTINCT "funnelId") AS "wochenplan_funnels"
FROM "FunnelStep"
WHERE "scheduleWeekday" IS NOT NULL;

-- Übersicht pro Funnel:
SELECT
  f.name AS "funnel",
  COUNT(fs.id) AS "anzahl_steps",
  COUNT(fs."scheduleWeekday") AS "hybrid_steps",
  CASE
    WHEN COUNT(fs."scheduleWeekday") = 0 THEN 'KLASSISCH'
    WHEN COUNT(fs."scheduleWeekday") = COUNT(fs.id) THEN 'WOCHENPLAN (alle Steps)'
    ELSE 'HYBRID (gemischt)'
  END AS "modus"
FROM "Funnel" f
LEFT JOIN "FunnelStep" fs ON fs."funnelId" = f.id
GROUP BY f.id, f.name
ORDER BY f.name;

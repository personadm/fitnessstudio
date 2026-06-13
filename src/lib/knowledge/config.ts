/**
 * Konfiguration der KI-Wissensbasis (E-Mail-Marketing aus YouTube-Transkripten).
 *
 * Single Source of Truth für Kanal-Quelle, Stichwort-Vorfilter und Batch-Größen.
 * Alle Werte bewusst konservativ — der Sync läuft request-getriggert (lazy beim
 * Admin-Login) und darf einen Request nicht zu lange blockieren.
 */

/** Fixe ID des Wissensbasis-Singletons (KnowledgeBase.id). */
export const KNOWLEDGE_BASE_ID = "email-marketing";

/**
 * Quell-Kanäle. Aktuell nur Alex Hormozi. Kanal-IDs (nicht Handles), damit der
 * RSS-Feed (https://www.youtube.com/feeds/videos.xml?channel_id=…) direkt
 * funktioniert. Verifiziert: UCUyDOdBWhC1MCxEjC46d-zw = Alex Hormozi.
 */
export const SOURCE_CHANNELS: ReadonlyArray<{ id: string; name: string }> = [
  { id: "UCUyDOdBWhC1MCxEjC46d-zw", name: "Alex Hormozi" },
];

/**
 * Stichwort-Vorfilter (case-insensitive, Substring auf Titel + Beschreibung).
 * Spart KI-Klassifizierungs-Calls: nur Videos mit mindestens einem Treffer
 * werden überhaupt zur LLM-Relevanzprüfung geschickt. Bewusst breit — die
 * eigentliche Trennschärfe macht die LLM-Klassifizierung.
 */
export const EMAIL_MARKETING_KEYWORDS: readonly string[] = [
  "email",
  "e-mail",
  "newsletter",
  "subject line",
  "open rate",
  "click rate",
  "deliverability",
  "inbox",
  "list build",
  "email list",
  "mailing list",
  "broadcast",
  "drip",
  "sequence",
  "autoresponder",
  "funnel",
  "lead magnet",
  "opt-in",
  "opt in",
  "cta",
  "call to action",
  "copywriting",
  "copywrite",
  "nurture",
  "follow up",
  "follow-up",
  "campaign",
  "conversion",
  "click through",
  "click-through",
  "esp",
  "spam",
  "promo tab",
];

/** Wie viele Videos pro Sync-Lauf maximal ein Transkript bekommen. */
export const TRANSCRIPT_BATCH = 4;
/** Wie viele Videos pro Sync-Lauf maximal klassifiziert werden. */
export const CLASSIFY_BATCH = 8;
/** Wie viele Videos pro Sync-Lauf maximal destilliert werden. */
export const DISTILL_BATCH = 3;
/** Max. Transkript-Länge (Zeichen), die an die Destillierungs-KI geht. */
export const MAX_TRANSCRIPT_CHARS = 24_000;
/** Sync-Gate: frühestens alle 24h ein automatischer Lauf. */
export const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
/** Wie viele Alt-Videos pro Backfill-Schritt aus dem Kanal nachgeladen werden. */
export const BACKFILL_PAGE_LIMIT = 60;

/**
 * Sync-Orchestrator der KI-Wissensbasis.
 *
 * Pipeline (pro Lauf in beschränkten Batches, damit ein Request nicht blockiert):
 *   0. Discover   — RSS (neue Videos) + optional Backfill (Alt-Videos).
 *                   Keyword-Vorfilter: Videos ohne E-Mail-Bezug im Titel werden
 *                   sofort als IRRELEVANT markiert (spart Transkript-Abrufe).
 *   1. Transcribe — NEW-Videos (Keyword-Treffer) bekommen ein Transkript.
 *   2. Classify   — TRANSCRIBED-Videos werden per KI auf E-Mail-Marketing geprüft.
 *   3. Distill    — RELEVANTE Videos werden zu Frameworks destilliert.
 *   4. Rebuild    — die Gesamt-Wissensbasis (für Prompt-Injektion) wird neu gebaut.
 *
 * Trigger: lazy beim Admin-Login (max. 1×/24h, persistent gegated über
 * KnowledgeBase.lastSyncAt) sowie manuell aus der Admin-UI (force).
 *
 * Server-only.
 */

import "server-only";
import { db } from "@/lib/db";
import {
  KNOWLEDGE_BASE_ID,
  SOURCE_CHANNELS,
  EMAIL_MARKETING_KEYWORDS,
  SEARCH_QUERIES,
  SEARCH_RESULT_LIMIT,
  TRANSCRIPT_BATCH,
  CLASSIFY_BATCH,
  DISTILL_BATCH,
  SYNC_INTERVAL_MS,
  BACKFILL_PAGE_LIMIT,
} from "./config";
import {
  fetchRecentVideosViaRss,
  fetchChannelBackfill,
  fetchVideosViaSearch,
  type DiscoveredVideo,
} from "@/lib/youtube/channel";
import { fetchTranscript } from "@/lib/youtube/transcript";
import { classifyEmailMarketing, distillTranscript, compactKnowledge } from "./ai";

export interface SyncResult {
  skipped: boolean;
  reason?: string;
  discovered: number;
  transcribed: number;
  classified: number;
  relevant: number;
  distilled: number;
  rebuilt: boolean;
}

const EMPTY_RESULT: SyncResult = {
  skipped: true,
  discovered: 0,
  transcribed: 0,
  classified: 0,
  relevant: 0,
  distilled: 0,
  rebuilt: false,
};

// ─── Wissensbasis-Singleton ─────────────────────────────────────────────────

export async function getOrCreateKnowledgeBase() {
  const existing = await db.knowledgeBase.findUnique({ where: { id: KNOWLEDGE_BASE_ID } });
  if (existing) return existing;
  return db.knowledgeBase.create({ data: { id: KNOWLEDGE_BASE_ID } });
}

/**
 * Liefert den destillierten Frameworks-Text für die Prompt-Injektion.
 * Leerer String, wenn noch keine Wissensbasis aufgebaut wurde.
 */
export async function getKnowledgeContent(): Promise<string> {
  const kb = await db.knowledgeBase.findUnique({
    where: { id: KNOWLEDGE_BASE_ID },
    select: { content: true },
  });
  return kb?.content?.trim() ?? "";
}

// ─── Keyword-Vorfilter ──────────────────────────────────────────────────────

function passesKeywordPrefilter(title: string, description: string | null): boolean {
  const hay = `${title} ${description ?? ""}`.toLowerCase();
  return EMAIL_MARKETING_KEYWORDS.some((k) => hay.includes(k));
}

// ─── 0. Discover ────────────────────────────────────────────────────────────

async function discover(opts: { backfill: boolean }): Promise<number> {
  let created = 0;

  for (const channel of SOURCE_CHANNELS) {
    const found: DiscoveredVideo[] = [];
    // youtubeIds, die über die aktive Suche kamen — sie überspringen später den
    // Keyword-Vorfilter, weil die Suche den E-Mail-Bezug bereits etabliert.
    const searchIds = new Set<string>();

    // RSS ist die robuste Hauptquelle (neueste ~15 Videos).
    try {
      found.push(...(await fetchRecentVideosViaRss(channel.id)));
    } catch (err) {
      console.warn(`[knowledge] RSS-Discovery fehlgeschlagen (${channel.name}):`, getMessage(err));
    }

    // Aktive Suche: gezielt nach E-Mail-Marketing-Videos des Kanals suchen.
    // Findet passende Videos auch außerhalb der letzten ~15 Uploads.
    for (const query of SEARCH_QUERIES) {
      try {
        const hits = await fetchVideosViaSearch(
          `${channel.name} ${query}`,
          channel.id,
          channel.name,
          SEARCH_RESULT_LIMIT,
        );
        for (const hit of hits) searchIds.add(hit.youtubeId);
        found.push(...hits);
      } catch (err) {
        console.warn(
          `[knowledge] Suche fehlgeschlagen (${channel.name} / "${query}"):`,
          getMessage(err),
        );
      }
    }

    // Backfill nur einmalig (oder erzwungen): Alt-Videos best-effort nachladen.
    if (opts.backfill) {
      try {
        found.push(...(await fetchChannelBackfill(channel.id, BACKFILL_PAGE_LIMIT)));
      } catch (err) {
        console.warn(`[knowledge] Backfill fehlgeschlagen (${channel.name}):`, getMessage(err));
      }
    }

    if (found.length === 0) continue;

    // Bereits bekannte Videos rausfiltern (1 Query statt N).
    const ids = found.map((v) => v.youtubeId);
    const existing = await db.knowledgeVideo.findMany({
      where: { youtubeId: { in: ids } },
      select: { youtubeId: true },
    });
    const known = new Set(existing.map((e) => e.youtubeId));

    // Pro Video dedupliziert anlegen. Keyword-Vorfilter setzt den Startstatus.
    const seen = new Set<string>();
    for (const v of found) {
      if (known.has(v.youtubeId) || seen.has(v.youtubeId)) continue;
      seen.add(v.youtubeId);

      // Aktiv gesuchte Videos überspringen den Keyword-Vorfilter — die Suche
      // hat den E-Mail-Bezug bereits gesetzt. Sonst Titel/Beschreibung prüfen.
      const relevant = searchIds.has(v.youtubeId) || passesKeywordPrefilter(v.title, v.description);
      await db.knowledgeVideo.create({
        data: {
          youtubeId: v.youtubeId,
          channelId: v.channelId,
          title: v.title,
          description: v.description,
          url: `https://www.youtube.com/watch?v=${v.youtubeId}`,
          publishedAt: v.publishedAt,
          // Ohne E-Mail-Bezug im Titel: gar nicht erst Transkript ziehen.
          status: relevant ? "NEW" : "IRRELEVANT",
          error: relevant ? null : "Keyword-Vorfilter: kein E-Mail-Bezug",
        },
      });
      created++;
    }
  }

  return created;
}

// ─── 1. Transcribe ──────────────────────────────────────────────────────────

async function transcribePass(): Promise<number> {
  const candidates = await db.knowledgeVideo.findMany({
    where: { status: "NEW" },
    orderBy: { publishedAt: "desc" },
    take: TRANSCRIPT_BATCH,
  });

  let done = 0;
  for (const v of candidates) {
    try {
      const result = await fetchTranscript(v.youtubeId);
      if (result) {
        await db.knowledgeVideo.update({
          where: { id: v.id },
          data: { transcript: result.text, status: "TRANSCRIBED", error: null },
        });
        done++;
      } else {
        await db.knowledgeVideo.update({
          where: { id: v.id },
          data: { status: "NO_TRANSCRIPT", error: "Kein Transkript abrufbar", processedAt: new Date() },
        });
      }
    } catch (err) {
      await db.knowledgeVideo.update({
        where: { id: v.id },
        data: { status: "ERROR", error: getMessage(err) },
      });
    }
  }
  return done;
}

// ─── 2. Classify ────────────────────────────────────────────────────────────

async function classifyPass(): Promise<{ classified: number; relevant: number }> {
  const candidates = await db.knowledgeVideo.findMany({
    where: { status: "TRANSCRIBED" },
    orderBy: { publishedAt: "desc" },
    take: CLASSIFY_BATCH,
  });

  let classified = 0;
  let relevant = 0;
  for (const v of candidates) {
    try {
      const result = await classifyEmailMarketing({
        title: v.title,
        description: v.description,
        transcript: v.transcript,
      });
      await db.knowledgeVideo.update({
        where: { id: v.id },
        data: {
          status: result.relevant ? "RELEVANT" : "IRRELEVANT",
          error: result.relevant ? null : `KI: ${result.reason}`,
          processedAt: result.relevant ? null : new Date(),
        },
      });
      classified++;
      if (result.relevant) relevant++;
    } catch (err) {
      // Klassifizierung scheitert nicht fatal — beim nächsten Lauf erneut.
      console.warn(`[knowledge] Klassifizierung fehlgeschlagen (${v.youtubeId}):`, getMessage(err));
    }
  }
  return { classified, relevant };
}

// ─── 3. Distill ─────────────────────────────────────────────────────────────

async function distillPass(): Promise<number> {
  const candidates = await db.knowledgeVideo.findMany({
    where: { status: "RELEVANT", transcript: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: DISTILL_BATCH,
  });

  let done = 0;
  for (const v of candidates) {
    try {
      const notes = await distillTranscript({ title: v.title, transcript: v.transcript ?? "" });
      if (notes) {
        await db.knowledgeVideo.update({
          where: { id: v.id },
          data: { distilledNotes: notes, status: "DISTILLED", processedAt: new Date(), error: null },
        });
        done++;
      } else {
        await db.knowledgeVideo.update({
          where: { id: v.id },
          data: { status: "IRRELEVANT", error: "KI: keine verwertbaren Erkenntnisse", processedAt: new Date() },
        });
      }
    } catch (err) {
      console.warn(`[knowledge] Destillierung fehlgeschlagen (${v.youtubeId}):`, getMessage(err));
    }
  }
  return done;
}

// ─── 4. Rebuild ─────────────────────────────────────────────────────────────

const MAX_RAW_CONTENT_CHARS = 9000;
const MAX_BLOCKS_FOR_COMPACT = 40;

async function rebuildKnowledgeBase(): Promise<void> {
  const distilled = await db.knowledgeVideo.findMany({
    where: { status: "DISTILLED", distilledNotes: { not: null } },
    orderBy: { publishedAt: "desc" },
    select: { distilledNotes: true },
  });

  const blocks = distilled
    .map((d) => d.distilledNotes?.trim())
    .filter((b): b is string => Boolean(b));

  let content = blocks.join("\n\n");
  // Wird die rohe Konkatenation zu groß für den Prompt, von der KI verdichten.
  if (content.length > MAX_RAW_CONTENT_CHARS && blocks.length > 1) {
    try {
      content = await compactKnowledge(blocks.slice(0, MAX_BLOCKS_FOR_COMPACT));
    } catch (err) {
      console.warn("[knowledge] Verdichtung fehlgeschlagen, nutze Konkatenation:", getMessage(err));
      content = content.slice(0, MAX_RAW_CONTENT_CHARS);
    }
  }

  await db.knowledgeBase.update({
    where: { id: KNOWLEDGE_BASE_ID },
    data: { content, videoCount: blocks.length },
  });
}

// ─── Haupt-Orchestrierung ───────────────────────────────────────────────────

/**
 * Führt einen Sync-Durchlauf aus (eine beschränkte Batch-Runde pro Pipeline-Stufe).
 * Für vollständigen Backfill / Aufholen mehrmals aufrufen (z.B. via Admin-Button).
 */
export async function runKnowledgeSync(
  opts: { force?: boolean; backfill?: boolean } = {},
): Promise<SyncResult> {
  const kb = await getOrCreateKnowledgeBase();

  // Gate: max. 1×/24h, sofern nicht erzwungen.
  if (!opts.force && kb.lastSyncAt) {
    const elapsed = Date.now() - kb.lastSyncAt.getTime();
    if (elapsed < SYNC_INTERVAL_MS) {
      return { ...EMPTY_RESULT, reason: "rate_limited" };
    }
  }

  // lastSyncAt sofort setzen — verhindert parallele Doppelläufe.
  await db.knowledgeBase.update({
    where: { id: KNOWLEDGE_BASE_ID },
    data: { lastSyncAt: new Date() },
  });

  // Backfill: einmalig automatisch beim ersten echten Lauf, oder explizit.
  const shouldBackfill = opts.backfill ?? !kb.backfillDone;

  const discovered = await discover({ backfill: shouldBackfill });
  if (shouldBackfill) {
    await db.knowledgeBase.update({
      where: { id: KNOWLEDGE_BASE_ID },
      data: { backfillDone: true },
    });
  }

  const transcribed = await transcribePass();
  const { classified, relevant } = await classifyPass();
  const distilled = await distillPass();

  let rebuilt = false;
  if (distilled > 0) {
    await rebuildKnowledgeBase();
    rebuilt = true;
  }

  return { skipped: false, discovered, transcribed, classified, relevant, distilled, rebuilt };
}

/**
 * Lazy-Trigger fürs Admin-Layout. Non-throwing, gated auf 24h. Läuft im
 * Hintergrund (after()) und darf das Rendering nie stören.
 */
export async function maybeRunKnowledgeSync(): Promise<void> {
  try {
    await runKnowledgeSync();
  } catch (err) {
    console.error("[knowledge] Hintergrund-Sync fehlgeschlagen:", getMessage(err));
  }
}

function getMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

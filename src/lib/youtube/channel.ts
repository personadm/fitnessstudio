/**
 * Kanal-Discovery — findet Videos eines YouTube-Kanals.
 *
 * Zwei Wege:
 *   1. RSS (gratis, robust, kein Key): liefert die ~15 neuesten Videos. Für die
 *      tägliche Erkennung neuer Videos die Hauptquelle.
 *   2. Backfill via youtubei.js: blättert durch den kompletten Video-Katalog,
 *      um Alt-Videos einmalig nachzuladen. Best-effort.
 *
 * Server-only.
 */

import "server-only";

export interface DiscoveredVideo {
  youtubeId: string;
  channelId: string;
  title: string;
  description: string | null;
  publishedAt: Date | null;
}

// ─── RSS (neueste Videos) ───────────────────────────────────────────────────

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function matchTag(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? decodeXmlEntities(m[1].trim()) : null;
}

/**
 * Holt die neuesten Videos eines Kanals über den RSS-Feed.
 * Kein API-Key nötig. Liefert i.d.R. die letzten 15 Uploads.
 */
export async function fetchRecentVideosViaRss(channelId: string): Promise<DiscoveredVideo[]> {
  const res = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
    { headers: { "user-agent": "Mozilla/5.0" } },
  );
  if (!res.ok) {
    throw new Error(`RSS-Feed HTTP ${res.status} für Kanal ${channelId}`);
  }
  const xml = await res.text();

  const entries = xml.split("<entry>").slice(1);
  const videos: DiscoveredVideo[] = [];

  for (const entry of entries) {
    const youtubeId = matchTag(entry, "yt:videoId");
    const title = matchTag(entry, "title");
    if (!youtubeId || !title) continue;

    const publishedRaw = matchTag(entry, "published");
    const description = matchTag(entry, "media:description");

    videos.push({
      youtubeId,
      channelId,
      title,
      description: description || null,
      publishedAt: publishedRaw ? new Date(publishedRaw) : null,
    });
  }

  return videos;
}

// ─── Backfill (kompletter Katalog) via youtubei.js ──────────────────────────

let innertubePromise: Promise<unknown> | null = null;
async function getInnertube(): Promise<unknown> {
  if (!innertubePromise) {
    innertubePromise = (async () => {
      const mod = await import("youtubei.js");
      return mod.Innertube.create({ retrieve_player: false });
    })().catch((err) => {
      innertubePromise = null;
      throw err;
    });
  }
  return innertubePromise;
}

interface YoutubeiVideo {
  id?: string;
  video_id?: string;
  type?: string;
  title?: { text?: string } | string;
  author?: { id?: string; name?: string };
  short_description?: string;
  description_snippet?: { text?: string } | string;
}

function readVideoTitle(v: YoutubeiVideo): string | null {
  if (typeof v.title === "string") return v.title;
  if (v.title && typeof v.title.text === "string") return v.title.text;
  return null;
}

function readVideoDescription(v: YoutubeiVideo): string | null {
  if (typeof v.short_description === "string" && v.short_description) return v.short_description;
  const snippet = v.description_snippet;
  if (typeof snippet === "string") return snippet || null;
  if (snippet && typeof snippet.text === "string") return snippet.text || null;
  return null;
}

/**
 * Gehört ein Suchtreffer zum gewünschten Kanal? Primär über die Kanal-ID,
 * fallback über den Kanal-Namen (Suche liefert nicht immer eine ID mit).
 */
function belongsToChannel(v: YoutubeiVideo, channelId: string, channelName: string): boolean {
  const authorId = v.author?.id;
  if (authorId) return authorId === channelId;
  const authorName = v.author?.name?.toLowerCase();
  return Boolean(authorName && authorName.includes(channelName.toLowerCase()));
}

// ─── Aktive Suche (gezielt E-Mail-Marketing-Videos) via youtubei.js ─────────

/**
 * Sucht gezielt nach Videos zu einem Stichwort und behält nur Treffer des
 * gewünschten Kanals. Damit findet der Sync auch ältere/thematisch passende
 * Videos, die nicht im RSS-Feed der letzten Uploads auftauchen.
 *
 * publishedAt bleibt null (Suche liefert nur relative Datumsangaben). Wirft,
 * wenn youtubei.js nicht erreichbar ist — der Aufrufer behandelt das als
 * „diesmal keine Suche möglich".
 */
export async function fetchVideosViaSearch(
  query: string,
  channelId: string,
  channelName: string,
  limit: number,
): Promise<DiscoveredVideo[]> {
  const yt = (await getInnertube()) as {
    search: (
      q: string,
      opts?: { type?: string },
    ) => Promise<{ videos?: YoutubeiVideo[]; results?: YoutubeiVideo[] }>;
  };

  const search = await yt.search(query, { type: "video" });
  const items = (search?.videos ?? search?.results ?? []) as YoutubeiVideo[];

  const out: DiscoveredVideo[] = [];
  const seen = new Set<string>();

  for (const v of items) {
    // Nur echte Video-Knoten (Suche mischt Kanäle/Playlists ein).
    if (v.type && v.type !== "Video") continue;
    const id = v.id ?? v.video_id;
    const title = readVideoTitle(v);
    if (!id || !title || seen.has(id)) continue;
    if (!belongsToChannel(v, channelId, channelName)) continue;
    seen.add(id);
    out.push({
      youtubeId: id,
      channelId,
      title,
      description: readVideoDescription(v),
      publishedAt: null,
    });
    if (out.length >= limit) break;
  }

  return out;
}

/**
 * Lädt bis zu `limit` Videos aus dem kompletten Kanal-Katalog (Alt-Videos).
 * Best-effort: blättert durch youtubei.js-Continuations. publishedAt bleibt
 * null (youtubei liefert nur relative Datumsangaben wie „vor 2 Jahren").
 *
 * Wirft, wenn youtubei.js komplett nicht erreichbar ist — der Aufrufer behandelt
 * das als „Backfill diesmal nicht möglich" und versucht es beim nächsten Lauf.
 */
export async function fetchChannelBackfill(
  channelId: string,
  limit: number,
): Promise<DiscoveredVideo[]> {
  const yt = (await getInnertube()) as {
    getChannel: (id: string) => Promise<{
      getVideos: () => Promise<{
        videos?: YoutubeiVideo[];
        has_continuation?: boolean;
        getContinuation?: () => Promise<{
          videos?: YoutubeiVideo[];
          has_continuation?: boolean;
          getContinuation?: () => Promise<unknown>;
        }>;
      }>;
    }>;
  };

  const channel = await yt.getChannel(channelId);
  let feed = await channel.getVideos();

  const out: DiscoveredVideo[] = [];
  const seen = new Set<string>();

  // Erste Seite + Continuations, bis limit erreicht oder keine Seite mehr da.
  // Harte Obergrenze von 30 Seiten als Sicherheitsnetz gegen Endlos-Loops.
  for (let page = 0; page < 30; page++) {
    const list = (feed?.videos ?? []) as YoutubeiVideo[];
    for (const v of list) {
      const id = v.id;
      const title = readVideoTitle(v);
      if (!id || !title || seen.has(id)) continue;
      seen.add(id);
      out.push({
        youtubeId: id,
        channelId,
        title,
        description: null,
        publishedAt: null,
      });
      if (out.length >= limit) return out;
    }

    if (!feed?.has_continuation || typeof feed.getContinuation !== "function") break;
    feed = (await feed.getContinuation()) as typeof feed;
  }

  return out;
}

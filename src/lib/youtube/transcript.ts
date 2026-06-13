/**
 * Transkript-Adapter — provider-agnostisch.
 *
 * Strategie (Hybrid, vom User gewählt):
 *   1. youtubei.js (gratis, kein Key) — nutzt YouTubes interne InnerTube-API.
 *   2. Fallback auf Supadata-Transkript-API, sobald SUPADATA_API_KEY gesetzt ist.
 *
 * Hintergrund: Der klassische timedtext-Endpoint ist server-seitig durch YouTubes
 * POT-Token-Hardening blockiert (liefert HTTP 200 mit leerem Body). youtubei.js
 * umgeht das teilweise über die Panel-API, ist aber nicht garantiert — daher der
 * optionale API-Fallback.
 *
 * Server-only (youtubei.js bringt Node-APIs mit). Nicht aus Client-Code importieren.
 */

import "server-only";

export type TranscriptSource = "youtubei" | "supadata";

export interface TranscriptResult {
  text: string;
  source: TranscriptSource;
}

// ─── youtubei.js: gecachter Singleton-Client ───────────────────────────────
// Innertube.create() ist teuer (lädt Konfiguration von YouTube). Einmal pro
// Server-Prozess erzeugen und die Promise cachen.
let innertubePromise: Promise<unknown> | null = null;

async function getInnertube(): Promise<unknown> {
  if (!innertubePromise) {
    innertubePromise = (async () => {
      const mod = await import("youtubei.js");
      return mod.Innertube.create({ retrieve_player: false });
    })().catch((err) => {
      // Bei Fehler Cache zurücksetzen, damit der nächste Call neu versucht.
      innertubePromise = null;
      throw err;
    });
  }
  return innertubePromise;
}

/**
 * Extrahiert den Volltext aus dem verschachtelten youtubei.js-Transcript-Objekt.
 * Die Struktur ist nicht stabil typisiert, daher defensives Narrowing.
 */
function extractTranscriptText(transcript: unknown): string {
  const segments =
    (transcript as { transcript?: { content?: { body?: { initial_segments?: unknown[] } } } })
      ?.transcript?.content?.body?.initial_segments ?? [];

  if (!Array.isArray(segments) || segments.length === 0) return "";

  const parts: string[] = [];
  for (const seg of segments) {
    const snippet = (seg as { snippet?: { text?: unknown } })?.snippet?.text;
    if (typeof snippet === "string" && snippet.trim()) {
      parts.push(snippet.trim());
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

async function fetchViaYoutubei(videoId: string): Promise<string | null> {
  try {
    const yt = (await getInnertube()) as {
      getInfo: (id: string) => Promise<{ getTranscript: () => Promise<unknown> }>;
    };
    const info = await yt.getInfo(videoId);
    const transcript = await info.getTranscript();
    const text = extractTranscriptText(transcript);
    return text.length > 0 ? text : null;
  } catch (err) {
    // 400/leer = kein Transkript abrufbar (Hardening oder keine Untertitel).
    console.warn(`[transcript] youtubei.js fehlgeschlagen für ${videoId}:`, getMessage(err));
    return null;
  }
}

// ─── Supadata-Fallback ──────────────────────────────────────────────────────
async function fetchViaSupadata(videoId: string): Promise<string | null> {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL("https://api.supadata.ai/v1/transcript");
    url.searchParams.set("url", `https://www.youtube.com/watch?v=${videoId}`);
    url.searchParams.set("text", "true");

    const res = await fetch(url.toString(), {
      headers: { "x-api-key": apiKey },
    });

    if (!res.ok) {
      console.warn(`[transcript] Supadata HTTP ${res.status} für ${videoId}`);
      return null;
    }

    const data = (await res.json()) as { content?: unknown };
    // Mit text=true liefert Supadata content als String.
    if (typeof data.content === "string" && data.content.trim()) {
      return data.content.replace(/\s+/g, " ").trim();
    }
    // Defensiv: falls doch ein Segment-Array kommt.
    if (Array.isArray(data.content)) {
      const text = data.content
        .map((s) => (s as { text?: unknown })?.text)
        .filter((t): t is string => typeof t === "string")
        .join(" ");
      return text.trim() || null;
    }
    return null;
  } catch (err) {
    console.warn(`[transcript] Supadata fehlgeschlagen für ${videoId}:`, getMessage(err));
    return null;
  }
}

/**
 * Holt das Transkript eines YouTube-Videos. Versucht zuerst gratis youtubei.js,
 * fällt dann auf Supadata zurück (sofern SUPADATA_API_KEY gesetzt).
 *
 * @returns Transkript-Text + Quelle, oder null wenn kein Transkript verfügbar ist.
 */
export async function fetchTranscript(videoId: string): Promise<TranscriptResult | null> {
  const viaYoutubei = await fetchViaYoutubei(videoId);
  if (viaYoutubei) return { text: viaYoutubei, source: "youtubei" };

  const viaSupadata = await fetchViaSupadata(videoId);
  if (viaSupadata) return { text: viaSupadata, source: "supadata" };

  return null;
}

function getMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

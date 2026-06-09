import type { NextRequest } from "next/server";

/**
 * Schlanker In-Memory-Sliding-Window-Rate-Limiter.
 *
 * Bewusst ohne externe Infrastruktur (Redis/Upstash): ausreichend für den
 * Single-Instance-Betrieb auf Render. Bei horizontaler Skalierung (mehrere
 * Instanzen) gilt das Limit pro Instanz — dann auf einen geteilten Store
 * (z.B. Upstash) umstellen.
 */

type Bucket = { hits: number[] };

// Map<schlüssel, Zeitstempel-Liste>. Lebt im Modul-Scope, also pro Prozess.
const store = new Map<string, Bucket>();

// Gelegentliches Aufräumen verwaister Buckets, damit der Speicher nicht wächst.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(now: number, windowMs: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of store) {
    const fresh = bucket.hits.filter((t) => now - t < windowMs);
    if (fresh.length === 0) store.delete(key);
    else bucket.hits = fresh;
  }
}

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSec: number;
};

/**
 * Prüft und registriert einen Zugriff für `key`.
 *
 * @param key       Eindeutiger Bucket-Schlüssel (z.B. `"login:1.2.3.4"`).
 * @param limit     Maximale Anzahl Zugriffe pro Fenster.
 * @param windowMs  Fenstergröße in Millisekunden.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  cleanup(now, windowMs);

  const bucket = store.get(key) ?? { hits: [] };
  const recent = bucket.hits.filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    const oldest = recent[0];
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    bucket.hits = recent;
    store.set(key, bucket);
    return { allowed: false, retryAfterSec };
  }

  recent.push(now);
  bucket.hits = recent;
  store.set(key, bucket);
  return { allowed: true, retryAfterSec: 0 };
}

/** Ermittelt die Client-IP aus den üblichen Proxy-Headern (Render/Vercel). */
export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

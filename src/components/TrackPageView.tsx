"use client";

import { useEffect } from "react";

/**
 * Schickt einen PageView ans Backend, sobald die Seite gemountet ist.
 * Stillschweigend — falls Tracking fehlschlägt, ist's egal.
 *
 * Wir nutzen `sessionStorage` als Dedupe-Marker: derselbe Tab schickt
 * den View für denselben Path nur einmal pro Session (F5 zählt nicht).
 */
export function TrackPageView({ path }: { path: string }) {
  useEffect(() => {
    const key = `track_${path}`;
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // SessionStorage blockiert? Tracken wir trotzdem.
    }

    const referrer = document.referrer || null;
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path, referrer }),
      keepalive: true,
    }).catch(() => {
      // Stillschweigend ignorieren
    });
  }, [path]);

  return null;
}

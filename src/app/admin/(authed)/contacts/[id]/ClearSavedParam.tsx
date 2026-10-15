"use client";

import { useEffect } from "react";

/**
 * Entfernt den Einmal-Parameter ?gespeichert aus der URL, sobald die
 * Erfolgsmeldung angezeigt wurde. So taucht das Banner nach Neuladen oder
 * späteren Aktionen auf der Seite (Status ändern …) nicht wieder auf.
 */
export function ClearSavedParam() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("gespeichert")) return;
    url.searchParams.delete("gespeichert");
    // state = null: So übernimmt der Next.js-Router die neue URL (sonst würden
    // spätere Server-Actions auf dieser Seite den Parameter wieder einsetzen).
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);

  return null;
}

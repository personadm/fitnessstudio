"use client";

import { useEffect } from "react";

/**
 * Erzwingt beim initialen Page-Load Scroll-Position auf den Anfang der Seite.
 *
 * Schützt gegen externe Links mit Hash-Anker (z.B. /#email von der Wix-Site),
 * die den Browser sonst zum Anker scrollen lassen. Wir wollen, dass die Seite
 * IMMER oben startet — User soll die ganze Hero-Section + Storytelling sehen,
 * nicht direkt beim Formular landen.
 *
 * Interne Anchor-Klicks (z.B. "Zum Formular ↑") sind davon unbeeinflusst,
 * weil sie nicht das useEffect erneut auslösen.
 */
export function ScrollToTop() {
  useEffect(() => {
    // Automatische Scroll-Wiederherstellung des Browsers abschalten, damit
    // ein Reload nicht erneut zum Formular springt.
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // Hash-Anker (z.B. /#email vom gedruckten QR-Code oder der Wix-Site) aus
    // der URL entfernen, ohne einen Navigations-/Scroll-Sprung auszulösen.
    if (window.location.hash) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }

    // Browser hat bei Hash-Anker ggf. schon gescrollt — wir überstimmen das.
    // Zweiter Aufruf via rAF stellt sicher, dass wir nach dem Browser-Scroll laufen.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    requestAnimationFrame(() =>
      window.scrollTo({ top: 0, left: 0, behavior: "instant" }),
    );
  }, []);
  return null;
}

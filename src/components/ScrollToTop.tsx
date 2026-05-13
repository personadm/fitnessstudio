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
    // Browser hat bei Hash-Anker schon gescrollt — wir überstimmen das.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);
  return null;
}

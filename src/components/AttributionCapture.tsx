"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

/**
 * Erfasst beim ersten Aufruf die Lead-Herkunft (gclid, fbclid, utm, referrer)
 * in sessionStorage. First-party und technisch zur Anfrageverarbeitung nötig —
 * läuft daher bewusst UNABHÄNGIG von der Cookie-Consent-Entscheidung.
 */
export function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);

  return null;
}

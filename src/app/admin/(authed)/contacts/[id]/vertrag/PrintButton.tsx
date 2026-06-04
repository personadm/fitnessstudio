"use client";

const PETROL = "#0F6E56";

/**
 * Print-Button — muss als Client-Component existieren weil onClick auf einem
 * <button> in einer Server-Component verboten ist (Next.js 15 RSC-Regel).
 * Wird in der Vertragsseite oben rechts in der no-print Top-Bar verwendet.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md px-4 py-2 text-sm font-semibold text-white"
      style={{ backgroundColor: PETROL }}
    >
      🖨 Vertrag drucken
    </button>
  );
}

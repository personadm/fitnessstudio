import { createHash, timingSafeEqual } from "crypto";

/**
 * Zugang zur versteckten Seite /team/<code>. Es gibt zwei Codes:
 *
 * - SCHICHTPLAN_CODE          → Team: Schichtplan und Termine
 * - SCHICHTPLAN_LEITUNG_CODE  → Leitung: zusätzlich Stundenkonten, Kosten, Regelprüfung
 *
 * Kein Login: Wer den Link kennt, sieht die Seite. Deshalb müssen die Codes
 * lang und zufällig sein (z. B. `openssl rand -hex 16`). Ein nicht gesetzter
 * oder zu kurzer Code ist deaktiviert (404).
 */
export const MIN_CODE_LENGTH = 24;

export type TeamAccess = "team" | "leitung";

function matches(provided: string, expected: string | undefined): boolean {
  if (!expected || expected.length < MIN_CODE_LENGTH) return false;
  // Hashen gleicht die Längen an, damit timingSafeEqual nichts über die Länge verrät.
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function accessFor(provided: string): TeamAccess | null {
  if (matches(provided, process.env.SCHICHTPLAN_LEITUNG_CODE)) return "leitung";
  if (matches(provided, process.env.SCHICHTPLAN_CODE)) return "team";
  return null;
}

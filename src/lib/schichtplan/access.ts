import { createHash, timingSafeEqual } from "crypto";

/**
 * Zugang zur versteckten Team-Seite /team/<SCHICHTPLAN_CODE>.
 *
 * Kein Login: Wer den Link kennt, sieht den Plan. Deshalb muss der Code lang
 * und zufällig sein (z. B. `openssl rand -hex 16`). Ist SCHICHTPLAN_CODE nicht
 * gesetzt oder zu kurz, ist die Seite komplett deaktiviert (404).
 */
export const MIN_CODE_LENGTH = 24;

export function isTeamCodeValid(provided: string): boolean {
  const expected = process.env.SCHICHTPLAN_CODE;
  if (!expected || expected.length < MIN_CODE_LENGTH) return false;
  // Hashen gleicht die Längen an, damit timingSafeEqual nichts über die Länge verrät.
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

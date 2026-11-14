// ─────────────────────────────────────────────────────────────
// Eingabe-Maske für das Geburtsdatum im Anmeldeformular (client-sicher)
//
// Das Feld ist bewusst ein Textfeld statt type="date": iOS Safari zeigt ein
// leeres Datumsfeld ohne Platzhalter und mit eigener Mindestbreite an (ragt
// rechts heraus, niemand erkennt, was rein soll). Als Textfeld mit
// Platzhalter „Geburtsdatum (TT.MM.JJJJ)" sieht es auf jedem Gerät aus wie die
// übrigen Felder. Der Server (normalizeBirthDate) versteht TT.MM.JJJJ.
// ─────────────────────────────────────────────────────────────

/** Formathinweis, wie er im Feld und in der Fehlermeldung erscheint. */
export const BIRTHDATE_FORMAT_HINT = "TT.MM.JJJJ";

/** Browser-Prüfung vor dem Absenden: Tag.Monat.Jahr, Tag/Monat ein- oder zweistellig. */
export const BIRTHDATE_INPUT_PATTERN = "\\d{1,2}\\.\\d{1,2}\\.\\d{4}";

/** Länge von „TT.MM.JJJJ". */
export const BIRTHDATE_MAX_LENGTH = 10;

const SEGMENT_LIMITS = [2, 2, 4] as const;
// Höchste Ziffer, mit der Tag (0–3) bzw. Monat (0–1) zweistellig beginnen kann.
const LEADING_DIGIT_MAX = ["3", "1", "9"] as const;
const SEPARATOR = /[.,/\- ]/;

/**
 * Bringt eine Eingabe beim Tippen in die Form TT.MM.JJJJ:
 *  - „12041975" → „12.04.1975" (Punkte werden automatisch gesetzt)
 *  - „1241975" → „12.04.1975": Tag ab 4 / Monat ab 2 kann nur einstellig sein
 *    → führende 0 wird ergänzt (die iPhone-Zahlentastatur hat keinen Punkt)
 *  - „1.4.1975" → „1.04.1975" (selbst getippte Punkte schließen Tag/Monat ab)
 *  - Autofill im ISO-Format „1975-04-12" → „12.04.1975"
 * Am Ende steht nie ein automatischer Punkt, damit Löschen normal funktioniert.
 */
export function formatBirthDateInput(raw: string): string {
  const iso = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`;

  const parts = ["", "", ""];
  let index = 0;

  for (const ch of raw) {
    if (/\d/.test(ch)) {
      if (parts[index].length >= SEGMENT_LIMITS[index]) {
        if (index === parts.length - 1) break;
        index += 1;
      }
      const onlySingleDigit = parts[index] === "" && ch > LEADING_DIGIT_MAX[index];
      parts[index] += onlySingleDigit ? `0${ch}` : ch;
    } else if (SEPARATOR.test(ch) && parts[index].length > 0 && index < parts.length - 1) {
      index += 1;
    }
  }

  return parts.slice(0, index + 1).join(".");
}

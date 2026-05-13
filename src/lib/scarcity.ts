/**
 * Erzeugt deterministische "Verknappungs"-Werte (Tage + freie Plätze) aus
 * einem Seed-String. Gleicher Seed → gleiche Werte, immer.
 *
 * Wird auf der Anmelde-Page genutzt, damit jeder Kunde "seine" Zahlen sieht,
 * die bei Reload stabil bleiben. Seed ist typisch der Referral-Token aus
 * der Angebots-Mail.
 */

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function rangeFromSeed(seed: string, min: number, max: number): number {
  const h = hashSeed(seed);
  return min + (h % (max - min + 1));
}

export interface ScarcityValues {
  daysTotal: number; // Gesamt-Tage Laufzeit (1-8)
  placesLeft: number; // Verfügbare Plätze (2-8)
  deadlineIso: string; // Wann das Angebot abläuft (ISO-String)
}

/**
 * Berechnet die Verknappungs-Werte für einen Kunden.
 *
 * @param seed     Stabiler Identifier (z.B. refToken)
 * @param startAt  Wann der Countdown gestartet hat (z.B. doiConfirmedAt)
 */
export function computeScarcity(seed: string, startAt: Date): ScarcityValues {
  const daysTotal = rangeFromSeed(seed + ":days", 1, 8);
  const placesLeft = rangeFromSeed(seed + ":places", 2, 8);
  const deadline = new Date(startAt.getTime() + daysTotal * 24 * 60 * 60 * 1000);
  return {
    daysTotal,
    placesLeft,
    deadlineIso: deadline.toISOString(),
  };
}

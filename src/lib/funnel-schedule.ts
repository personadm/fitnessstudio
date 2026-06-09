/**
 * Reine Termin-Berechnung für Funnel-Schritte.
 *
 * WICHTIG: Diese Datei hat KEINE Server-Abhängigkeiten (kein `db`, kein `mail`,
 * kein `process.env`). Sie ist absichtlich rein, damit sie an EINER Stelle die
 * Sende-Zeitpunkte berechnet — genutzt sowohl von der Versand-Engine
 * (src/lib/funnels.ts) als auch von der Admin-Vorschau (Client-Komponente).
 * Dadurch können Vorschau und tatsächlicher Versand nie auseinanderlaufen.
 *
 * Drei Timing-Modi pro Schritt — siehe calculateDueAt():
 *   1) RELATIV   (scheduleWeekday === null): genau `delayDays + delayHours`
 *      nach Eintragung.
 *   2) FESTER WOCHENTAG / HYBRID (scheduleWeekday gesetzt): frühestens nach
 *      `delayDays + delayHours`, dann der nächste passende Wochentag um die
 *      konfigurierte Uhrzeit.
 *   3) LEGACY-WOCHENPLAN: Schritt hat keine eigenen Schedule-Felder, der Funnel
 *      ist aber funnel-weit auf Wochenplan gestellt. Backwards-compat.
 */

export interface ScheduleStep {
  id: string;
  orderNum: number;
  delayDays: number;
  delayHours: number | null;
  scheduleWeekday: number | null;
  scheduleHour: number | null;
  scheduleMinute: number | null;
}

export interface FunnelLegacySchedule {
  scheduleWeekday: number | null;
  scheduleWeekInterval: number;
  scheduleHour: number;
  scheduleMinute: number;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Nächster passender Wochentag NACH einem gegebenen Datum (inkl. Zeit).
 */
export function nextWeekdayOccurrence(
  earliest: Date,
  targetWeekday: number,
  hour: number,
  minute: number,
): Date {
  const result = new Date(earliest);
  result.setHours(hour, minute, 0, 0);

  const currentWeekday = result.getDay();
  let daysToAdd = (targetWeekday - currentWeekday + 7) % 7;

  // Heute der Zielwochentag aber Uhrzeit verpasst → eine Woche weiter
  if (daysToAdd === 0 && result.getTime() < earliest.getTime()) {
    daysToAdd = 7;
  }

  result.setDate(result.getDate() + daysToAdd);
  return result;
}

/**
 * Berechnet den frühesten Sendezeitpunkt eines Schritts für eine Enrollment.
 * Rückgabe: Millisekunden-Timestamp.
 */
export function calculateDueAt(
  step: ScheduleStep,
  enrollmentStartedAt: Date,
  funnelLegacy: FunnelLegacySchedule,
): number {
  const baseDelayMs = (step.delayDays * 24 + (step.delayHours ?? 0)) * HOUR_MS;
  const earliestDueAt = enrollmentStartedAt.getTime() + baseDelayMs;

  // FESTER WOCHENTAG / HYBRID: Step hat eigene Schedule-Felder
  if (step.scheduleWeekday !== null && step.scheduleWeekday !== undefined) {
    const earliestDate = new Date(earliestDueAt);
    return nextWeekdayOccurrence(
      earliestDate,
      step.scheduleWeekday,
      step.scheduleHour ?? 9,
      step.scheduleMinute ?? 0,
    ).getTime();
  }

  // LEGACY-WOCHENPLAN: Step hat keine eigenen Felder, Funnel hat Wochenplan
  if (
    funnelLegacy.scheduleWeekday !== null &&
    funnelLegacy.scheduleWeekday !== undefined
  ) {
    const first = nextWeekdayOccurrence(
      enrollmentStartedAt,
      funnelLegacy.scheduleWeekday,
      funnelLegacy.scheduleHour,
      funnelLegacy.scheduleMinute,
    );
    const stepIndex = step.orderNum - 1;
    return (
      first.getTime() +
      stepIndex * funnelLegacy.scheduleWeekInterval * 7 * DAY_MS
    );
  }

  // RELATIV (klassisch)
  return earliestDueAt;
}

export interface ScheduleEntry {
  step: ScheduleStep;
  dueAt: number;
  /** true, wenn die Engine diesen Schritt überspringen würde (siehe unten). */
  skipped: boolean;
  /** true, wenn ein anderer Schritt im exakt selben Sende-Slot liegt. */
  collision: boolean;
}

/**
 * Berechnet den kompletten Sende-Fahrplan einer Enrollment — exakt mit der
 * Sortier- und Skip-Logik der Versand-Engine (processFunnelsInner in
 * src/lib/funnels.ts). So zeigt die Vorschau, was real passieren würde.
 *
 * @param steps         Alle Schritte des Funnels.
 * @param enrollmentStartedAt  Eintragungszeitpunkt (Beispiel-Datum in der Vorschau).
 * @param funnelLegacy  Funnel-weite Legacy-Wochenplan-Settings.
 * @param alreadySentStepIds  Optional: bereits versendete Schritt-IDs
 *                            (für Vorschau eines bestehenden Kontakts).
 */
export function computeSchedule(
  steps: ScheduleStep[],
  enrollmentStartedAt: Date,
  funnelLegacy: FunnelLegacySchedule,
  alreadySentStepIds: ReadonlySet<string> = new Set(),
): ScheduleEntry[] {
  const withDueAt = steps.map((step) => ({
    step,
    dueAt: calculateDueAt(step, enrollmentStartedAt, funnelLegacy),
  }));
  withDueAt.sort((a, b) => a.dueAt - b.dueAt);

  // SKIP-CHECK (identisch zur Engine): Wurde für diese Enrollment bereits ein
  // zeitlich SPÄTERER Schritt versendet, dürfen frühere nicht mehr raus.
  let maxSentDueAt = -1;
  for (const { step, dueAt } of withDueAt) {
    if (alreadySentStepIds.has(step.id) && dueAt > maxSentDueAt) {
      maxSentDueAt = dueAt;
    }
  }

  // Kollisions-Erkennung: gleicher Sende-Slot (gerundet auf die Minute).
  const slotCounts = new Map<number, number>();
  for (const { dueAt } of withDueAt) {
    const slot = Math.floor(dueAt / (60 * 1000));
    slotCounts.set(slot, (slotCounts.get(slot) ?? 0) + 1);
  }

  return withDueAt.map(({ step, dueAt }) => {
    const isSent = alreadySentStepIds.has(step.id);
    const skipped = !isSent && dueAt < maxSentDueAt;
    const slot = Math.floor(dueAt / (60 * 1000));
    const collision = (slotCounts.get(slot) ?? 0) > 1;
    return { step, dueAt, skipped, collision };
  });
}

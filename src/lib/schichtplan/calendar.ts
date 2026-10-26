/**
 * Datums-Helfer für den Schichtplan. Alle Daten sind ISO-Strings (JJJJ-MM-TT)
 * ohne Uhrzeit; gerechnet wird in UTC, damit Sommer-/Winterzeit-Wechsel
 * (z. B. 25.10.2026) keine Tage verschieben.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;
const WEEKDAYS_LONG = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
] as const;
const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

const hoursFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

function toUtc(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return fromUtc(new Date(toUtc(iso).getTime() + days * DAY_MS));
}

/** Montag der Kalenderwoche, in der `iso` liegt. */
export function startOfWeek(iso: string): string {
  const weekday = toUtc(iso).getUTCDay();
  return addDays(iso, -((weekday + 6) % 7));
}

export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** ISO-8601-Kalenderwoche (die Woche gehört zu dem Jahr ihres Donnerstags). */
export function isoWeekNumber(iso: string): number {
  const thursday = toUtc(addDays(startOfWeek(iso), 3));
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  return Math.floor((thursday.getTime() - yearStart) / DAY_MS / 7) + 1;
}

/** Monat (JJJJ-MM), dem eine Woche nach ISO-Regel zugeordnet wird. */
export function monthOfWeek(weekStart: string): string {
  return addDays(weekStart, 3).slice(0, 7);
}

export function isWeekend(iso: string): boolean {
  const weekday = toUtc(iso).getUTCDay();
  return weekday === 0 || weekday === 6;
}

export function weekdayShort(iso: string): string {
  return WEEKDAYS_SHORT[toUtc(iso).getUTCDay()];
}

export function weekdayLong(iso: string): string {
  return WEEKDAYS_LONG[toUtc(iso).getUTCDay()];
}

/** TT.MM.JJJJ */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/** TT.MM. */
export function formatDayMonth(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}.`;
}

/** „Oktober 2026“ für „2026-10“. */
export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** Dezimalstunden → „HH:MM“ (20.25 → „20:15“). */
export function formatTime(decimal: number): string {
  const totalMinutes = Math.round(decimal * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Kurzform für enge Balken: 9 → „9“, 20.25 → „20:15“. */
export function formatTimeCompact(decimal: number): string {
  const [h, m] = formatTime(decimal).split(":");
  return m === "00" ? String(Number(h)) : `${Number(h)}:${m}`;
}

export function formatTimeRange(start: number, end: number): string {
  return `${formatTime(start)}–${formatTime(end)}`;
}

/** „5,83 h“ */
export function formatHours(hours: number): string {
  return `${hoursFormat.format(hours)} h`;
}

/** Heutiges Datum in Europe/Berlin als ISO-String. */
export function todayInBerlin(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Aktuelle Uhrzeit in Europe/Berlin als Dezimalstunden. */
export function nowHourInBerlin(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") + get("minute") / 60;
}

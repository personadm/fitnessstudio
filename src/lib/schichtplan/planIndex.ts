import { addDays, startOfWeek } from "./calendar";
import type { PlanEvent, Shift, TeamPlan } from "./plan";

/** Vorberechnete Nachschlage-Strukturen für die Ansichten (rein, ohne Seiteneffekte). */
export interface PlanIndex {
  firstDate: string;
  lastDate: string;
  weekStarts: string[];
  shiftsByDate: ReadonlyMap<string, readonly Shift[]>;
  eventsByDate: ReadonlyMap<string, readonly PlanEvent[]>;
  startHour: number;
  endHour: number;
}

function groupByDate<T extends { date: string; start: number }>(
  items: readonly T[],
): Map<string, T[]> {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  return sorted.reduce((map, item) => {
    map.set(item.date, [...(map.get(item.date) ?? []), item]);
    return map;
  }, new Map<string, T[]>());
}

export function buildPlanIndex(plan: TeamPlan): PlanIndex {
  const dates = plan.shifts.map((s) => s.date).sort();
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];

  const firstWeek = startOfWeek(firstDate);
  const lastWeek = startOfWeek(lastDate);
  const weekCount = Math.round(
    (Date.parse(lastWeek) - Date.parse(firstWeek)) / (7 * 24 * 60 * 60 * 1000),
  );
  const weekStarts = Array.from({ length: weekCount + 1 }, (_, i) => addDays(firstWeek, i * 7));

  const timed = [...plan.shifts, ...plan.events];
  const startHour = Math.floor(Math.min(...timed.map((t) => t.start)));
  const endHour = Math.ceil(Math.max(...timed.map((t) => t.end)));

  return {
    firstDate,
    lastDate,
    weekStarts,
    shiftsByDate: groupByDate(plan.shifts),
    eventsByDate: groupByDate(plan.events),
    startHour,
    endHour,
  };
}

export function isInPlan(index: PlanIndex, iso: string): boolean {
  return iso >= index.firstDate && iso <= index.lastDate;
}

/** Datum auf den Planzeitraum begrenzen (z. B. „heute“ liegt nach dem letzten Plantag). */
export function clampToPlan(index: PlanIndex, iso: string): string {
  if (iso < index.firstDate) return index.firstDate;
  if (iso > index.lastDate) return index.lastDate;
  return iso;
}

export interface PersonTotals {
  hours: number;
  days: number;
}

/** Angerechnete Stunden und Einsatztage einer Person über eine Liste von Tagen. */
export function totalsFor(index: PlanIndex, person: string, days: readonly string[]): PersonTotals {
  const perDay = days.map((day) =>
    (index.shiftsByDate.get(day) ?? []).filter((s) => s.person === person),
  );
  return {
    hours: perDay.flat().reduce((sum, s) => sum + s.hours, 0),
    days: perDay.filter((entries) => entries.length > 0).length,
  };
}

/** Termine, die eine Person an einem Tag betreffen. */
export function eventsForPerson(
  index: PlanIndex,
  day: string,
  person: string,
): readonly PlanEvent[] {
  return (index.eventsByDate.get(day) ?? []).filter((e) => e.people.includes(person));
}

/** Termine ohne Stammteam-Beteiligung (externe Kursleitung, offene Kurse). */
export function externalEvents(index: PlanIndex, day: string): readonly PlanEvent[] {
  return (index.eventsByDate.get(day) ?? []).filter((e) => e.people.length === 0);
}

import { z } from "zod";
import rawPlan from "./plan-data.json";

/**
 * Schichtplan-Daten für die versteckte Team-Seite (/team/[code]).
 *
 * Quelle: Übergabe-Export vom 26.10.2026 (Studio-Daten.json), reduziert auf
 * Schichten und Termine. Löhne, Stundenkonten und Kosten sind bewusst NICHT
 * enthalten — das Repo ist öffentlich und die Team-Seite hat kein Login.
 *
 * `start`/`end` sind Dezimalstunden (20.25 = 20:15 Uhr). `hours` ist die
 * angerechnete Stundenzahl und kann bei Abwesenheiten vom Intervall abweichen.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hour = z.number().min(0).max(24);

export const SHIFT_KINDS = ["Studio", "Urlaub", "Schule", "Ahaus", "Five-Schulung"] as const;
export const EVENT_CATEGORIES = ["kurs", "meeting", "stash", "hinweis"] as const;

const personSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  inactiveFrom: isoDate.nullable(),
});

const shiftSchema = z
  .object({
    id: z.string().min(1),
    date: isoDate,
    person: z.string().min(1),
    kind: z.enum(SHIFT_KINDS),
    start: hour,
    end: hour,
    hours: z.number().min(0),
  })
  .refine((s) => s.end > s.start, { message: "Schicht endet vor ihrem Beginn" });

const eventSchema = z
  .object({
    id: z.string().min(1),
    date: isoDate,
    category: z.enum(EVENT_CATEGORIES),
    title: z.string().min(1),
    /** Kurzlabel für schmale Spalten */
    short: z.string().optional(),
    people: z.array(z.string().min(1)),
    start: hour,
    end: hour,
    warning: z.string().optional(),
  })
  .refine((e) => e.end > e.start, { message: "Termin endet vor seinem Beginn" });

const planSchema = z.object({
  source: z.object({ exportDate: isoDate, label: z.string(), note: z.string() }),
  people: z.array(personSchema).min(1),
  shifts: z.array(shiftSchema),
  events: z.array(eventSchema),
});

export type TeamPlan = z.infer<typeof planSchema>;
export type Person = z.infer<typeof personSchema>;
export type Shift = z.infer<typeof shiftSchema>;
export type PlanEvent = z.infer<typeof eventSchema>;
export type ShiftKind = (typeof SHIFT_KINDS)[number];
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

let cached: TeamPlan | null = null;

/** Lädt und validiert den Planstand einmal pro Serverprozess. */
export function loadTeamPlan(): TeamPlan {
  if (cached) return cached;
  const plan = planSchema.parse(rawPlan);
  const known = new Set(plan.people.map((p) => p.name));
  const unknown = [
    ...plan.shifts.map((s) => s.person),
    ...plan.events.flatMap((e) => e.people),
  ].filter((name) => !known.has(name));
  if (unknown.length > 0) {
    throw new Error(`Schichtplan enthält unbekannte Personen: ${[...new Set(unknown)].join(", ")}`);
  }
  cached = plan;
  return plan;
}

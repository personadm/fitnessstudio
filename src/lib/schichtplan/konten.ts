import { z } from "zod";
import rawKonten from "./konten-data.json";
import { isWeekend } from "./calendar";
import { SHIFT_KINDS, type ShiftKind, type TeamPlan } from "./plan";

/**
 * Stundenkonten, Kosten und Lou-Historie für die Leitungs-Ansicht.
 *
 * Alles wird aus den Schichten neu berechnet; die Werte aus dem Übergabe-
 * Export dienen nur als Kontrollsummen. Nur serverseitig verwenden — die
 * Datei enthält Löhne.
 *
 * Kontostand = Vormonat + angerechnete Monatsstunden − Monatssoll + Korrekturen
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const month = z.string().regex(/^\d{4}-\d{2}$/);

const kontenSchema = z.object({
  source: z.string(),
  monthlyTargetHours: z.number().positive(),
  wagesEUR: z.record(z.number().positive().nullable()),
  openingBalances: z.array(z.object({ person: z.string(), date: isoDate, hours: z.number() })),
  corrections: z.array(
    z.object({ person: z.string(), month, hours: z.number(), reason: z.string().min(1), date: isoDate, by: z.string().min(1) }),
  ),
  louHistory: z.object({
    carryFrom2025Hours: z.number(),
    rows: z.array(
      z.object({
        month,
        geleistet: z.number(),
        urlaub: z.number(),
        feiertage: z.number(),
        krankheit: z.number(),
        studium: z.number(),
        summe: z.number(),
        differenz: z.number(),
      }),
    ),
  }),
  controls: z.array(
    z.object({
      person: z.string(),
      month,
      hours: z.number(),
      weekendShifts: z.number().int(),
      closingShifts: z.number().int(),
      earlyEnds: z.number().int(),
      closingBalanceHours: z.number().nullable(),
    }),
  ),
  controlTotals: z.array(z.object({ month, costEUR: z.number(), reserveHours: z.number() })),
  previousPlans: z.array(
    z.object({
      month,
      label: z.string(),
      hours: z.record(z.number()),
      closingBalanceHours: z.record(z.number()),
      costEUR: z.number(),
    }),
  ),
  planningNotes: z.array(
    z.object({
      month,
      kind: z.enum(["diskrepanz", "annahme", "offen"]),
      title: z.string(),
      text: z.string(),
      /** Datum, an dem die Leitung die Annahme bestätigt hat */
      confirmedOn: isoDate.optional(),
    }),
  ),
  octoberFile: z.object({
    label: z.string(),
    targetHours: z.number(),
    openingHours: z.number(),
    closing: z.record(z.number()),
  }),
  assumptions: z.array(z.string()),
});

type Konten = z.infer<typeof kontenSchema>;
export type LouHistory = Konten["louHistory"];
export type OctoberFile = Konten["octoberFile"];
export type PreviousPlan = Konten["previousPlans"][number];
export type PlanningNote = Konten["planningNotes"][number];

export interface MonthAccount {
  person: string;
  role: string;
  month: string;
  openingHours: number | null;
  creditedHours: number;
  byKind: Partial<Record<ShiftKind, number>>;
  targetHours: number | null;
  correctionsHours: number;
  differenceHours: number | null;
  closingHours: number | null;
  weekendShifts: number;
  closingShifts: number;
  earlyEnds: number;
  wageEUR: number | null;
  costCents: number | null;
  /** null = kein Kontrollwert vorhanden */
  controlMismatches: string[] | null;
  /** z. B. „im November nicht in Ochtrup eingesetzt“ – dann kein Saldo in diesem Plan */
  note: string | null;
}

export interface MonthCost {
  month: string;
  cents: number;
  isComplete: boolean;
  controlEUR: number | null;
}

export interface AccountsOverview {
  source: string;
  months: string[];
  rows: MonthAccount[];
  costs: MonthCost[];
  louHistory: LouHistory;
  octoberFile: OctoberFile;
  assumptions: string[];
  monthlyTargetHours: number;
  previousPlans: PreviousPlan[];
  planningNotes: PlanningNote[];
}

const CLOSING_END = 22;
const EARLY_END = 20.25;
const TOLERANCE = 0.005;

const round2 = (n: number) => Math.round(n * 100) / 100;

let cached: Konten | null = null;

function loadKonten(): Konten {
  if (!cached) cached = kontenSchema.parse(rawKonten);
  return cached;
}

function compareWithControl(konten: Konten, row: Omit<MonthAccount, "controlMismatches" | "note">): string[] | null {
  const control = konten.controls.find((c) => c.person === row.person && c.month === row.month);
  if (!control) return null;
  const checks: [string, number | null, number | null][] = [
    ["Stunden", row.creditedHours, control.hours],
    ["Wochenenddienste", row.weekendShifts, control.weekendShifts],
    ["Abschlussdienste", row.closingShifts, control.closingShifts],
    ["20:15-Feierabende", row.earlyEnds, control.earlyEnds],
    ["Kontostand", row.closingHours, control.closingBalanceHours],
  ];
  return checks
    .filter(([, mine, theirs]) => mine !== null && theirs !== null && Math.abs(mine - theirs) > TOLERANCE)
    .map(([label, mine, theirs]) => `${label}: berechnet ${mine}, Übergabe ${theirs}`);
}

export function buildAccounts(plan: TeamPlan): AccountsOverview {
  const konten = loadKonten();
  const months = [...new Set(plan.shifts.map((s) => s.date.slice(0, 7)))].sort();

  const rows = plan.people.flatMap((person) => {
    const opening = konten.openingBalances.find((b) => b.person === person.name);
    const wage = konten.wagesEUR[person.name] ?? null;
    const hasAccount = Boolean(opening);

    return months.reduce<MonthAccount[]>((acc, m) => {
      const isActive = !person.inactiveFrom || person.inactiveFrom > `${m}-01`;
      const shifts = plan.shifts.filter((s) => s.person === person.name && s.date.startsWith(m));
      if (!isActive || (!hasAccount && shifts.length === 0)) return acc;
      const away = person.unavailable.find((u) => u.from <= `${m}-01` && u.to >= `${m}-28`);
      if (away && shifts.length === 0) {
        const previous = acc[acc.length - 1];
        return [
          ...acc,
          {
            person: person.name,
            role: person.role,
            month: m,
            openingHours: previous?.closingHours ?? opening?.hours ?? null,
            creditedHours: 0,
            byKind: {},
            targetHours: null,
            correctionsHours: 0,
            differenceHours: null,
            closingHours: null,
            weekendShifts: 0,
            closingShifts: 0,
            earlyEnds: 0,
            wageEUR: wage,
            costCents: 0,
            controlMismatches: null,
            note: away.reason,
          },
        ];
      }

      const studio = shifts.filter((s) => s.kind === "Studio");
      const creditedHours = round2(shifts.reduce((sum, s) => sum + s.hours, 0));
      const byKind = Object.fromEntries(
        SHIFT_KINDS.map((k) => [k, round2(shifts.filter((s) => s.kind === k).reduce((sum, s) => sum + s.hours, 0))]).filter(
          ([, h]) => (h as number) > 0,
        ),
      ) as Partial<Record<ShiftKind, number>>;
      const correctionsHours = round2(
        konten.corrections.filter((c) => c.person === person.name && c.month === m).reduce((sum, c) => sum + c.hours, 0),
      );
      const previous = acc[acc.length - 1];
      const openingHours = hasAccount ? (previous?.closingHours ?? opening?.hours ?? null) : null;
      const targetHours = hasAccount ? konten.monthlyTargetHours : null;
      const differenceHours = targetHours === null ? null : round2(creditedHours - targetHours);
      const closingHours =
        openingHours === null || differenceHours === null ? null : round2(openingHours + differenceHours + correctionsHours);

      const base = {
        person: person.name,
        role: person.role,
        month: m,
        openingHours,
        creditedHours,
        byKind,
        targetHours,
        correctionsHours,
        differenceHours,
        closingHours,
        weekendShifts: studio.filter((s) => isWeekend(s.date)).length,
        closingShifts: studio.filter((s) => s.end >= CLOSING_END).length,
        earlyEnds: studio.filter((s) => s.end === EARLY_END).length,
        wageEUR: wage,
        costCents: wage === null ? null : Math.round(creditedHours * wage * 100),
      };
      return [...acc, { ...base, controlMismatches: compareWithControl(konten, base), note: null }];
    }, []);
  });

  const costs = months.map((m) => {
    const inMonth = rows.filter((r) => r.month === m);
    const control = konten.controlTotals.find((t) => t.month === m);
    return {
      month: m,
      cents: inMonth.reduce((sum, r) => sum + (r.costCents ?? 0), 0),
      isComplete: inMonth.every((r) => r.costCents !== null),
      controlEUR: control?.costEUR ?? null,
    };
  });

  return {
    source: konten.source,
    months,
    rows,
    costs,
    louHistory: konten.louHistory,
    octoberFile: konten.octoberFile,
    assumptions: konten.assumptions,
    monthlyTargetHours: konten.monthlyTargetHours,
    previousPlans: konten.previousPlans,
    planningNotes: konten.planningNotes,
  };
}

import {
  addDays,
  formatDayMonth,
  formatHours,
  formatTimeRange,
  isWeekend,
  isoWeekNumber,
  monthOfWeek,
  startOfWeek,
  weekdayShort,
} from "./calendar";
import type { Person, PlanEvent, Shift, TeamPlan } from "./plan";

/**
 * Regelprüfung für einen Planstand. Rein lesend: findet Auffälligkeiten,
 * ändert nichts. Die Grenzwerte sind Planungsregeln des Studios, keine
 * rechtlich geprüften Vorgaben.
 */

export interface RuleConfig {
  weekdayOpen: { start: number; end: number };
  weekendOpen: { start: number; end: number };
  earlyEnd: number;
  /** Die 20:15-Regel kam mit den November-Vorgaben; ältere Pläne nicht daran messen */
  earlyEndRuleFrom: string;
  closingEnd: number;
  weeklyTargetHours: number;
  /** Annahme aus der bisherigen Berechnung, nicht vertraglich bestätigt */
  weeklyMaxHours: number;
  maxDaysPerWeek: number;
  maxConsecutiveDays: number;
  minRestHours: number;
  maxWeekendShiftsPerMonth: number;
  /** Studio-Dienst, der danach endet, gilt als Spätschicht */
  lateShiftEndsAfter: number;
  minMentorOverlapHours: number;
  mentor: string;
  /** Azubis: decken Kurszeiten auf der Fläche, vor Falk einzuplanen */
  trainees: readonly string[];
  /** Rollen, die als Stammteam zählen (Ausgeschiedene nur bis zum Austritt) */
  coreRoles: readonly string[];
  monthlyTargetHours: number;
  /** Regel 4: Falk erst, wenn Azubis sonst über diese Monats-Überstunden kämen */
  traineeOvertimeLimit: number;
  /** Feste Schichtzeiten mit Wechsel um 15 Uhr gelten ab diesem Tag */
  shiftPatternFrom: string;
  weekdayShifts: readonly Interval[];
  tuesdayShifts: readonly Interval[];
  stashShifts: readonly Interval[];
  /** weekday: 0 = Sonntag … 6 = Samstag */
  fixedShifts: readonly { person: string; weekday: number; start: number; end: number; from: string }[];
}

export const DEFAULT_RULES: RuleConfig = {
  weekdayOpen: { start: 9, end: 22 },
  weekendOpen: { start: 10, end: 15 },
  earlyEnd: 20.25,
  earlyEndRuleFrom: "2026-11-01",
  closingEnd: 22,
  weeklyTargetHours: 35,
  weeklyMaxHours: 38,
  maxDaysPerWeek: 5,
  maxConsecutiveDays: 5,
  minRestHours: 11,
  maxWeekendShiftsPerMonth: 4,
  lateShiftEndsAfter: 20,
  minMentorOverlapHours: 1,
  mentor: "Lou",
  trainees: ["Lina", "Samuel"],
  coreRoles: ["Stammteam", "Ausgeschieden"],
  monthlyTargetHours: 150.5,
  traineeOvertimeLimit: 5,
  shiftPatternFrom: "2026-11-01",
  weekdayShifts: [
    { start: 9, end: 15 },
    { start: 15, end: 22 },
    { start: 15, end: 20.25 },
  ],
  tuesdayShifts: [
    { start: 9, end: 16 },
    { start: 15, end: 22 },
    { start: 15, end: 20.25 },
  ],
  stashShifts: [
    { start: 9, end: 16 },
    { start: 14, end: 22 },
    { start: 14, end: 20.25 },
  ],
  fixedShifts: [{ person: "Leon", weekday: 1, start: 15, end: 22, from: "2026-11-01" }],
};

export type Severity = "fehler" | "warnung" | "hinweis";

export type RuleId =
  | "besetzung"
  | "schichtzeiten"
  | "festdienste"
  | "doppelbuchung"
  | "abwesenheit"
  | "ausgeschieden"
  | "termine"
  | "teammeeting"
  | "ruhezeit"
  | "schule"
  | "einsatztage"
  | "wochenstunden"
  | "wochenenden"
  | "feierabend"
  | "einarbeitung"
  | "kurse"
  | "reserve";

export const RULES: Record<RuleId, { title: string; description: string }> = {
  besetzung: {
    title: "Besetzung",
    description: "Mo–Fr 09–22 Uhr und Sa/So 10–15 Uhr immer mindestens eine Person auf der Fläche. Wer im Kurs ist, zählt nicht als Flächenkraft.",
  },
  schichtzeiten: {
    title: "Schichtzeiten",
    description:
      "Ab November Schichtwechsel um 15 Uhr: 9–15 und 15–22 bzw. 15–20:15, dienstags früh 9–16 (Teammeeting), an STASH-Tagen 9–16 und ab 14 Uhr, Wochenende 10–15.",
  },
  festdienste: { title: "Feste Dienste", description: "Leon arbeitet nur montags, 15–22 Uhr." },
  doppelbuchung: { title: "Doppelbuchungen", description: "Keine überlappenden Einträge einer Person am selben Tag." },
  abwesenheit: { title: "Abwesenheiten", description: "An Schul-, Ahaus- und Urlaubstagen kein Studiodienst." },
  ausgeschieden: { title: "Ausgeschiedene", description: "Nach dem Austritt keine Einplanung mehr." },
  termine: {
    title: "Sondertermine",
    description: "STASH, Kurse und Wünsche liegen in der Dienstzeit der genannten Personen.",
  },
  teammeeting: {
    title: "Teammeeting",
    description: "Einmal pro Woche ca. 15–16 Uhr zum Schichtwechsel, möglichst mit allen aus dem Stammteam.",
  },
  ruhezeit: { title: "Ruhezeit", description: "Mindestens 11 Stunden zwischen zwei Einsätzen." },
  schule: { title: "Schule", description: "Keine Spätschicht am Abend vor einem Schultag." },
  einsatztage: {
    title: "Einsatztage",
    description: "Höchstens 5 Einsatztage pro Kalenderwoche und 5 Tage am Stück (Schule, Schulung und Abwesenheiten zählen mit).",
  },
  wochenstunden: {
    title: "Wochenstunden",
    description:
      "Ziel 35 h pro Woche; 38 h als Obergrenze (Annahme aus der bisherigen Berechnung). Mit 6-h-Frühdiensten und 5-h-Wochenenden entsteht strukturell ein Minus.",
  },
  wochenenden: {
    title: "Wochenenden",
    description: "Reguläre Wochenenddienste fair verteilen, höchstens 4 pro Person und Monat.",
  },
  feierabend: {
    title: "20:15-Regel",
    description: "Sind abends zwei Personen da, endet eine um 20:15 Uhr. Frühe Feierabende gerecht verteilen. Gilt ab November 2026.",
  },
  einarbeitung: {
    title: "Einarbeitung",
    description: "Lou arbeitet möglichst mit Lina oder Samuel zusammen (wochentags; am Wochenende ist regulär nur eine Person da).",
  },
  kurse: { title: "Kurse", description: "Jeder Kurs hat eine Kursleitung." },
  reserve: {
    title: "Falk-Reserve",
    description:
      "Falk nur im Notfall: erst wenn die Azubis an ihrer Grenze sind (35 h/Woche + 5 Überstunden im Monat, max. 5 Einsatztage) und niemand aus dem Stammteam frei ist.",
  },
};

export interface Finding {
  rule: RuleId;
  severity: Severity;
  message: string;
  date?: string;
  person?: string;
}

interface Interval {
  start: number;
  end: number;
}

const SLOT = 0.25;
const ABSENCE_KINDS = new Set(["Schule", "Ahaus", "Urlaub"]);

function dayLabel(iso: string): string {
  return `${weekdayShort(iso)} ${formatDayMonth(iso)}`;
}

function overlap(a: Interval, b: Interval): number {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}

function covers(outer: Interval, inner: Interval): boolean {
  return outer.start <= inner.start && outer.end >= inner.end;
}

function subtract(base: Interval, cuts: readonly Interval[]): Interval[] {
  return cuts.reduce<Interval[]>(
    (parts, cut) =>
      parts.flatMap((p) => {
        if (overlap(p, cut) === 0) return [p];
        return [
          { start: p.start, end: Math.max(p.start, cut.start) },
          { start: Math.min(p.end, cut.end), end: p.end },
        ].filter((x) => x.end > x.start);
      }),
    [base],
  );
}

function allDates(first: string, last: string): string[] {
  const days = Math.round((Date.parse(last) - Date.parse(first)) / 86_400_000);
  return Array.from({ length: days + 1 }, (_, i) => addDays(first, i));
}

function weekdayIndex(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

function isActive(person: Person, date: string): boolean {
  const isAway = person.unavailable.some((u) => date >= u.from && date <= u.to);
  return !isAway && (!person.inactiveFrom || date < person.inactiveFrom);
}

class PlanView {
  readonly dates: string[];
  readonly first: string;
  readonly last: string;
  private readonly shiftsByDate: Map<string, Shift[]>;
  private readonly eventsByDate: Map<string, PlanEvent[]>;

  constructor(
    readonly plan: TeamPlan,
    private readonly cfg: RuleConfig,
  ) {
    const sorted = [...plan.shifts].map((s) => s.date).sort();
    this.first = sorted[0];
    this.last = sorted[sorted.length - 1];
    this.dates = allDates(this.first, this.last);
    this.shiftsByDate = group(plan.shifts);
    this.eventsByDate = group(plan.events);
  }

  shifts(date: string, person?: string): Shift[] {
    const all = this.shiftsByDate.get(date) ?? [];
    return person ? all.filter((s) => s.person === person) : all;
  }

  studio(date: string, person?: string): Shift[] {
    return this.shifts(date, person).filter((s) => s.kind === "Studio");
  }

  events(date: string): PlanEvent[] {
    return this.eventsByDate.get(date) ?? [];
  }

  core(date: string): Person[] {
    return this.plan.people.filter((p) => this.cfg.coreRoles.includes(p.role) && isActive(p, date));
  }

  reserve(): Person[] {
    return this.plan.people.filter((p) => p.role === "Notfallreserve");
  }

  inPlan(date: string): boolean {
    return date >= this.first && date <= this.last;
  }
}

function group<T extends { date: string; start: number }>(items: readonly T[]): Map<string, T[]> {
  return [...items]
    .sort((a, b) => a.start - b.start)
    .reduce((map, item) => map.set(item.date, [...(map.get(item.date) ?? []), item]), new Map<string, T[]>());
}

function checkCoverage(view: PlanView, cfg: RuleConfig): Finding[] {
  return view.dates.flatMap((date) => {
    const open = isWeekend(date) ? cfg.weekendOpen : cfg.weekdayOpen;
    const courses = view.events(date).filter((e) => e.category === "kurs");
    const floor = view.studio(date).flatMap((s) =>
      subtract(
        s,
        courses.filter((c) => c.people.includes(s.person)),
      ),
    );
    const slots = Array.from({ length: (open.end - open.start) / SLOT }, (_, i) => open.start + i * SLOT);
    const gaps = slots
      .filter((t) => !floor.some((f) => covers(f, { start: t, end: t + SLOT })))
      .reduce<Interval[]>((acc, t) => {
        const prev = acc[acc.length - 1];
        return prev && prev.end === t ? [...acc.slice(0, -1), { start: prev.start, end: t + SLOT }] : [...acc, { start: t, end: t + SLOT }];
      }, []);
    return gaps.map((g) => ({
      rule: "besetzung" as const,
      severity: "fehler" as const,
      date,
      message: `${dayLabel(date)}: ${formatTimeRange(g.start, g.end)} niemand auf der Fläche.`,
    }));
  });
}

function checkDoubleBookings(view: PlanView): Finding[] {
  return view.dates.flatMap((date) =>
    view.plan.people.flatMap((p) => {
      const entries = view.shifts(date, p.name);
      const clashes = entries.flatMap((a, i) => entries.slice(i + 1).filter((b) => overlap(a, b) > 0).map((b) => [a, b] as const));
      return clashes.map(([a, b]) => ({
        rule: "doppelbuchung" as const,
        severity: "fehler" as const,
        date,
        person: p.name,
        message: `${dayLabel(date)}: ${p.name} doppelt gebucht (${a.kind} ${formatTimeRange(a.start, a.end)} / ${b.kind} ${formatTimeRange(b.start, b.end)}).`,
      }));
    }),
  );
}

function checkAbsences(view: PlanView): Finding[] {
  return view.plan.shifts
    .filter((s) => ABSENCE_KINDS.has(s.kind))
    .flatMap((absence) =>
      view.studio(absence.date, absence.person).map((s) => ({
        rule: "abwesenheit" as const,
        severity: "fehler" as const,
        date: absence.date,
        person: absence.person,
        message: `${dayLabel(absence.date)}: ${absence.person} hat ${absence.kind}, ist aber ${formatTimeRange(s.start, s.end)} im Studio eingeplant.`,
      })),
    );
}

function checkInactive(view: PlanView): Finding[] {
  return view.plan.people
    .filter((p) => p.inactiveFrom)
    .flatMap((p) =>
      view.plan.shifts
        .filter((s) => s.person === p.name && s.date >= (p.inactiveFrom ?? ""))
        .map((s) => ({
          rule: "ausgeschieden" as const,
          severity: "fehler" as const,
          date: s.date,
          person: p.name,
          message: `${dayLabel(s.date)}: ${p.name} ist seit ${formatDayMonth(p.inactiveFrom ?? "")} ausgeschieden, aber eingeplant.`,
        })),
    );
}

function checkEventAttendance(view: PlanView, cfg: RuleConfig): Finding[] {
  return view.plan.events
    .filter((e) => e.category !== "meeting" && e.people.length > 0)
    .flatMap((e) =>
      e.people.flatMap((name) => {
        const studio = view.studio(e.date, name);
        const isPresent =
          e.category === "hinweis"
            ? studio.some((s) => s.end >= cfg.earlyEnd)
            : studio.some((s) => covers(s, e));
        if (isPresent) return [];
        return [
          {
            rule: "termine" as const,
            severity: e.category === "hinweis" ? ("warnung" as const) : ("fehler" as const),
            date: e.date,
            person: name,
            message: `${dayLabel(e.date)}: ${e.title} (${formatTimeRange(e.start, e.end)}) – ${name} ist zu der Zeit nicht im Dienst.`,
          },
        ];
      }),
    );
}

function checkMeetings(view: PlanView, cfg: RuleConfig): Finding[] {
  const meetings = view.plan.events.filter((e) => e.category === "meeting");
  const monthsWithMeetings = new Set(meetings.map((m) => m.date.slice(0, 7)));
  const weeks = [...new Set(view.dates.map(startOfWeek))];

  const weekFindings = weeks.flatMap((week): Finding[] => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
    if (!monthsWithMeetings.has(monthOfWeek(week))) return [];
    if (!days.every((d) => view.inPlan(d))) {
      return [
        {
          rule: "teammeeting",
          severity: "hinweis",
          date: week,
          message: `KW ${isoWeekNumber(week)} ist nur teilweise geplant – Teammeeting dort prüfen.`,
        },
      ];
    }
    const inWeek = meetings.filter((m) => days.includes(m.date));
    if (inWeek.length > 0) return [];
    return [{ rule: "teammeeting", severity: "warnung", date: week, message: `KW ${isoWeekNumber(week)}: kein Teammeeting geplant.` }];
  });

  const lastWeek = startOfWeek(view.last);
  const openEnd: Finding[] =
    addDays(lastWeek, 6) > view.last && !weekFindings.some((f) => f.date === lastWeek)
      ? [
          {
            rule: "teammeeting",
            severity: "hinweis",
            date: lastWeek,
            message: `KW ${isoWeekNumber(lastWeek)} (ab ${formatDayMonth(lastWeek)}) reicht in den nächsten Monat – dort ist noch kein Teammeeting geplant.`,
          },
        ]
      : [];

  const attendance = meetings.flatMap((m) =>
    view
      .core(m.date)
      .filter((p) => !view.studio(m.date, p.name).some((s) => covers(s, m)))
      .map((p) => ({
        rule: "teammeeting" as const,
        severity: "warnung" as const,
        date: m.date,
        person: p.name,
        message: `${dayLabel(m.date)}: ${p.name} ist beim Teammeeting (${formatTimeRange(m.start, m.end)}) nicht im Dienst.`,
      })),
  );
  void cfg;
  return [...weekFindings, ...openEnd, ...attendance];
}

function dayBounds(view: PlanView, date: string, person: string): Interval | null {
  const entries = view.shifts(date, person);
  if (entries.length === 0) return null;
  return { start: Math.min(...entries.map((e) => e.start)), end: Math.max(...entries.map((e) => e.end)) };
}

function checkRest(view: PlanView, cfg: RuleConfig): Finding[] {
  return view.plan.people.flatMap((p) =>
    view.dates.slice(0, -1).flatMap((date) => {
      const today = dayBounds(view, date, p.name);
      const next = dayBounds(view, addDays(date, 1), p.name);
      if (!today || !next) return [];
      const rest = 24 - today.end + next.start;
      if (rest >= cfg.minRestHours) return [];
      return [
        {
          rule: "ruhezeit" as const,
          severity: "fehler" as const,
          date,
          person: p.name,
          message: `${dayLabel(date)} → ${dayLabel(addDays(date, 1))}: ${p.name} hat nur ${formatHours(rest)} Ruhezeit.`,
        },
      ];
    }),
  );
}

function checkLateBeforeSchool(view: PlanView, cfg: RuleConfig): Finding[] {
  return view.plan.shifts
    .filter((s) => s.kind === "Schule")
    .flatMap((school) => {
      const evening = addDays(school.date, -1);
      return view
        .studio(evening, school.person)
        .filter((s) => s.end > cfg.lateShiftEndsAfter)
        .map((s) => ({
          rule: "schule" as const,
          severity: "fehler" as const,
          date: evening,
          person: school.person,
          message: `${dayLabel(evening)}: ${school.person} arbeitet bis ${formatTimeRange(s.start, s.end).split("–")[1]} Uhr, am nächsten Tag ist Schule.`,
        }));
    });
}

function checkWorkingDays(view: PlanView, cfg: RuleConfig): Finding[] {
  return view.plan.people.flatMap((p) => {
    const worked = view.dates.filter((d) => view.shifts(d, p.name).length > 0);
    const perWeek = worked.reduce((m, d) => m.set(startOfWeek(d), (m.get(startOfWeek(d)) ?? 0) + 1), new Map<string, number>());
    const weekFindings = [...perWeek]
      .filter(([, n]) => n > cfg.maxDaysPerWeek)
      .map(([week, n]) => ({
        rule: "einsatztage" as const,
        severity: "fehler" as const,
        date: week,
        person: p.name,
        message: `KW ${isoWeekNumber(week)}: ${p.name} hat ${n} Einsatztage (max. ${cfg.maxDaysPerWeek}).`,
      }));
    const runs = worked.reduce<string[][]>((acc, d) => {
      const run = acc[acc.length - 1];
      return run && addDays(run[run.length - 1], 1) === d ? [...acc.slice(0, -1), [...run, d]] : [...acc, [d]];
    }, []);
    const runFindings = runs
      .filter((r) => r.length > cfg.maxConsecutiveDays)
      .map((r) => ({
        rule: "einsatztage" as const,
        severity: "fehler" as const,
        date: r[0],
        person: p.name,
        message: `${p.name}: ${r.length} Tage am Stück (${formatDayMonth(r[0])}–${formatDayMonth(r[r.length - 1])}, max. ${cfg.maxConsecutiveDays}).`,
      }));
    return [...weekFindings, ...runFindings];
  });
}

function checkWeeklyHours(view: PlanView, cfg: RuleConfig): Finding[] {
  const fullWeeks = [...new Set(view.dates.map(startOfWeek))].filter(
    (w) => view.inPlan(w) && view.inPlan(addDays(w, 6)),
  );
  return view.plan.people
    .filter((p) => cfg.coreRoles.includes(p.role))
    .flatMap((p) => {
      const weeks = fullWeeks
        .filter((w) => isActive(p, w))
        .map((w) => ({
          week: w,
          hours: Array.from({ length: 7 }, (_, i) => addDays(w, i))
            .flatMap((d) => view.shifts(d, p.name))
            .reduce((sum, s) => sum + s.hours, 0),
        }));
      const over = weeks
        .filter((w) => w.hours > cfg.weeklyMaxHours)
        .map((w) => ({
          rule: "wochenstunden" as const,
          severity: "warnung" as const,
          date: w.week,
          person: p.name,
          message: `KW ${isoWeekNumber(w.week)}: ${p.name} ${formatHours(w.hours)} (über ${cfg.weeklyMaxHours} h).`,
        }));
      const underByMonth = weeks
        .filter((w) => w.hours < cfg.weeklyTargetHours)
        .reduce((m, w) => m.set(monthOfWeek(w.week), [...(m.get(monthOfWeek(w.week)) ?? []), w]), new Map<string, typeof weeks>());
      const under = [...underByMonth.values()].map((list) => ({
        rule: "wochenstunden" as const,
        severity: "hinweis" as const,
        date: list[0].week,
        person: p.name,
        message: `${p.name} unter ${cfg.weeklyTargetHours} h: ${list.map((w) => `KW ${isoWeekNumber(w.week)} ${formatHours(w.hours)}`).join(", ")}.`,
      }));
      return [...over, ...under];
    });
}

function monthsOf(view: PlanView): string[] {
  return [...new Set(view.dates.map((d) => d.slice(0, 7)))];
}

function countByCore(view: PlanView, month: string, pick: (s: Shift) => boolean) {
  const days = view.dates.filter((d) => d.startsWith(month));
  return view
    .core(`${month}-01`)
    .map((p) => ({ name: p.name, count: days.flatMap((d) => view.studio(d, p.name)).filter(pick).length }));
}

function fairness(counts: { name: string; count: number }[]): string {
  return counts.map((c) => `${c.name} ${c.count}`).join(", ");
}

function checkWeekends(view: PlanView, cfg: RuleConfig): Finding[] {
  return monthsOf(view).flatMap((month) => {
    const counts = countByCore(view, month, (s) => isWeekend(s.date));
    const over = counts
      .filter((c) => c.count > cfg.maxWeekendShiftsPerMonth)
      .map((c) => ({
        rule: "wochenenden" as const,
        severity: "warnung" as const,
        person: c.name,
        message: `${month}: ${c.name} hat ${c.count} Wochenenddienste (max. ${cfg.maxWeekendShiftsPerMonth}).`,
      }));
    const values = counts.map((c) => c.count);
    const spread: Finding[] =
      Math.max(...values) - Math.min(...values) > 1
        ? [{ rule: "wochenenden", severity: "hinweis", message: `${month}: ungleich verteilt (${fairness(counts)}).` }]
        : [];
    return [...over, ...spread];
  });
}

function checkEarlyEnds(view: PlanView, cfg: RuleConfig): Finding[] {
  const pairs = view.dates
    .filter((d) => !isWeekend(d) && d >= cfg.earlyEndRuleFrom)
    .flatMap((date): Finding[] => {
      const evening = view.studio(date).filter((s) => s.start <= 20 && s.end >= cfg.earlyEnd);
      if (evening.length < 2 || evening.some((s) => s.end === cfg.earlyEnd)) return [];
      return [
        {
          rule: "feierabend",
          severity: "hinweis",
          date,
          message: `${dayLabel(date)}: ${evening.map((s) => s.person).join(", ")} bleiben alle bis zum Schluss – eine Person sollte um 20:15 gehen.`,
        },
      ];
    });
  const spread = monthsOf(view)
    .filter((month) => `${month}-31` >= cfg.earlyEndRuleFrom)
    .flatMap((month): Finding[] => {
    const counts = countByCore(view, month, (s) => s.end === cfg.earlyEnd);
    const values = counts.map((c) => c.count);
    if (values.every((v) => v === 0) || Math.max(...values) - Math.min(...values) <= 1) return [];
    return [{ rule: "feierabend", severity: "hinweis", message: `${month}: 20:15-Feierabende ungleich verteilt (${fairness(counts)}).` }];
  });
  return [...pairs, ...spread];
}

function checkMentoring(view: PlanView, cfg: RuleConfig): Finding[] {
  return view.dates.filter((d) => !isWeekend(d)).flatMap((date) => {
    const mentorShifts = view.studio(date, cfg.mentor);
    if (mentorShifts.length === 0) return [];
    const together = cfg.trainees
      .flatMap((t) => view.studio(date, t))
      .reduce((sum, t) => sum + mentorShifts.reduce((s, m) => s + overlap(m, t), 0), 0);
    if (together >= cfg.minMentorOverlapHours) return [];
    return [
      {
        rule: "einarbeitung" as const,
        severity: "hinweis" as const,
        date,
        person: cfg.mentor,
        message: `${dayLabel(date)}: ${cfg.mentor} arbeitet ohne ${cfg.trainees.join("/")}.`,
      },
    ];
  });
}

function checkCourses(view: PlanView): Finding[] {
  return view.plan.events
    .filter((e) => e.warning)
    .map((e) => ({
      rule: "kurse" as const,
      severity: "warnung" as const,
      date: e.date,
      message: `${dayLabel(e.date)}: ${e.title} ${formatTimeRange(e.start, e.end)} – ${e.warning}.`,
    }));
}

/** Leitet aus dem Plan ab, warum die Reserve an einem Tag gebraucht wurde. */
export function reserveReason(view: PlanView, shift: Shift): string | null {
  const reasons = [
    ...view
      .events(shift.date)
      .filter((e) => e.category === "kurs" && e.people.length > 0 && overlap(e, shift) > 0)
      .map((e) => `Kursabdeckung (${e.people.join(", ")} im Kurs)`),
    ...view
      .shifts(shift.date)
      .filter((s) => s.person !== shift.person && s.kind !== "Studio" && overlap(s, shift) > 0)
      .reduce<string[]>((acc, s) => {
        const label = s.kind === "Five-Schulung" ? "Five-Schulung" : `${s.person}: ${s.kind}`;
        return acc.includes(label) ? acc : [...acc, label];
      }, []),
  ];
  return reasons.length > 0 ? reasons.join(" · ") : null;
}

/** Warum jemand den Dienst nicht hätte übernehmen können — null = frei. */
function blockerFor(view: PlanView, cfg: RuleConfig, person: string, shift: Shift): string | null {
  const date = shift.date;
  const today = view.shifts(date, person);
  if (today.length > 0) {
    return today.map((s) => (s.kind === "Studio" ? `arbeitet ${formatTimeRange(s.start, s.end)}` : s.kind)).join(", ");
  }
  const week = startOfWeek(date);
  const daysInWeek = Array.from({ length: 7 }, (_, i) => addDays(week, i)).filter(
    (d) => view.shifts(d, person).length > 0,
  ).length;
  if (daysInWeek >= cfg.maxDaysPerWeek) return `schon ${daysInWeek} Tage in KW ${isoWeekNumber(date)}`;
  const runLength = (dir: 1 | -1): number => {
    const next = addDays(date, dir);
    return view.shifts(next, person).length > 0 ? 1 + runLengthFrom(next, dir) : 0;
  };
  const runLengthFrom = (from: string, dir: 1 | -1): number => {
    const next = addDays(from, dir);
    return view.shifts(next, person).length > 0 ? 1 + runLengthFrom(next, dir) : 0;
  };
  const consecutive = runLength(-1) + 1 + runLength(1);
  if (consecutive > cfg.maxConsecutiveDays) return `wären ${consecutive} Tage am Stück`;
  const before = dayBounds(view, addDays(date, -1), person);
  const after = dayBounds(view, addDays(date, 1), person);
  if ((before && 24 - before.end + shift.start < cfg.minRestHours) || (after && 24 - shift.end + after.start < cfg.minRestHours)) {
    return "Ruhezeit zu kurz";
  }
  if (shift.end > cfg.lateShiftEndsAfter && view.shifts(addDays(date, 1), person).some((s) => s.kind === "Schule")) {
    return "am nächsten Tag Schule";
  }
  if (cfg.trainees.includes(person)) {
    const month = date.slice(0, 7);
    const hours = view.plan.shifts.filter((s) => s.person === person && s.date.startsWith(month)).reduce((sum, s) => sum + s.hours, 0);
    if (hours + shift.hours - cfg.monthlyTargetHours > cfg.traineeOvertimeLimit) {
      return `käme über ${cfg.traineeOvertimeLimit} Überstunden`;
    }
  }
  return null;
}

function checkReserve(view: PlanView, cfg: RuleConfig): Finding[] {
  return view
    .reserve()
    .flatMap((p) => view.plan.shifts.filter((s) => s.person === p.name))
    .map((s) => {
      const blockers = view.core(s.date).map((p) => ({ name: p.name, blocker: blockerFor(view, cfg, p.name, s) }));
      const free = blockers.filter((b) => b.blocker === null).map((b) => b.name);
      const head = `${dayLabel(s.date)} ${formatTimeRange(s.start, s.end)} (${formatHours(s.hours)})`;
      if (free.length > 0) {
        return {
          rule: "reserve" as const,
          severity: "warnung" as const,
          date: s.date,
          person: s.person,
          message: `${head}: ${free.join(", ")} ${free.length === 1 ? "wäre" : "wären"} frei gewesen.`,
        };
      }
      // Abwesenheiten stehen schon in der Auslastung; nur Kurs-/Schulungsgründe zusätzlich nennen.
      const reason = reserveReason(view, s)
        ?.split(" · ")
        .filter((r) => r.startsWith("Kurs") || r === "Five-Schulung")
        .join(" · ");
      const busy = blockers.map((b) => `${b.name}: ${b.blocker}`).join(" · ");
      return {
        rule: "reserve" as const,
        severity: "hinweis" as const,
        date: s.date,
        person: s.person,
        message: `${head}: ${reason ? `${reason}. ` : ""}Stammteam ausgelastet (${busy}).`,
      };
    });
}

function checkShiftPatterns(view: PlanView, cfg: RuleConfig): Finding[] {
  return view.plan.shifts
    .filter((s) => s.kind === "Studio" && s.date >= cfg.shiftPatternFrom)
    .filter((s) => {
      const stash = view.events(s.date).some((e) => e.category === "stash" && e.people.includes(s.person));
      const allowed = isWeekend(s.date)
        ? [cfg.weekendOpen]
        : [
            ...(weekdayIndex(s.date) === 2 ? cfg.tuesdayShifts : cfg.weekdayShifts),
            ...(stash ? cfg.stashShifts : []),
            ...cfg.fixedShifts.filter((f) => f.person === s.person && f.weekday === weekdayIndex(s.date)),
          ];
      return !allowed.some((a) => a.start === s.start && a.end === s.end);
    })
    .map((s) => ({
      rule: "schichtzeiten" as const,
      severity: "warnung" as const,
      date: s.date,
      person: s.person,
      message: `${dayLabel(s.date)}: ${s.person} ${formatTimeRange(s.start, s.end)} passt nicht zu den festen Schichtzeiten.`,
    }));
}

function checkFixedShifts(view: PlanView, cfg: RuleConfig): Finding[] {
  return cfg.fixedShifts.flatMap((f) => {
    const relevant = view.dates.filter((d) => d >= f.from);
    const missing = relevant
      .filter((d) => weekdayIndex(d) === f.weekday)
      .filter((d) => !view.studio(d, f.person).some((s) => s.start === f.start && s.end === f.end))
      .map((d) => ({
        rule: "festdienste" as const,
        severity: "fehler" as const,
        date: d,
        person: f.person,
        message: `${dayLabel(d)}: ${f.person} fehlt (${formatTimeRange(f.start, f.end)}).`,
      }));
    const extra = relevant
      .filter((d) => weekdayIndex(d) !== f.weekday && view.shifts(d, f.person).length > 0)
      .map((d) => ({
        rule: "festdienste" as const,
        severity: "warnung" as const,
        date: d,
        person: f.person,
        message: `${dayLabel(d)}: ${f.person} ist eingeplant, arbeitet aber nur ${weekdayShort(addDays(f.from, (f.weekday - weekdayIndex(f.from) + 7) % 7))}.`,
      }));
    return [...missing, ...extra];
  });
}

export function createPlanView(plan: TeamPlan, cfg: RuleConfig = DEFAULT_RULES): PlanView {
  return new PlanView(plan, cfg);
}

export type { PlanView };

const SEVERITY_ORDER: Record<Severity, number> = { fehler: 0, warnung: 1, hinweis: 2 };

export function checkPlan(plan: TeamPlan, cfg: RuleConfig = DEFAULT_RULES): Finding[] {
  const view = new PlanView(plan, cfg);
  return [
    ...checkCoverage(view, cfg),
    ...checkShiftPatterns(view, cfg),
    ...checkFixedShifts(view, cfg),
    ...checkDoubleBookings(view),
    ...checkAbsences(view),
    ...checkInactive(view),
    ...checkEventAttendance(view, cfg),
    ...checkMeetings(view, cfg),
    ...checkRest(view, cfg),
    ...checkLateBeforeSchool(view, cfg),
    ...checkWorkingDays(view, cfg),
    ...checkWeeklyHours(view, cfg),
    ...checkWeekends(view, cfg),
    ...checkEarlyEnds(view, cfg),
    ...checkMentoring(view, cfg),
    ...checkCourses(view),
    ...checkReserve(view, cfg),
  ].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || (a.date ?? "").localeCompare(b.date ?? ""));
}

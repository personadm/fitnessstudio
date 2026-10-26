"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  formatDate,
  formatDayMonth,
  formatHours,
  formatMonth,
  formatTimeRange,
  isoWeekNumber,
  monthOfWeek,
  startOfWeek,
  weekDays,
  weekdayLong,
  weekdayShort,
} from "@/lib/schichtplan/calendar";
import { EVENT_STYLES, WARNING_COLOR, personColor } from "@/lib/schichtplan/display";
import type { Shift, TeamPlan } from "@/lib/schichtplan/plan";
import { buildPlanIndex, clampToPlan, isInPlan, totalsFor } from "@/lib/schichtplan/planIndex";
import { ListView } from "./ListView";
import { ShiftDetail } from "./ShiftDetail";
import { Toolbar } from "./Toolbar";
import { WeekGrid } from "./WeekGrid";

export type ViewMode = "woche" | "liste" | "tag";

type Props = {
  plan: TeamPlan;
  today: string;
  initialView: ViewMode;
  initialDate: string | null;
};

export function ScheduleView({ plan, today, initialView, initialDate }: Props) {
  const index = useMemo(() => buildPlanIndex(plan), [plan]);
  const [view, setView] = useState<ViewMode>(initialView);
  const [focusDate, setFocusDate] = useState(() => clampToPlan(index, initialDate ?? today));
  const [hidden, setHidden] = useState<readonly string[]>([]);
  const [selected, setSelected] = useState<Shift | null>(null);

  // Ansicht + Datum in der URL halten, damit Neuladen und Teilen dieselbe Woche zeigen.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("ansicht", view);
    url.searchParams.set("datum", focusDate);
    window.history.replaceState(null, "", url);
  }, [view, focusDate]);

  const closeDetail = useCallback(() => setSelected(null), []);

  const weekStart = startOfWeek(focusDate);
  const days = view === "tag" ? [focusDate] : weekDays(weekStart);
  const months = [...new Set(plan.shifts.map((s) => s.date.slice(0, 7)))].sort();
  // Randwochen gehören nach ISO-Regel zum Monat ihres Donnerstags — außer dieser
  // Monat liegt außerhalb des Planstands (z. B. Woche ab 30.11. → Dezember).
  const weekMonth = monthOfWeek(weekStart);
  const activeMonth = view !== "tag" && months.includes(weekMonth) ? weekMonth : focusDate.slice(0, 7);
  const monthDays = [...index.shiftsByDate.keys()].filter((d) => d.startsWith(activeMonth));

  const scheduled = plan.people.filter((p) =>
    days.some((d) => (index.shiftsByDate.get(d) ?? []).some((s) => s.person === p.name)),
  );
  const lanes = scheduled.filter((p) => !hidden.includes(p.name));
  const warnings = days.flatMap((d) => (index.eventsByDate.get(d) ?? []).filter((e) => e.warning));
  const hasMonthEvents = [...index.eventsByDate.keys()].some((d) => d.startsWith(activeMonth));

  const step = view === "tag" ? 1 : 7;
  const firstWeek = index.weekStarts[0];
  const lastWeek = index.weekStarts[index.weekStarts.length - 1];
  const canPrev = view === "tag" ? focusDate > index.firstDate : weekStart > firstWeek;
  const canNext = view === "tag" ? focusDate < index.lastDate : weekStart < lastWeek;
  const move = (direction: 1 | -1) => setFocusDate((d) => clampToPlan(index, addDays(d, direction * step)));

  const heading =
    view === "tag"
      ? `${weekdayLong(focusDate)}, ${formatDate(focusDate)}`
      : `${formatDayMonth(weekStart)}–${formatDate(addDays(weekStart, 6))}`;

  const selectedEvents = selected
    ? (index.eventsByDate.get(selected.date) ?? []).filter(
        (e) => e.people.includes(selected.person) || (e.people.length === 0 && e.start < selected.end && e.end > selected.start),
      )
    : [];

  return (
    <main className="min-h-dvh bg-cream text-ink">
      <div className="mx-auto max-w-[1880px] px-4 pb-10 pt-6 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b-2 border-ink pb-4">
          <div>
            <p className="label">Team · nur lesen</p>
            <h1 className="text-display text-[2.6rem] leading-none sm:text-6xl">Schichtplan</h1>
          </div>
          <div className="sm:text-right">
            <p className="label">
              {view === "tag" ? `KW ${isoWeekNumber(focusDate)}` : `Kalenderwoche ${isoWeekNumber(weekStart)}`}
            </p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums sm:text-xl">{heading}</p>
          </div>
        </header>

        <div className="mt-4">
          <Toolbar
            months={months}
            activeMonth={activeMonth}
            onMonth={(m) => setFocusDate(clampToPlan(index, `${m}-01`))}
            view={view}
            onView={setView}
            weekStarts={index.weekStarts}
            currentWeek={weekStart}
            onWeek={(ws) => setFocusDate(clampToPlan(index, ws))}
            canPrev={canPrev}
            canNext={canNext}
            onPrev={() => move(-1)}
            onNext={() => move(1)}
            onToday={() => setFocusDate(clampToPlan(index, today))}
            isTodayInPlan={isInPlan(index, today)}
            people={scheduled}
            allPeople={plan.people}
            hidden={hidden}
            onToggle={(name) =>
              setHidden((h) => (h.includes(name) ? h.filter((n) => n !== name) : [...h, name]))
            }
          />
        </div>

        {warnings.length > 0 && (
          <ul
            className="mt-4 space-y-1 rounded-xl border px-4 py-2.5 text-sm"
            style={{ borderColor: WARNING_COLOR, background: "rgba(196,43,28,0.06)" }}
          >
            {warnings.map((w) => (
              <li key={w.id} className="flex flex-wrap gap-x-2">
                <span className="font-semibold" style={{ color: WARNING_COLOR }}>
                  ! {w.warning}
                </span>
                <span>
                  {weekdayShort(w.date)} {formatDayMonth(w.date)} · {formatTimeRange(w.start, w.end)} · {w.title}
                </span>
              </li>
            ))}
          </ul>
        )}

        <Totals
          people={lanes}
          allPeople={plan.people}
          weekDaysList={view === "tag" ? weekDays(weekStart) : days}
          monthDays={monthDays}
          activeMonth={activeMonth}
          index={index}
        />

        <div className="mt-4">
          {view === "liste" ? (
            <ListView days={days} people={plan.people} hidden={hidden} index={index} today={today} onSelect={setSelected} />
          ) : lanes.length === 0 && days.every((d) => isInPlan(index, d)) ? (
            <p className="rounded-2xl border border-dashed border-ink/25 px-5 py-10 text-center text-sm text-muted">
              Niemand eingeplant oder alle Personen ausgeblendet.
            </p>
          ) : (
            <WeekGrid
              days={days}
              lanes={lanes}
              index={index}
              today={today}
              isWide={view === "tag"}
              onSelect={setSelected}
            />
          )}
        </div>

        <Legend />

        <footer className="mt-6 border-t border-ink/15 pt-4 text-xs leading-relaxed text-ink-soft">
          <p>
            {plan.source.label}, Stand {formatDate(plan.source.exportDate)}. {plan.source.note}
          </p>
          {!hasMonthEvents && (
            <p className="mt-1">Für {formatMonth(activeMonth)} sind keine Kurse oder Termine hinterlegt.</p>
          )}
          <p className="mt-1">Änderungen und Tauschwünsche bitte direkt an die Studioleitung.</p>
        </footer>
      </div>

      {selected && (
        <ShiftDetail
          shift={selected}
          person={plan.people.find((p) => p.name === selected.person)}
          color={personColor(selected.person, plan.people.findIndex((p) => p.name === selected.person))}
          events={selectedEvents}
          onClose={closeDetail}
        />
      )}
    </main>
  );
}

type TotalsProps = {
  people: TeamPlan["people"];
  allPeople: TeamPlan["people"];
  weekDaysList: readonly string[];
  monthDays: readonly string[];
  activeMonth: string;
  index: ReturnType<typeof buildPlanIndex>;
};

/** Geplante (angerechnete) Stunden pro Person — Woche und Monat. Keine Konten, keine Löhne. */
function Totals({ people, allPeople, weekDaysList, monthDays, activeMonth, index }: TotalsProps) {
  if (people.length === 0) return null;
  const monthShort = formatMonth(activeMonth).slice(0, 3);
  return (
    <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {people.map((person) => {
        const week = totalsFor(index, person.name, weekDaysList);
        const month = totalsFor(index, person.name, monthDays);
        const color = personColor(person.name, allPeople.findIndex((p) => p.name === person.name));
        return (
          <div
            key={person.name}
            className="relative overflow-hidden rounded-xl border border-ink/15 bg-[#FBF8F2] py-2.5 pl-4 pr-3"
          >
            <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} />
            <dt className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">{person.name}</span>
              <span className="hidden truncate text-[10px] uppercase tracking-[0.12em] text-muted sm:inline">{person.role}</span>
            </dt>
            <dd className="mt-1 font-mono text-xs tabular-nums text-ink-soft">
              <span className="text-base font-semibold text-ink">{formatHours(week.hours)}</span> Woche
              <span className="hidden sm:inline">
                {" "}· {week.days} {week.days === 1 ? "Tag" : "Tage"}
              </span>
            </dd>
            <dd className="font-mono text-[11px] tabular-nums text-muted">
              <span className="sm:hidden">
                {week.days} {week.days === 1 ? "Tag" : "Tage"} ·{" "}
              </span>
              {monthShort}: {formatHours(month.hours)}
              <span className="hidden sm:inline"> geplant</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function Legend() {
  const marks = [
    { key: "kurs", label: EVENT_STYLES.kurs.label, style: { background: "#1A1815" } },
    { key: "meeting", label: EVENT_STYLES.meeting.label, style: { background: "#C8FF00", boxShadow: "inset 0 0 0 1px #1A1815" } },
    { key: "stash", label: EVENT_STYLES.stash.label, style: { background: "repeating-linear-gradient(to bottom, #1A1815 0 3px, transparent 3px 6px)" } },
    { key: "hinweis", label: "Wunsch", style: { boxShadow: "inset 0 0 0 1.5px #8A857E" } },
  ];
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-soft">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-3.5 w-5 rounded bg-ink-soft" /> Dienst im Studio
      </span>
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-3.5 w-5 rounded border border-dashed border-ink-soft"
          style={{ background: "repeating-linear-gradient(135deg, rgba(58,53,48,0.25) 0 3px, transparent 3px 6px)" }}
        />
        Urlaub, Schule, Schulung, Ahaus (angerechnet)
      </span>
      {marks.map((m) => (
        <span key={m.key} className="flex items-center gap-1.5">
          <span aria-hidden className="h-3.5 w-[5px] rounded-full" style={m.style} /> {m.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-0.5 w-5" style={{ background: WARNING_COLOR }} /> Jetzt
      </span>
    </div>
  );
}

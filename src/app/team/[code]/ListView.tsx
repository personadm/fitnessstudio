"use client";

import { formatDate, formatHours, formatTimeRange, weekdayLong } from "@/lib/schichtplan/calendar";
import { EVENT_STYLES, KIND_STYLES, WARNING_COLOR, personColor } from "@/lib/schichtplan/display";
import type { Person, PlanEvent, Shift } from "@/lib/schichtplan/plan";
import { type PlanIndex, isInPlan } from "@/lib/schichtplan/planIndex";

type Props = {
  days: readonly string[];
  people: readonly Person[];
  hidden: readonly string[];
  index: PlanIndex;
  today: string;
  onSelect: (shift: Shift) => void;
};

export function ListView({ days, people, hidden, index, today, onSelect }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink/15 bg-[#FBF8F2]">
      {days.map((day, i) => (
        <DaySection
          key={day}
          day={day}
          hasDivider={i > 0}
          people={people}
          hidden={hidden}
          index={index}
          isToday={day === today}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

type DaySectionProps = {
  day: string;
  hasDivider: boolean;
  people: readonly Person[];
  hidden: readonly string[];
  index: PlanIndex;
  isToday: boolean;
  onSelect: (shift: Shift) => void;
};

function DaySection({ day, hasDivider, people, hidden, index, isToday, onSelect }: DaySectionProps) {
  const isVisible = (name: string) => !hidden.includes(name);
  const shifts = (index.shiftsByDate.get(day) ?? []).filter((s) => isVisible(s.person));
  const events = (index.eventsByDate.get(day) ?? []).filter(
    (e) => e.people.length === 0 || e.people.some(isVisible),
  );
  const colorOf = (name: string) => personColor(name, people.findIndex((p) => p.name === name));
  const emptyText = isInPlan(index, day) ? "Keine Schichten eingetragen." : "Kein Planstand für diesen Tag.";

  return (
    <section
      aria-labelledby={`tag-${day}`}
      className={`grid gap-3 px-4 py-4 sm:grid-cols-[11rem_1fr] sm:px-5 ${hasDivider ? "border-t border-ink/10" : ""} ${isToday ? "bg-acid/25" : ""}`}
    >
      <h3 id={`tag-${day}`} className="flex items-baseline gap-2 sm:block">
        <span className="block text-sm font-semibold">{weekdayLong(day)}</span>
        <span className="font-mono text-xs tabular-nums text-ink-soft">{formatDate(day)}</span>
        {isToday && <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.14em] sm:ml-0 sm:block">heute</span>}
      </h3>

      <div className="min-w-0 space-y-2">
        {shifts.length === 0 ? (
          <p className="text-sm text-muted">{emptyText}</p>
        ) : (
          <ul className="space-y-1">
            {shifts.map((shift) => (
              <li key={shift.id}>
                <ShiftRow shift={shift} color={colorOf(shift.person)} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        )}
        {events.length > 0 && (
          <ul className="space-y-1 border-t border-dashed border-ink/15 pt-2">
            {events.map((event) => (
              <li key={event.id}>
                <EventRow event={event} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ShiftRow({ shift, color, onSelect }: { shift: Shift; color: string; onSelect: (shift: Shift) => void }) {
  const kind = KIND_STYLES[shift.kind];
  return (
    <button
      type="button"
      onClick={() => onSelect(shift)}
      className="grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-ink/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink sm:grid-cols-[8rem_8.5rem_1fr_auto]"
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
        {shift.person}
      </span>
      <span className="order-3 font-mono text-sm tabular-nums sm:order-none">
        {formatTimeRange(shift.start, shift.end)}
      </span>
      <span className="order-4 sm:order-none">
        {kind.isFloor ? (
          <span className="text-xs text-ink-soft">{kind.label}</span>
        ) : (
          <span
            className="inline-block rounded border border-dashed px-1.5 py-px text-[11px] font-semibold"
            style={{ color, borderColor: color }}
          >
            {kind.label}
          </span>
        )}
      </span>
      <span className="text-right font-mono text-xs tabular-nums text-ink-soft">{formatHours(shift.hours)}</span>
    </button>
  );
}

function EventRow({ event }: { event: PlanEvent }) {
  const style = EVENT_STYLES[event.category];
  const who = event.people.length > 0 ? event.people.join(", ") : null;
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-2 text-sm">
      <span className="font-mono text-xs tabular-nums text-ink-soft">{formatTimeRange(event.start, event.end)}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{style.label}</span>
      <span className="font-medium">{event.title}</span>
      {who && <span className="text-xs text-ink-soft">{who}</span>}
      {event.warning && (
        <span className="text-xs font-semibold" style={{ color: WARNING_COLOR }}>
          ! {event.warning}
        </span>
      )}
    </div>
  );
}

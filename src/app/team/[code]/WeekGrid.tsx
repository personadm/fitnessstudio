"use client";

import { type CSSProperties, useEffect, useState } from "react";
import {
  formatDayMonth,
  formatHours,
  formatTime,
  formatTimeCompact,
  formatTimeRange,
  isWeekend,
  nowHourInBerlin,
  weekdayLong,
  weekdayShort,
} from "@/lib/schichtplan/calendar";
import { EVENT_STYLES, KIND_STYLES, WARNING_COLOR, personColor, tint } from "@/lib/schichtplan/display";
import type { Person, PlanEvent, Shift } from "@/lib/schichtplan/plan";
import {
  type PlanIndex,
  eventsForPerson,
  externalEvents,
  isInPlan,
} from "@/lib/schichtplan/planIndex";

const HOUR_PX = 44;
const AXIS_PX = 52;
const HEADER_PX = 60;
const LANE_MIN_PX = 40;
const EXTERNAL_LANE_MIN_PX = 30;
const LANE_MIN_PX_WIDE = 132;
const WEEKEND_OPEN = { start: 10, end: 15 };
const NOW_REFRESH_MS = 60_000;

const SURFACE = "#FBF8F2";
const HATCH = "repeating-linear-gradient(135deg, rgba(26,24,21,0.06) 0 4px, transparent 4px 9px)";
const HOUR_LINES = [
  `repeating-linear-gradient(to bottom, rgba(26,24,21,0.10) 0 1px, transparent 1px ${HOUR_PX}px)`,
  `repeating-linear-gradient(to bottom, transparent 0 ${HOUR_PX / 2}px, rgba(26,24,21,0.04) ${HOUR_PX / 2}px ${HOUR_PX / 2 + 1}px, transparent ${HOUR_PX / 2 + 1}px ${HOUR_PX}px)`,
].join(", ");

type Props = {
  days: readonly string[];
  lanes: readonly Person[];
  index: PlanIndex;
  today: string;
  isWide: boolean;
  onSelect: (shift: Shift) => void;
};

/**
 * Echtes Zeitraster: Tage als Gruppen, darin die Mitarbeiter nebeneinander,
 * Uhrzeit auf der vertikalen Achse. Zeitachse und Kopfzeilen bleiben beim
 * Scrollen fixiert.
 */
export function WeekGrid({ days, lanes, index, today, isWide, onSelect }: Props) {
  const nowHour = useNowHour();
  const hasExternalLane = days.some((day) => externalEvents(index, day).length > 0);
  const laneMin = isWide ? LANE_MIN_PX_WIDE : LANE_MIN_PX;
  const dayMinWidth = Math.max(lanes.length * laneMin + (hasExternalLane ? EXTERNAL_LANE_MIN_PX : 0), laneMin);
  const geometry = { startHour: index.startHour, endHour: index.endHour };
  const label = isWide ? `Tagesraster ${weekdayLong(days[0])}` : "Wochenraster";

  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="relative max-h-[calc(100dvh-8rem)] overflow-auto rounded-2xl border border-ink/15 shadow-[0_1px_0_rgba(26,24,21,0.05),0_18px_40px_-24px_rgba(26,24,21,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink print:max-h-none print:overflow-visible print:shadow-none"
      style={{ background: SURFACE }}
    >
      <div className="flex print:!min-w-0" style={{ minWidth: AXIS_PX + days.length * dayMinWidth }}>
        <TimeAxis {...geometry} />
        {days.map((day, i) => (
          <DayColumn
            key={day}
            day={day}
            isFirst={i === 0}
            lanes={lanes}
            hasExternalLane={hasExternalLane}
            index={index}
            isToday={day === today}
            nowHour={nowHour}
            minWidth={dayMinWidth}
            isWide={isWide}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function useNowHour(): number | null {
  // Erst nach dem Mount setzen — sonst weicht Server- von Client-HTML ab.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(nowHourInBerlin());
    update();
    const id = window.setInterval(update, NOW_REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function TimeAxis({ startHour, endHour }: { startHour: number; endHour: number }) {
  const marks = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  return (
    <div
      className="sticky left-0 z-20 shrink-0 border-r border-ink/15"
      style={{ width: AXIS_PX, background: SURFACE }}
    >
      <div
        className="sticky top-0 z-30 border-b border-ink/15"
        style={{ height: HEADER_PX, background: SURFACE }}
      />
      <div className="relative" style={{ height: (endHour - startHour) * HOUR_PX }}>
        {marks.map((hour, i) => {
          const shift = i === 0 ? "translate-y-0.5" : i === marks.length - 1 ? "-translate-y-full" : "-translate-y-1/2";
          return (
            <span
              key={hour}
              className={`absolute right-2 font-mono text-[10px] tabular-nums text-muted ${shift}`}
              style={{ top: (hour - startHour) * HOUR_PX }}
            >
              {formatTime(hour)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

type DayColumnProps = {
  day: string;
  isFirst: boolean;
  lanes: readonly Person[];
  hasExternalLane: boolean;
  index: PlanIndex;
  isToday: boolean;
  nowHour: number | null;
  minWidth: number;
  isWide: boolean;
  onSelect: (shift: Shift) => void;
};

function DayColumn({
  day,
  isFirst,
  lanes,
  hasExternalLane,
  index,
  isToday,
  nowHour,
  minWidth,
  isWide,
  onSelect,
}: DayColumnProps) {
  const { startHour, endHour } = index;
  const isOutsidePlan = !isInPlan(index, day);
  const weekend = isWeekend(day);
  const headerTone = isToday ? "bg-acid" : weekend ? "bg-[#EFE8DC]" : "";
  const showNow = isToday && nowHour !== null && nowHour >= startHour && nowHour <= endHour;

  return (
    <div
      className={`flex flex-1 flex-col print:!min-w-0 ${isFirst ? "" : "border-l-2 border-ink/20"}`}
      style={{ minWidth }}
    >
      <div
        className={`sticky top-0 z-10 border-b border-ink/15 ${headerTone}`}
        style={{ height: HEADER_PX, ...(headerTone ? {} : { background: SURFACE }) }}
      >
        <div className="flex items-baseline gap-1.5 px-2 pt-2">
          <span className="text-sm font-semibold">{isWide ? weekdayLong(day) : weekdayShort(day)}</span>
          <span className="font-mono text-xs tabular-nums text-ink-soft">{formatDayMonth(day)}</span>
          {isToday && <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.14em]">heute</span>}
        </div>
        <div className="mt-1.5 flex px-[3px]">
          {lanes.map((person, i) => (
            <span
              key={person.name}
              title={`${person.name} · ${person.role}`}
              className="min-w-0 flex-1 truncate px-0.5 text-center text-[10px] font-semibold"
              style={{ color: personColor(person.name, i) }}
            >
              {person.name}
            </span>
          ))}
          {hasExternalLane && (
            <span className="min-w-0 flex-[0.75] truncate px-0.5 text-center text-[10px] font-semibold text-muted">
              Kurse
            </span>
          )}
        </div>
      </div>

      <div
        className={`relative flex ${weekend ? "bg-[#F4EEE3]" : ""}`}
        style={{ height: (endHour - startHour) * HOUR_PX, backgroundImage: HOUR_LINES }}
      >
        {weekend && <ClosedBlocks startHour={startHour} endHour={endHour} />}
        {lanes.map((person, i) => (
          <Lane
            key={person.name}
            day={day}
            person={person}
            color={personColor(person.name, i)}
            hasDivider={i > 0}
            index={index}
            isWide={isWide}
            onSelect={onSelect}
          />
        ))}
        {hasExternalLane && (
          <ExternalLane
            events={externalEvents(index, day)}
            startHour={startHour}
            hasDivider={lanes.length > 0}
            isWide={isWide}
          />
        )}
        {isOutsidePlan && (
          <div className="absolute inset-0 z-[5] flex items-center justify-center" style={{ background: HATCH }}>
            <span className="rounded bg-cream/90 px-1.5 py-0.5 text-center text-[10px] text-muted">
              kein Planstand
            </span>
          </div>
        )}
        {showNow && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 z-[6] h-0.5"
            style={{ top: ((nowHour ?? 0) - startHour) * HOUR_PX, background: WARNING_COLOR }}
          >
            <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full" style={{ background: WARNING_COLOR }} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Wochenende: nur 10–15 Uhr geöffnet; die übrige Zeit schraffiert. */
function ClosedBlocks({ startHour, endHour }: { startHour: number; endHour: number }) {
  const blocks = [
    { from: startHour, to: WEEKEND_OPEN.start },
    { from: WEEKEND_OPEN.end, to: endHour },
  ].filter((b) => b.to > b.from);
  return (
    <>
      {blocks.map((b) => (
        <div
          key={b.from}
          aria-hidden
          className="absolute inset-x-0 z-0 flex items-center justify-center"
          style={{ top: (b.from - startHour) * HOUR_PX, height: (b.to - b.from) * HOUR_PX, background: HATCH }}
        >
          {b.to - b.from >= 2 && (
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted/80">geschlossen</span>
          )}
        </div>
      ))}
    </>
  );
}

type LaneProps = {
  day: string;
  person: Person;
  color: string;
  hasDivider: boolean;
  index: PlanIndex;
  isWide: boolean;
  onSelect: (shift: Shift) => void;
};

function Lane({ day, person, color, hasDivider, index, isWide, onSelect }: LaneProps) {
  const shifts = (index.shiftsByDate.get(day) ?? []).filter((s) => s.person === person.name);
  const events = eventsForPerson(index, day, person.name);
  return (
    <div className={`relative z-[1] min-w-0 flex-1 ${hasDivider ? "border-l border-ink/[0.07]" : ""}`}>
      {shifts.map((shift) => (
        <ShiftBar
          key={shift.id}
          shift={shift}
          color={color}
          startHour={index.startHour}
          isWide={isWide}
          onSelect={onSelect}
        />
      ))}
      {events.map((event) => (
        <EventMark key={event.id} event={event} startHour={index.startHour} isWide={isWide} />
      ))}
    </div>
  );
}

type ShiftBarProps = {
  shift: Shift;
  color: string;
  startHour: number;
  isWide: boolean;
  onSelect: (shift: Shift) => void;
};

function ShiftBar({ shift, color, startHour, isWide, onSelect }: ShiftBarProps) {
  const kind = KIND_STYLES[shift.kind];
  const range = formatTimeRange(shift.start, shift.end);
  const surface = kind.isFloor
    ? { background: color, color: "#fff" }
    : {
        background: `repeating-linear-gradient(135deg, ${tint(color, 0.2)} 0 5px, ${tint(color, 0.07)} 5px 10px)`,
        color,
        border: `1.5px dashed ${color}`,
      };

  return (
    <button
      type="button"
      onClick={() => onSelect(shift)}
      aria-label={`${shift.person}, ${kind.label}, ${range} Uhr, ${formatHours(shift.hours)} angerechnet`}
      className="absolute inset-x-[3px] flex flex-col items-start justify-start overflow-hidden rounded-md px-[3px] py-1 text-left shadow-[0_1px_2px_rgba(26,24,21,0.18)] transition-transform duration-150 hover:-translate-y-px hover:shadow-[0_6px_14px_-6px_rgba(26,24,21,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={{ top: (shift.start - startHour) * HOUR_PX + 1, height: (shift.end - shift.start) * HOUR_PX - 2, ...surface }}
    >
      {isWide ? (
        <>
          <span className="block font-mono text-xs font-semibold tabular-nums">{range}</span>
          {kind.short && <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide">{kind.short}</span>}
          <span className="mt-0.5 block text-[11px] opacity-85">{formatHours(shift.hours)}</span>
        </>
      ) : (
        // Schmale Spalte: Beginn oben, Ende unten am Balken, Art senkrecht dazwischen.
        <>
          <span className="font-mono text-[10px] font-semibold leading-none tracking-tighter tabular-nums">
            {formatTimeCompact(shift.start)}
          </span>
          {kind.short && (
            <span className="my-1 self-center text-[9px] font-bold uppercase leading-none tracking-wide [writing-mode:vertical-rl]">
              {kind.short}
            </span>
          )}
          <span className="mt-auto font-mono text-[10px] font-semibold leading-none tracking-tighter tabular-nums">
            {formatTimeCompact(shift.end)}
          </span>
        </>
      )}
    </button>
  );
}

function eventSurface(event: PlanEvent): CSSProperties {
  switch (event.category) {
    case "meeting":
      return { background: "#C8FF00", boxShadow: "inset 0 0 0 1px #1A1815" };
    case "stash":
      return { background: "repeating-linear-gradient(to bottom, #1A1815 0 3px, transparent 3px 6px)" };
    case "hinweis":
      return { boxShadow: `inset 0 0 0 1.5px ${EVENT_STYLES.hinweis.color}`, background: "rgba(255,255,255,0.6)" };
    default:
      return { background: EVENT_STYLES.kurs.color };
  }
}

/** Kurs/Meeting/STASH einer Person: schmaler Streifen im Wochenraster, Etikett in der Tagesansicht. */
function EventMark({ event, startHour, isWide }: { event: PlanEvent; startHour: number; isWide: boolean }) {
  const position = {
    top: (event.start - startHour) * HOUR_PX + 2,
    height: (event.end - event.start) * HOUR_PX - 4,
  };
  const style = EVENT_STYLES[event.category];
  const text = `${style.label}: ${event.title}, ${formatTimeRange(event.start, event.end)} Uhr`;

  if (!isWide) {
    return (
      <span
        title={text}
        aria-hidden
        className="pointer-events-none absolute right-[5px] z-[2] w-[5px] rounded-full ring-1 ring-white/70"
        style={{ ...position, ...eventSurface(event) }}
      />
    );
  }
  return (
    <div
      className="pointer-events-none absolute right-[6px] z-[2] w-[46%] overflow-hidden rounded-md border-l-4 bg-white/95 px-1.5 py-1 text-[11px] leading-tight text-ink shadow-sm"
      style={{ ...position, borderColor: event.category === "meeting" ? "#A8DD00" : style.color }}
    >
      <span className="block font-semibold">{event.title}</span>
      <span className="font-mono text-[10px] tabular-nums text-ink-soft">
        {formatTimeRange(event.start, event.end)}
      </span>
    </div>
  );
}

/** Ab dieser Dauer passt das Kurzlabel senkrecht in die schmale Kurs-Spalte. */
const MIN_HOURS_FOR_VERTICAL_LABEL = 1.5;

function ExternalLane({
  events,
  startHour,
  hasDivider,
  isWide,
}: {
  events: readonly PlanEvent[];
  startHour: number;
  hasDivider: boolean;
  isWide: boolean;
}) {
  return (
    <div className={`relative z-[1] min-w-0 flex-[0.75] ${hasDivider ? "border-l border-dashed border-ink/15" : ""}`}>
      {events.map((event) => {
        const isWarning = Boolean(event.warning);
        const tone = isWarning
          ? { background: tint(WARNING_COLOR, 0.1), borderColor: WARNING_COLOR, color: WARNING_COLOR }
          : { background: "rgba(26,24,21,0.05)", borderColor: "rgba(26,24,21,0.35)", color: "#1A1815" };
        const range = formatTimeRange(event.start, event.end);
        const fitsVertical = event.end - event.start >= MIN_HOURS_FOR_VERTICAL_LABEL;
        return (
          <div
            key={event.id}
            title={`${event.title}${event.warning ? ` – ${event.warning}` : ""}, ${range} Uhr`}
            className="absolute inset-x-[3px] flex flex-col items-center overflow-hidden rounded-md border px-1 py-1 text-[9px] font-semibold leading-tight"
            style={{
              top: (event.start - startHour) * HOUR_PX + 1,
              height: (event.end - event.start) * HOUR_PX - 2,
              ...tone,
            }}
          >
            {isWide ? (
              <span className="self-start text-[11px]">
                {isWarning && "! "}
                {event.title}
                <span className="block font-mono text-[10px] font-normal tabular-nums">{range}</span>
                {event.warning && <span className="block">{event.warning}</span>}
              </span>
            ) : (
              <>
                {isWarning && <span aria-hidden>!</span>}
                {fitsVertical && (
                  <span className="uppercase tracking-wide [writing-mode:vertical-rl]">{event.short ?? event.title}</span>
                )}
                <span className="sr-only">
                  {event.title}, {range} Uhr{event.warning ? ` – ${event.warning}` : ""}
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

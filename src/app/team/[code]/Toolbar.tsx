"use client";

import { addDays, formatDayMonth, formatMonth, isoWeekNumber } from "@/lib/schichtplan/calendar";
import { personColor } from "@/lib/schichtplan/display";
import type { Person } from "@/lib/schichtplan/plan";
import { VIEW_LABELS, type ViewMode, isPlanView } from "@/lib/schichtplan/views";

type Props = {
  months: readonly string[];
  activeMonth: string;
  onMonth: (month: string) => void;
  view: ViewMode;
  views: readonly ViewMode[];
  onView: (view: ViewMode) => void;
  weekStarts: readonly string[];
  currentWeek: string;
  onWeek: (weekStart: string) => void;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  isTodayInPlan: boolean;
  people: readonly Person[];
  allPeople: readonly Person[];
  hidden: readonly string[];
  onToggle: (name: string) => void;
};

const BUTTON_BASE =
  "px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-35";

export function Toolbar(props: Props) {
  const { view, onView, weekStarts, currentWeek, onWeek, canPrev, canNext, onPrev, onNext } = props;
  const stepLabel = view === "tag" ? "Tag" : "Woche";
  const showPlanControls = isPlanView(view);

  return (
    <div className="space-y-3 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label="Monat"
          options={props.months.map((m) => ({ value: m, label: formatMonth(m) }))}
          value={props.activeMonth}
          onChange={props.onMonth}
        />

        {showPlanControls && (
          <>
            <div className="flex items-center rounded-full border border-ink/25 bg-cream">
              <button
                type="button"
                onClick={onPrev}
                disabled={!canPrev}
                aria-label={`Vorherige ${stepLabel}`}
                className={`${BUTTON_BASE} rounded-l-full hover:bg-ink/5`}
              >
                ←
              </button>
              <label className="sr-only" htmlFor="kw-auswahl">
                Kalenderwoche
              </label>
              <select
                id="kw-auswahl"
                value={currentWeek}
                onChange={(e) => onWeek(e.target.value)}
                className="cursor-pointer appearance-none border-x border-ink/15 bg-transparent px-3 py-1.5 font-mono text-xs font-semibold tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
              >
                {weekStarts.map((ws) => (
                  <option key={ws} value={ws}>
                    KW {isoWeekNumber(ws)} · {formatDayMonth(ws)}–{formatDayMonth(addDays(ws, 6))}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onNext}
                disabled={!canNext}
                aria-label={`Nächste ${stepLabel}`}
                className={`${BUTTON_BASE} rounded-r-full hover:bg-ink/5`}
              >
                →
              </button>
            </div>

            <button
              type="button"
              onClick={props.onToday}
              disabled={!props.isTodayInPlan}
              title={props.isTodayInPlan ? undefined : "Heute liegt außerhalb des Planstands"}
              className={`${BUTTON_BASE} rounded-full border border-ink/25 hover:bg-acid`}
            >
              Heute
            </button>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Segmented
            label="Ansicht"
            options={props.views.map((v) => ({ value: v, label: VIEW_LABELS[v] }))}
            value={view}
            onChange={onView}
          />
          <button
            type="button"
            onClick={() => window.print()}
            className={`${BUTTON_BASE} rounded-full border border-ink/25 hover:bg-ink/5`}
          >
            Drucken
          </button>
        </div>
      </div>

      {showPlanControls && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Mitarbeiter filtern">
          <span className="label mr-1">Team</span>
          {props.allPeople.map((person, i) => {
            const isScheduled = props.people.some((p) => p.name === person.name);
            const isShown = !props.hidden.includes(person.name);
            return (
              <button
                key={person.name}
                type="button"
                aria-pressed={isShown}
                onClick={() => props.onToggle(person.name)}
                title={isScheduled ? person.role : `${person.role} – in diesem Zeitraum nicht eingeplant`}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink ${
                  isShown ? "border-ink/25 bg-cream hover:bg-ink/5" : "border-dashed border-ink/25 text-muted line-through"
                } ${isScheduled ? "" : "opacity-50"}`}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ background: isShown ? personColor(person.name, i) : "transparent", boxShadow: `inset 0 0 0 1.5px ${personColor(person.name, i)}` }}
                />
                {person.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type SegmentedProps<T extends string> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex overflow-hidden rounded-full border border-ink bg-cream">
      {options.map((option, i) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={`${BUTTON_BASE} ${i > 0 ? "border-l border-ink/20" : ""} ${
              isActive ? "bg-ink text-cream" : "hover:bg-acid"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

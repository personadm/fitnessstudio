"use client";

import { useEffect, useRef } from "react";
import { formatDate, formatHours, formatTimeRange, weekdayLong } from "@/lib/schichtplan/calendar";
import { EVENT_STYLES, KIND_STYLES, WARNING_COLOR } from "@/lib/schichtplan/display";
import type { Person, PlanEvent, Shift } from "@/lib/schichtplan/plan";

type Props = {
  shift: Shift;
  person: Person | undefined;
  color: string;
  events: readonly PlanEvent[];
  onClose: () => void;
};

/** Detailkarte zu einer angeklickten Schicht (nur lesend). Schließt mit Esc. */
export function ShiftDetail({ shift, person, color, events, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const kind = KIND_STYLES[shift.kind];

  useEffect(() => {
    closeRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-labelledby="schicht-detail-titel"
      className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-ink bg-cream p-5 shadow-[0_24px_60px_-20px_rgba(26,24,21,0.55)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[23rem] print:hidden"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label">{kind.isFloor ? "Schicht" : "Angerechnete Zeit"}</p>
          <h2 id="schicht-detail-titel" className="mt-1 flex items-center gap-2 text-xl font-semibold">
            <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: color }} />
            {shift.person}
          </h2>
          {person && <p className="text-xs text-ink-soft">{person.role}</p>}
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="rounded-full border border-ink/30 px-3 py-1 text-xs font-semibold transition-colors hover:bg-ink hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
        >
          Schließen
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-[6.5rem_1fr] gap-y-1.5 text-sm">
        <dt className="text-muted">Datum</dt>
        <dd>
          {weekdayLong(shift.date)}, {formatDate(shift.date)}
        </dd>
        <dt className="text-muted">Zeit</dt>
        <dd className="font-mono tabular-nums">{formatTimeRange(shift.start, shift.end)} Uhr</dd>
        <dt className="text-muted">Art</dt>
        <dd>{kind.label}</dd>
        <dt className="text-muted">Angerechnet</dt>
        <dd className="font-mono tabular-nums">{formatHours(shift.hours)}</dd>
      </dl>

      {events.length > 0 && (
        <div className="mt-4 border-t border-dashed border-ink/20 pt-3">
          <p className="label">An diesem Tag</p>
          <ul className="mt-1.5 space-y-1 text-sm">
            {events.map((event) => (
              <li key={event.id} className="flex flex-wrap gap-x-2">
                <span className="font-mono text-xs tabular-nums text-ink-soft">
                  {formatTimeRange(event.start, event.end)}
                </span>
                <span className="font-medium">{event.title}</span>
                {EVENT_STYLES[event.category].label !== event.title && (
                  <span className="text-xs text-muted">{EVENT_STYLES[event.category].label}</span>
                )}
                {event.warning && (
                  <span className="text-xs font-semibold" style={{ color: WARNING_COLOR }}>
                    ! {event.warning}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-[11px] leading-snug text-muted">
        Planstand, keine bestätigte Ist-Zeit. Änderungen bitte über die Studioleitung.
      </p>
    </div>
  );
}

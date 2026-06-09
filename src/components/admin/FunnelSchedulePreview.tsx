"use client";

import { useState } from "react";
import {
  computeSchedule,
  type ScheduleStep,
  type FunnelLegacySchedule,
} from "@/lib/funnel-schedule";

export interface PreviewStep extends ScheduleStep {
  subject: string;
}

interface Props {
  steps: PreviewStep[];
  funnelLegacy: FunnelLegacySchedule;
}

const WEEKDAY_LABELS: Record<number, string> = {
  0: "Sonntag",
  1: "Montag",
  2: "Dienstag",
  3: "Mittwoch",
  4: "Donnerstag",
  5: "Freitag",
  6: "Samstag",
};

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Nächstes Vorkommen eines Wochentags ab heute (10:00 Uhr als Beispielzeit). */
function nextDateForWeekday(weekday: number): Date {
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  const diff = (weekday - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Lokales Datum (YYYY-MM-DD) für ein <input type="date">. */
function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function describeMode(
  step: ScheduleStep,
  funnelLegacy: FunnelLegacySchedule,
): string {
  const delay = formatDelay(step.delayDays, step.delayHours ?? 0);
  if (step.scheduleWeekday !== null && step.scheduleWeekday !== undefined) {
    const day = WEEKDAY_LABELS[step.scheduleWeekday] ?? "?";
    const time = `${String(step.scheduleHour ?? 9).padStart(2, "0")}:${String(
      step.scheduleMinute ?? 0,
    ).padStart(2, "0")}`;
    const earliest =
      step.delayDays === 0 && (step.delayHours ?? 0) === 0
        ? ""
        : ` (frühestens +${delay})`;
    return `fester Wochentag · ${day} ${time}${earliest}`;
  }
  if (
    funnelLegacy.scheduleWeekday !== null &&
    funnelLegacy.scheduleWeekday !== undefined
  ) {
    const day = WEEKDAY_LABELS[funnelLegacy.scheduleWeekday] ?? "?";
    return `Funnel-Wochenplan · ${day} (Schritt ${step.orderNum})`;
  }
  if (step.delayDays === 0 && (step.delayHours ?? 0) === 0) {
    return "relativ · sofort";
  }
  return `relativ · ${delay} nach Eintragung`;
}

function formatDelay(days: number, hours: number): string {
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? "Tag" : "Tage"}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "Std" : "Std"}`);
  if (parts.length === 0) return "0";
  return parts.join(" + ");
}

export function FunnelSchedulePreview({ steps, funnelLegacy }: Props) {
  const [signupDate, setSignupDate] = useState<string>(() =>
    toDateInputValue(nextDateForWeekday(2)),
  );

  // Beispiel-Eintragung: gewähltes Datum, 10:00 Uhr (typische Tageszeit).
  const startedAt = new Date(`${signupDate}T10:00:00`);
  const validDate = !Number.isNaN(startedAt.getTime());

  const entries = validDate
    ? computeSchedule(steps, startedAt, funnelLegacy)
    : [];
  const subjectById = new Map(steps.map((s) => [s.id, s.subject]));

  const signupWeekday = validDate ? startedAt.getDay() : null;
  const hasCollision = entries.some((e) => e.collision);
  const hasSkip = entries.some((e) => e.skipped);

  if (steps.length === 0) {
    return (
      <p className="border border-ink/15 p-6 text-center text-sm text-muted">
        Noch keine Schritte — leg erst welche an, dann zeigt die Vorschau den
        Sende-Fahrplan.
      </p>
    );
  }

  return (
    <div className="border border-ink/15 p-6">
      <p className="text-sm text-muted leading-relaxed">
        Wähle einen Beispiel-Eintragungstag. Die Vorschau zeigt exakt — mit
        derselben Berechnung wie der echte Versand — welche Mail wann rausgeht
        und in welcher Reihenfolge.
      </p>

      {/* Schnellwahl: Wochentag */}
      <div className="mt-4 flex flex-wrap gap-2">
        {WEEKDAY_ORDER.map((wd) => {
          const active = signupWeekday === wd;
          return (
            <button
              key={wd}
              type="button"
              onClick={() => setSignupDate(toDateInputValue(nextDateForWeekday(wd)))}
              className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition ${
                active
                  ? "bg-ink text-acid"
                  : "border border-ink/20 text-ink hover:border-ink"
              }`}
            >
              {WEEKDAY_LABELS[wd].slice(0, 2)}
            </button>
          );
        })}
      </div>

      <label className="mt-4 block">
        <span className="label mb-2 block">Eintragung am</span>
        <input
          type="date"
          value={signupDate}
          onChange={(e) => setSignupDate(e.target.value)}
          className="border-b-2 border-ink bg-transparent py-2 text-sm outline-none focus:border-acid_dark"
        />
        {validDate && (
          <span className="ml-3 font-mono text-[11px] text-muted">
            {WEEKDAY_LABELS[startedAt.getDay()]}, 10:00 Uhr
          </span>
        )}
      </label>

      {/* Warnungen */}
      {(hasCollision || hasSkip) && (
        <div className="mt-4 space-y-2">
          {hasCollision && (
            <p className="border border-amber-400 bg-amber-50 p-3 font-mono text-[11px] text-amber-800">
              ⚠ Mindestens zwei Mails liegen im selben Sende-Slot — sie gehen am
              selben Tag zur selben Zeit raus.
            </p>
          )}
          {hasSkip && (
            <p className="border border-red-300 bg-red-50 p-3 font-mono text-[11px] text-red-700">
              ⚠ Mindestens eine Mail würde übersprungen, weil eine zeitlich
              spätere Mail vorher rausginge.
            </p>
          )}
        </div>
      )}

      {/* Fahrplan */}
      <ol className="mt-5 divide-y divide-ink/10 border border-ink/15">
        {entries.map((entry, idx) => {
          const sendDate = new Date(entry.dueAt);
          const dateLabel = sendDate.toLocaleString("de-DE", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
          const offsetDays = Math.round(
            (entry.dueAt - startedAt.getTime()) / (24 * 60 * 60 * 1000),
          );
          return (
            <li
              key={entry.step.id}
              className={`flex items-start gap-4 p-4 ${
                entry.skipped ? "opacity-50" : ""
              }`}
            >
              <span className="flex-shrink-0 font-mono text-sm font-semibold text-acid_dark">
                {idx + 1}.
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                  {dateLabel} Uhr{" "}
                  <span className="text-ink/40">· Tag {offsetDays}</span>
                  {entry.skipped && (
                    <span className="ml-2 text-red-600">übersprungen</span>
                  )}
                  {entry.collision && !entry.skipped && (
                    <span className="ml-2 text-amber-700">gleicher Slot</span>
                  )}
                </p>
                <p className="mt-1 truncate text-sm font-medium">
                  {subjectById.get(entry.step.id) || "(ohne Betreff)"}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-muted">
                  {describeMode(entry.step, funnelLegacy)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

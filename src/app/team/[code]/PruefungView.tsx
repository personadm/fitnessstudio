"use client";

import { formatMonth, monthOfWeek, weekdayShort } from "@/lib/schichtplan/calendar";
import { type Finding, RULES, type RuleId, type Severity } from "@/lib/schichtplan/checks";
import type { PlanningNote } from "@/lib/schichtplan/konten";
import { POSITIVE_COLOR, WARNING_COLOR } from "@/lib/schichtplan/display";

const SEVERITY_STYLE: Record<Severity, { label: string; plural: string; color: string }> = {
  fehler: { label: "Regelverstoß", plural: "Regelverstöße", color: WARNING_COLOR },
  warnung: { label: "Warnung", plural: "Warnungen", color: "#B5400F" },
  hinweis: { label: "Hinweis", plural: "Hinweise", color: "#6B655C" },
};
const SEVERITY_ORDER: readonly Severity[] = ["fehler", "warnung", "hinweis"];

type Props = {
  findings: readonly Finding[];
  notes: readonly PlanningNote[];
  month: string;
};

const NOTE_KINDS: { kind: PlanningNote["kind"]; label: string; color: string }[] = [
  { kind: "diskrepanz", label: "Widersprüche zwischen den Vorgaben", color: WARNING_COLOR },
  { kind: "annahme", label: "Annahmen – bitte bestätigen", color: "#B5400F" },
  { kind: "offen", label: "Offene Punkte", color: "#6B655C" },
];

/**
 * Befunde mit Datum im Monat. Wochen-Befunde sind auf den Montag datiert und
 * zählen (ISO) zum Monat ihres Donnerstags. Undatierte gelten immer.
 */
function inMonth(finding: Finding, month: string): boolean {
  if (!finding.date) return true;
  const isWeekStart = weekdayShort(finding.date) === "Mo";
  return finding.date.startsWith(month) || (isWeekStart && monthOfWeek(finding.date) === month);
}

export function PruefungView({ findings, notes, month }: Props) {
  const monthNotes = notes.filter((n) => n.month === month);
  const relevant = findings.filter((f) => inMonth(f, month));
  const counts = SEVERITY_ORDER.map((s) => ({
    severity: s,
    count: relevant.filter((f) => f.severity === s).length,
  }));
  const ruleIds = Object.keys(RULES) as RuleId[];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {counts.map(({ severity, count }) => (
          <span
            key={severity}
            className="rounded-full border px-3 py-1 text-xs font-semibold"
            style={{ borderColor: SEVERITY_STYLE[severity].color, color: SEVERITY_STYLE[severity].color }}
          >
            {count} {count === 1 ? SEVERITY_STYLE[severity].label : SEVERITY_STYLE[severity].plural}
          </span>
        ))}
        <span className="text-xs text-muted">
          {formatMonth(month)} · Planungsregeln des Studios, keine rechtliche Prüfung
        </span>
      </div>

      {monthNotes.length > 0 && (
        <section aria-labelledby="planungshinweise" className="grid gap-3 lg:grid-cols-3">
          <h2 id="planungshinweise" className="sr-only">
            Planungshinweise
          </h2>
          {NOTE_KINDS.map(({ kind, label, color }) => {
            const list = monthNotes.filter((n) => n.kind === kind);
            if (list.length === 0) return null;
            return (
              <div key={kind} className="rounded-2xl border bg-[#FBF8F2] p-4" style={{ borderColor: color }}>
                <h3 className="text-sm font-semibold" style={{ color }}>
                  {label}
                </h3>
                <ul className="mt-2 space-y-3 text-sm">
                  {list.map((n) => (
                    <li key={n.title}>
                      <p className="font-semibold">{n.title}</p>
                      <p className="mt-0.5 leading-snug text-ink-soft">{n.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      <ol className="divide-y divide-ink/10 overflow-hidden rounded-2xl border border-ink/15 bg-[#FBF8F2]">
        {ruleIds.map((id) => {
          const list = relevant.filter((f) => f.rule === id);
          const worst = SEVERITY_ORDER.find((s) => list.some((f) => f.severity === s)) ?? null;
          const color = worst ? SEVERITY_STYLE[worst].color : POSITIVE_COLOR;
          return (
            <li key={id} className="grid gap-x-5 gap-y-1 px-4 py-3 sm:grid-cols-[15rem_1fr] sm:px-5">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span
                    aria-hidden
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: color }}
                  >
                    {worst ? "!" : "✓"}
                  </span>
                  {RULES[id].title}
                </p>
                <p className="mt-0.5 pl-7 text-xs text-muted">{RULES[id].description}</p>
              </div>
              {list.length === 0 ? (
                <p className="self-center pl-7 text-sm sm:pl-0" style={{ color: POSITIVE_COLOR }}>
                  Eingehalten
                </p>
              ) : (
                <ul className="space-y-1 pl-7 text-sm sm:pl-0">
                  {list.map((f, i) => (
                    <li key={`${f.message}-${i}`} className="flex gap-2">
                      <span
                        className="mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em]"
                        style={{ color: SEVERITY_STYLE[f.severity].color }}
                      >
                        {SEVERITY_STYLE[f.severity].label}
                      </span>
                      <span>{f.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

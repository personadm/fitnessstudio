"use client";

import { formatHours, formatMonth } from "@/lib/schichtplan/calendar";
import {
  WARNING_COLOR,
  balanceColor,
  formatEuroCents,
  formatSignedHours,
  personColor,
} from "@/lib/schichtplan/display";
import type { AccountsOverview, MonthAccount, PreviousPlan } from "@/lib/schichtplan/konten";
import type { Person, ShiftKind } from "@/lib/schichtplan/plan";

const KIND_COLUMNS: { kind: ShiftKind; label: string }[] = [
  { kind: "Studio", label: "Studio" },
  { kind: "Schule", label: "Schule" },
  { kind: "Urlaub", label: "Urlaub" },
  { kind: "Five-Schulung", label: "Schulung" },
  { kind: "Ahaus", label: "Ahaus" },
];
/** Skala der Saldo-Balken: ±25 h füllen die halbe Breite. */
const BALANCE_SCALE_HOURS = 25;

type Props = {
  accounts: AccountsOverview;
  month: string;
  people: readonly Person[];
};

function monthEndLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${String(last).padStart(2, "0")}.${String(m).padStart(2, "0")}.`;
}

export function KontenView({ accounts, month, people }: Props) {
  const rows = accounts.rows.filter((r) => r.month === month);
  const withAccount = rows.filter((r) => r.targetHours !== null);
  const reserve = rows.filter((r) => r.targetHours === null);
  const cost = accounts.costs.find((c) => c.month === month);
  const previous = accounts.previousPlans.find((p) => p.month === month);
  const colorOf = (name: string) => personColor(name, people.findIndex((p) => p.name === name));

  return (
    <div className="space-y-8">
      <Anomalies rows={rows} month={month} accounts={accounts} />

      <section aria-labelledby="salden">
        <SectionTitle id="salden" title={`Stand ${monthEndLabel(month)}`} note="Prognose aus dem Plan, kein bestätigtes Ist" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {withAccount.map((r) => (
            <BalanceCard key={r.person} row={r} color={colorOf(r.person)} />
          ))}
          {reserve.map((r) => (
            <div key={r.person} className="relative overflow-hidden rounded-2xl border border-ink/15 bg-[#FBF8F2] p-4 pl-5">
              <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: colorOf(r.person) }} />
              <p className="flex items-baseline justify-between">
                <span className="font-semibold">{r.person}</span>
                <span className="label">{r.role}</span>
              </p>
              <p className="mt-2 font-mono text-3xl font-semibold tabular-nums">{formatHours(r.creditedHours)}</p>
              <p className="mt-1 text-xs text-ink-soft">Einsätze im Monat · kein eigenes Stundenkonto</p>
              {r.costCents !== null && (
                <p className="mt-2 font-mono text-xs tabular-nums text-ink-soft">{formatEuroCents(r.costCents)}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="abrechnung">
        <SectionTitle id="abrechnung" title={`Monatsübersicht ${formatMonth(month)}`} note="Alle Werte aus dem Plan berechnet" />
        <MonthTable rows={rows} colorOf={colorOf} />
        {cost && (
          <p className="mt-3 flex flex-wrap items-baseline gap-x-3 text-sm">
            <span className="label">Geplante Lohnkosten</span>
            <span className="font-mono text-lg font-semibold tabular-nums">{formatEuroCents(cost.cents)}</span>
            {!cost.isComplete && <span style={{ color: WARNING_COLOR }}>unvollständig – ein Stundenlohn ist unbekannt</span>}
            {cost.controlEUR !== null && Math.round(cost.controlEUR * 100) === cost.cents && (
              <span className="text-xs text-ink-soft">✓ entspricht der Übergabe</span>
            )}
            <span className="text-xs text-muted">ohne Arbeitgeber-Nebenkosten und Zuschläge</span>
          </p>
        )}
      </section>

      {previous && cost && <PlanComparison previous={previous} rows={rows} costCents={cost.cents} colorOf={colorOf} />}

      <section aria-labelledby="verlauf">
        <SectionTitle id="verlauf" title="Saldo-Verlauf" note="Kontostand jeweils am Monatsende" />
        <BalanceHistory accounts={accounts} colorOf={colorOf} />
      </section>

      <section aria-labelledby="lou-historie">
        <SectionTitle id="lou-historie" title="Lou – Stundenkonto Januar bis September" note="aus der Numbers-Datei" />
        <LouHistoryTable history={accounts.louHistory} />
      </section>

      <section aria-labelledby="annahmen" className="rounded-2xl border border-dashed border-ink/25 p-4 sm:p-5">
        <h2 id="annahmen" className="label">Annahmen & Grenzen</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
          {accounts.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SectionTitle({ id, title, note }: { id: string; title: string; note?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-ink/15 pb-1.5">
      <h2 id={id} className="text-display text-2xl">
        {title}
      </h2>
      {note && <span className="text-xs text-muted">{note}</span>}
    </div>
  );
}

function BalanceBar({ hours }: { hours: number }) {
  const share = Math.min(Math.abs(hours) / BALANCE_SCALE_HOURS, 1) * 50;
  const color = balanceColor(hours) ?? "#8A857E";
  return (
    <div aria-hidden className="relative mt-3 h-2 rounded-full bg-ink/[0.07]">
      <span className="absolute inset-y-[-3px] left-1/2 w-px bg-ink/40" />
      <span
        className="absolute inset-y-0 rounded-full"
        style={{ background: color, width: `${share}%`, ...(hours < 0 ? { right: "50%" } : { left: "50%" }) }}
      />
    </div>
  );
}

function BalanceCard({ row, color }: { row: MonthAccount; color: string }) {
  const closing = row.closingHours ?? 0;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink/15 bg-[#FBF8F2] p-4 pl-5">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} />
      <p className="flex items-baseline justify-between">
        <span className="font-semibold">{row.person}</span>
        <span className="label">{row.role}</span>
      </p>
      <p className="mt-2 font-mono text-3xl font-semibold tabular-nums" style={{ color: balanceColor(closing) }}>
        {formatSignedHours(closing)}
      </p>
      <BalanceBar hours={closing} />
      <p className="mt-3 font-mono text-[11px] leading-relaxed tabular-nums text-ink-soft">
        Vortrag {formatSignedHours(row.openingHours ?? 0)} · Plan {formatHours(row.creditedHours)} · Soll{" "}
        {formatHours(row.targetHours ?? 0)}
        <br />
        Monat {formatSignedHours(row.differenceHours ?? 0)}
        {row.correctionsHours !== 0 && <> · Korrekturen {formatSignedHours(row.correctionsHours)}</>}
      </p>
    </div>
  );
}

function MonthTable({ rows, colorOf }: { rows: MonthAccount[]; colorOf: (name: string) => string }) {
  const totalHours = rows.reduce((s, r) => s + r.creditedHours, 0);
  const totalCents = rows.reduce((s, r) => s + (r.costCents ?? 0), 0);
  const num = "whitespace-nowrap px-2.5 py-2 text-right font-mono tabular-nums";
  return (
    <div className="mt-3 overflow-x-auto rounded-2xl border border-ink/15 bg-[#FBF8F2]">
      <table className="w-full min-w-[1080px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink/15 text-left text-[10px] uppercase tracking-[0.12em] text-muted">
            <th className="px-3 py-2 font-semibold">Person</th>
            <th className="px-2.5 py-2 text-right font-semibold">Vortrag</th>
            <th className="px-2.5 py-2 text-right font-semibold">Angerechnet</th>
            {KIND_COLUMNS.map((c) => (
              <th key={c.kind} className="px-2.5 py-2 text-right font-semibold">
                {c.label}
              </th>
            ))}
            <th className="px-2.5 py-2 text-right font-semibold">Soll</th>
            <th className="px-2.5 py-2 text-right font-semibold">Monat</th>
            <th className="px-2.5 py-2 text-right font-semibold">Stand</th>
            <th className="px-2.5 py-2 text-right font-semibold" title="Reguläre Wochenenddienste">WE</th>
            <th className="px-2.5 py-2 text-right font-semibold" title="Dienste bis 22 Uhr">22 Uhr</th>
            <th className="px-2.5 py-2 text-right font-semibold" title="Feierabend um 20:15">20:15</th>
            <th className="px-2.5 py-2 text-right font-semibold">€/h</th>
            <th className="px-2.5 py-2 text-right font-semibold">Kosten</th>
            <th className="px-3 py-2 font-semibold">Kontrolle</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.person} className="border-b border-ink/[0.07] last:border-b-0">
              <td className="px-3 py-2">
                <span className="flex items-center gap-2 font-semibold">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(r.person) }} />
                  {r.person}
                </span>
              </td>
              <td className={num}>{r.openingHours === null ? "–" : formatSignedHours(r.openingHours)}</td>
              <td className={`${num} font-semibold`}>{formatHours(r.creditedHours)}</td>
              {KIND_COLUMNS.map((c) => (
                <td key={c.kind} className={`${num} text-ink-soft`}>
                  {r.byKind[c.kind] ? formatHours(r.byKind[c.kind] ?? 0) : "–"}
                </td>
              ))}
              <td className={num}>{r.targetHours === null ? "–" : formatHours(r.targetHours)}</td>
              <td className={num} style={{ color: balanceColor(r.differenceHours) }}>
                {r.differenceHours === null ? "–" : formatSignedHours(r.differenceHours)}
              </td>
              <td className={`${num} font-semibold`} style={{ color: balanceColor(r.closingHours) }}>
                {r.closingHours === null ? "–" : formatSignedHours(r.closingHours)}
              </td>
              <td className={num}>{r.weekendShifts}</td>
              <td className={num}>{r.closingShifts}</td>
              <td className={num}>{r.earlyEnds}</td>
              <td className={num}>{r.wageEUR === null ? "?" : r.wageEUR.toFixed(2).replace(".", ",")}</td>
              <td className={num}>{r.costCents === null ? "unbekannt" : formatEuroCents(r.costCents)}</td>
              <td className="px-3 py-2 text-xs">
                {r.controlMismatches === null ? (
                  <span className="text-muted">–</span>
                ) : r.controlMismatches.length === 0 ? (
                  <span className="text-ink-soft">✓ Übergabe</span>
                ) : (
                  <span style={{ color: WARNING_COLOR }}>{r.controlMismatches.join("; ")}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-ink/25 font-semibold">
            <td className="px-3 py-2">Summe</td>
            <td />
            <td className={num}>{formatHours(totalHours)}</td>
            <td colSpan={KIND_COLUMNS.length + 8} />
            <td className={num}>{formatEuroCents(totalCents)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function PlanComparison({
  previous,
  rows,
  costCents,
  colorOf,
}: {
  previous: PreviousPlan;
  rows: MonthAccount[];
  costCents: number;
  colorOf: (name: string) => string;
}) {
  const names = [...new Set([...Object.keys(previous.hours), ...rows.map((r) => r.person)])];
  const num = "whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums";
  return (
    <section aria-labelledby="vergleich">
      <SectionTitle id="vergleich" title="Vorher / Nachher" note={previous.label} />
      <div className="mt-3 overflow-x-auto rounded-2xl border border-ink/15 bg-[#FBF8F2]">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink/15 text-[10px] uppercase tracking-[0.12em] text-muted">
              <th className="px-3 py-2 text-left font-semibold">Person</th>
              <th className="px-3 py-2 text-right font-semibold">Stunden vorher</th>
              <th className="px-3 py-2 text-right font-semibold">jetzt</th>
              <th className="px-3 py-2 text-right font-semibold">Änderung</th>
              <th className="px-3 py-2 text-right font-semibold">Stand vorher</th>
              <th className="px-3 py-2 text-right font-semibold">Stand jetzt</th>
            </tr>
          </thead>
          <tbody>
            {names.map((name) => {
              const before = previous.hours[name] ?? 0;
              const row = rows.find((r) => r.person === name);
              const now = row?.creditedHours ?? 0;
              const closingBefore = previous.closingBalanceHours[name];
              return (
                <tr key={name} className="border-b border-ink/[0.07] last:border-b-0">
                  <td className="px-3 py-2 font-semibold">
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(name) }} />
                      {name}
                    </span>
                  </td>
                  <td className={`${num} text-ink-soft`}>{formatHours(before)}</td>
                  <td className={`${num} font-semibold`}>{formatHours(now)}</td>
                  <td className={num}>{now === before ? "–" : formatSignedHours(Math.round((now - before) * 100) / 100)}</td>
                  <td className={num} style={{ color: balanceColor(closingBefore ?? null) }}>
                    {closingBefore === undefined ? "–" : formatSignedHours(closingBefore)}
                  </td>
                  <td className={`${num} font-semibold`} style={{ color: balanceColor(row?.closingHours ?? null) }}>
                    {row?.closingHours == null ? "–" : formatSignedHours(row.closingHours)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 font-mono text-xs tabular-nums text-ink-soft">
        Lohnkosten vorher {formatEuroCents(Math.round(previous.costEUR * 100))} → jetzt {formatEuroCents(costCents)}
        {rows.some((r) => r.costCents === null) && " (ohne Personen mit unbekanntem Stundenlohn)"}
      </p>
    </section>
  );
}

function BalanceHistory({ accounts, colorOf }: { accounts: AccountsOverview; colorOf: (name: string) => string }) {
  const people = [...new Set(accounts.rows.filter((r) => r.targetHours !== null).map((r) => r.person))];
  const firstMonth = accounts.months[0];
  return (
    <div className="mt-3 overflow-x-auto rounded-2xl border border-ink/15 bg-[#FBF8F2]">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink/15 text-[10px] uppercase tracking-[0.12em] text-muted">
            <th className="px-3 py-2 text-left font-semibold">Person</th>
            <th className="px-3 py-2 text-right font-semibold">Start</th>
            {accounts.months.map((m) => (
              <th key={m} className="px-3 py-2 text-right font-semibold">
                {monthEndLabel(m)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {people.map((name) => {
            const personRows = accounts.rows.filter((r) => r.person === name);
            const start = personRows.find((r) => r.month === firstMonth)?.openingHours ?? null;
            return (
              <tr key={name} className="border-b border-ink/[0.07] last:border-b-0">
                <td className="px-3 py-2 font-semibold">
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(name) }} />
                    {name}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums">{start === null ? "–" : formatSignedHours(start)}</td>
                {accounts.months.map((m) => {
                  const row = personRows.find((r) => r.month === m);
                  return (
                    <td
                      key={m}
                      className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums"
                      style={{ color: balanceColor(row?.closingHours ?? null) }}
                    >
                      {row?.closingHours == null ? <span className="text-muted">archiviert</span> : formatSignedHours(row.closingHours)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LouHistoryTable({ history }: { history: AccountsOverview["louHistory"] }) {
  const balances = history.rows.reduce<number[]>(
    (acc, r) => [...acc, Math.round(((acc[acc.length - 1] ?? history.carryFrom2025Hours) + r.differenz) * 100) / 100],
    [],
  );
  const cols: { key: keyof (typeof history.rows)[number]; label: string }[] = [
    { key: "geleistet", label: "geleistet" },
    { key: "urlaub", label: "Urlaub" },
    { key: "feiertage", label: "Feiertage" },
    { key: "krankheit", label: "Krankheit" },
    { key: "studium", label: "Studium" },
    { key: "summe", label: "Summe" },
  ];
  const num = "whitespace-nowrap px-2.5 py-1.5 text-right font-mono tabular-nums";
  return (
    <div className="mt-3 overflow-x-auto rounded-2xl border border-ink/15 bg-[#FBF8F2]">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink/15 text-[10px] uppercase tracking-[0.12em] text-muted">
            <th className="px-3 py-2 text-left font-semibold">Monat</th>
            {cols.map((c) => (
              <th key={c.key} className="px-2.5 py-2 text-right font-semibold">
                {c.label}
              </th>
            ))}
            <th className="px-2.5 py-2 text-right font-semibold">Über-/Unterstd.</th>
            <th className="px-3 py-2 text-right font-semibold">Kontostand</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-ink/[0.07] text-ink-soft">
            <td className="px-3 py-1.5">Übertrag 2025</td>
            <td colSpan={cols.length + 1} />
            <td className={num} style={{ color: balanceColor(history.carryFrom2025Hours) }}>
              {formatSignedHours(history.carryFrom2025Hours)}
            </td>
          </tr>
          {history.rows.map((r, i) => (
            <tr key={r.month} className="border-b border-ink/[0.07] last:border-b-0">
              <td className="px-3 py-1.5">{formatMonth(r.month).split(" ")[0]}</td>
              {cols.map((c) => (
                <td key={c.key} className={`${num} ${c.key === "summe" ? "font-semibold" : "text-ink-soft"}`}>
                  {Number(r[c.key]) === 0 ? "–" : formatHours(Number(r[c.key])).replace(" h", "")}
                </td>
              ))}
              <td className={num} style={{ color: balanceColor(r.differenz) }}>
                {formatSignedHours(r.differenz)}
              </td>
              <td className={`${num} font-semibold`} style={{ color: balanceColor(balances[i]) }}>
                {formatSignedHours(balances[i])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Anomalies({ rows, month, accounts }: { rows: MonthAccount[]; month: string; accounts: AccountsOverview }) {
  const label = monthEndLabel(month);
  const items = [
    ...rows
      .filter((r) => r.closingHours !== null && r.closingHours < 0)
      .map((r) => `${r.person}: ${formatSignedHours(r.closingHours ?? 0)} am ${label} (Minusstunden).`),
    ...rows
      .filter((r) => r.targetHours === null && r.creditedHours > 0)
      .map((r) => `${r.person} (${r.role}): ${formatHours(r.creditedHours)} im Einsatz${r.costCents !== null ? `, ${formatEuroCents(r.costCents)}` : ""}.`),
    ...rows.filter((r) => r.wageEUR === null).map((r) => `${r.person}: Stundenlohn unbekannt – Kosten unvollständig.`),
    ...rows
      .filter((r) => r.controlMismatches && r.controlMismatches.length > 0)
      .map((r) => `${r.person}: weicht von der Übergabe ab (${r.controlMismatches?.join("; ")}).`),
    ...(month === "2026-10"
      ? [
          `${accounts.octoberFile.label} rechnet mit Soll ${formatHours(accounts.octoberFile.targetHours)} und Übertrag 0: ${Object.entries(
            accounts.octoberFile.closing,
          )
            .map(([p, h]) => `${p} ${formatSignedHours(h)}`)
            .join(", ")}. Hier: Soll ${formatHours(accounts.monthlyTargetHours)} und Übertrag aus September.`,
        ]
      : []),
  ];
  if (items.length === 0) return null;
  return (
    <section
      aria-labelledby="auffaelligkeiten"
      className="rounded-2xl border px-4 py-3 sm:px-5"
      style={{ borderColor: WARNING_COLOR, background: "rgba(196,43,28,0.05)" }}
    >
      <h2 id="auffaelligkeiten" className="text-sm font-semibold" style={{ color: WARNING_COLOR }}>
        Auffälligkeiten {formatMonth(month)}
      </h2>
      <ul className="mt-1.5 space-y-1 text-sm">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </section>
  );
}

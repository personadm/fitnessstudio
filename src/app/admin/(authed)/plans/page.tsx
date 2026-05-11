import Link from "next/link";
import { db } from "@/lib/db";
import { savePlan, togglePlanActive, deletePlan } from "@/app/admin/_actions";

interface PageProps {
  searchParams: Promise<{ edit?: string; new?: string; location?: string }>;
}

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

const BILLING_LABELS: Record<string, string> = {
  MONATLICH: "Monatlich",
  QUARTALSWEISE: "Quartalsweise",
  HALBJAEHRLICH: "Halbjährlich",
  JAEHRLICH: "Jährlich",
  EINMALIG: "Einmalig",
};

function billingLabel(interval: string) {
  return BILLING_LABELS[interval] ?? interval;
}

export default async function PlansPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const editingId = sp.edit;
  const isNew = sp.new === "1";
  const filterLocation = sp.location ?? null; // "all" | "global" | locationId

  const [allPlans, locations] = await Promise.all([
    db.pricingPlan.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { location: { select: { name: true } } },
    }),
    db.location.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  let filteredPlans = allPlans;
  if (filterLocation === "global") {
    filteredPlans = allPlans.filter((p) => p.locationId === null);
  } else if (filterLocation && filterLocation !== "all") {
    filteredPlans = allPlans.filter((p) => p.locationId === filterLocation);
  }

  const editingPlan = editingId ? allPlans.find((p) => p.id === editingId) : null;
  const showForm = isNew || !!editingPlan;

  return (
    <div className="p-8 md:p-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="label">Tarife</p>
          <h1 className="mt-2 text-display text-4xl">Preise pflegen</h1>
        </div>
        {!showForm && (
          <Link
            href="/admin/plans?new=1"
            className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-acid hover:bg-ink-soft"
          >
            + Neuer Tarif
          </Link>
        )}
      </div>

      {showForm ? (
        <PlanForm plan={editingPlan ?? null} locations={locations} />
      ) : (
        <>
          {/* Filter nach Standort */}
          {locations.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              <FilterChip
                href="/admin/plans"
                label={`Alle (${allPlans.length})`}
                active={!filterLocation || filterLocation === "all"}
              />
              <FilterChip
                href="/admin/plans?location=global"
                label={`Allgemein (${allPlans.filter((p) => !p.locationId).length})`}
                active={filterLocation === "global"}
              />
              {locations.map((loc) => {
                const count = allPlans.filter((p) => p.locationId === loc.id).length;
                return (
                  <FilterChip
                    key={loc.id}
                    href={`/admin/plans?location=${loc.id}`}
                    label={`${loc.name} (${count})`}
                    active={filterLocation === loc.id}
                  />
                );
              })}
            </div>
          )}

          <div className="border border-ink/15">
            {filteredPlans.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted">
                {filterLocation
                  ? "Keine Tarife in dieser Auswahl."
                  : `Noch keine Tarife. Mit "+ Neuer Tarif" anlegen.`}
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-ink/15 bg-ink/5">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                      Name
                    </th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                      Standort
                    </th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                      Preis
                    </th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                      Intervall
                    </th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                      Aktiv
                    </th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                      Sort
                    </th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {filteredPlans.map((p) => (
                    <tr key={p.id} className={p.active ? "" : "opacity-50"}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{p.name}</p>
                        {p.description && <p className="text-xs text-muted">{p.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {p.location ? (
                          <span className="font-mono">{p.location.name}</span>
                        ) : (
                          <span className="font-mono text-muted">Allgemein</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono">{formatPrice(p.priceCents)}</td>
                      <td className="px-4 py-3 text-xs">{billingLabel(p.billingInterval)}</td>
                      <td className="px-4 py-3">
                        <form action={togglePlanActive.bind(null, p.id)}>
                          <button className="font-mono text-xs underline underline-offset-2">
                            {p.active ? "Aktiv" : "Inaktiv"}
                          </button>
                        </form>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{p.sortOrder}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/plans?edit=${p.id}`}
                          className="font-mono text-xs underline underline-offset-2 mr-3"
                        >
                          Bearbeiten
                        </Link>
                        <form action={deletePlan.bind(null, p.id)} className="inline">
                          <button className="font-mono text-xs text-red-700 underline underline-offset-2">
                            Löschen
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] ${
        active ? "border-ink bg-ink text-acid" : "border-ink/20 hover:border-ink/40"
      }`}
    >
      {label}
    </Link>
  );
}

function PlanForm({
  plan,
  locations,
}: {
  plan: Awaited<ReturnType<typeof db.pricingPlan.findMany>>[number] | null;
  locations: Awaited<ReturnType<typeof db.location.findMany>>;
}) {
  return (
    <form action={savePlan} className="max-w-2xl space-y-6 border border-ink/15 p-6">
      {plan && <input type="hidden" name="id" value={plan.id} />}

      <h2 className="text-display text-2xl mb-4">{plan ? "Tarif bearbeiten" : "Neuer Tarif"}</h2>

      <Field label="Name" name="name" defaultValue={plan?.name} required />
      <Field label="Beschreibung" name="description" defaultValue={plan?.description ?? ""} />

      {/* Standort-Auswahl */}
      <label className="block">
        <span className="label mb-2 block">Für welchen Standort?</span>
        <select
          name="locationId"
          defaultValue={plan?.locationId ?? ""}
          className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none"
        >
          <option value="">Allgemein (gilt für alle Standorte)</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <span className="mt-1 block font-mono text-[11px] text-muted">
          „Allgemein" = der Tarif wird auf der Anmeldeseite immer angezeigt, egal welcher Standort
          gewählt wurde.
        </span>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Preis (€)"
          name="priceEur"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={plan ? (plan.priceCents / 100).toFixed(2) : "0"}
        />
        <label className="block">
          <span className="label mb-2 block">Abrechnung</span>
          <select
            name="billingInterval"
            defaultValue={plan?.billingInterval ?? "MONATLICH"}
            className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none"
          >
            <option value="MONATLICH">Monatlich</option>
            <option value="QUARTALSWEISE">Quartalsweise</option>
            <option value="HALBJAEHRLICH">Halbjährlich</option>
            <option value="JAEHRLICH">Jährlich</option>
            <option value="EINMALIG">Einmalig</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="label mb-2 block">Highlights (eine pro Zeile)</span>
        <textarea
          name="highlights"
          rows={5}
          defaultValue={plan?.highlights.join("\n") ?? ""}
          placeholder={"24/7-Zugang\nAlle Kurse inklusive\nSauna-Bereich"}
          className="w-full border border-ink/20 bg-transparent p-3 text-sm outline-none focus:border-ink"
        />
      </label>

      <label className="block">
        <span className="label mb-2 block">
          AGB für diesen Tarif (optional)
        </span>
        <textarea
          name="agb"
          rows={8}
          defaultValue={plan?.agb ?? ""}
          placeholder="Spezielle Vertragsbedingungen, Mindestlaufzeit, Kündigungsfristen etc. Wird auf der Anmeldeseite unter dem gewählten Tarif angezeigt."
          className="w-full border border-ink/20 bg-transparent p-3 text-sm outline-none focus:border-ink"
        />
        <span className="mt-1 block text-xs text-muted">
          Wird auf /anmelden zusammen mit einer separaten Zustimmungs-Checkbox angezeigt, sobald der Kunde diesen Tarif wählt.
        </span>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Sortierung"
          name="sortOrder"
          type="number"
          defaultValue={String(plan?.sortOrder ?? 0)}
        />
        <label className="flex items-end gap-2 pb-2">
          <input
            type="checkbox"
            name="active"
            defaultChecked={plan?.active ?? true}
            className="h-4 w-4 accent-ink"
          />
          <span className="text-sm">Aktiv (in Mails sichtbar)</span>
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="bg-ink px-6 py-2 font-mono text-xs uppercase tracking-[0.12em] text-acid hover:bg-ink-soft"
        >
          Speichern
        </button>
        <a
          href="/admin/plans"
          className="border border-ink/20 px-6 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:bg-ink/5"
        >
          Abbrechen
        </a>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  step,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  step?: string;
  min?: string;
}) {
  return (
    <label className="block">
      <span className="label mb-2 block">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        step={step}
        min={min}
        className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
      />
    </label>
  );
}

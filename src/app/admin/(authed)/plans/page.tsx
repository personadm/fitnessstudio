import Link from "next/link";
import { db } from "@/lib/db";
import { savePlan, togglePlanActive, deletePlan } from "@/app/admin/_actions";

interface PageProps {
  searchParams: Promise<{ edit?: string; new?: string }>;
}

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

export default async function PlansPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const editingId = sp.edit;
  const isNew = sp.new === "1";

  const plans = await db.pricingPlan.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const editingPlan = editingId ? plans.find((p) => p.id === editingId) : null;
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
        <PlanForm plan={editingPlan ?? null} />
      ) : (
        <div className="border border-ink/15">
          {plans.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted">Noch keine Tarife. Mit „+ Neuer Tarif" anlegen.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-ink/15 bg-ink/5">
                <tr className="text-left">
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Name</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Preis</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Intervall</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Aktiv</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Sort</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {plans.map((p) => (
                  <tr key={p.id} className={p.active ? "" : "opacity-50"}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.name}</p>
                      {p.description && <p className="text-xs text-muted">{p.description}</p>}
                    </td>
                    <td className="px-4 py-3 font-mono">{formatPrice(p.priceCents)}</td>
                    <td className="px-4 py-3 text-xs">{p.billingInterval}</td>
                    <td className="px-4 py-3">
                      <form action={togglePlanActive.bind(null, p.id)}>
                        <button className="font-mono text-xs underline underline-offset-2">
                          {p.active ? "Aktiv" : "Inaktiv"}
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{p.sortOrder}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/plans?edit=${p.id}`} className="font-mono text-xs underline underline-offset-2 mr-3">
                        Bearbeiten
                      </Link>
                      <form action={deletePlan.bind(null, p.id)} className="inline">
                        <button className="font-mono text-xs text-red-700 underline underline-offset-2">Löschen</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function PlanForm({ plan }: { plan: Awaited<ReturnType<typeof db.pricingPlan.findMany>>[number] | null }) {
  return (
    <form action={savePlan} className="max-w-2xl space-y-6 border border-ink/15 p-6">
      {plan && <input type="hidden" name="id" value={plan.id} />}

      <h2 className="text-display text-2xl mb-4">{plan ? "Tarif bearbeiten" : "Neuer Tarif"}</h2>

      <Field label="Name" name="name" defaultValue={plan?.name} required />
      <Field label="Beschreibung" name="description" defaultValue={plan?.description ?? ""} />

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Preis (€/Monat)"
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
          </select>
        </label>
      </div>

      <label className="block">
        <span className="label mb-2 block">Highlights (eine pro Zeile)</span>
        <textarea
          name="highlights"
          rows={5}
          defaultValue={plan?.highlights.join("\n") ?? ""}
          placeholder="24/7-Zugang
Alle Kurse inklusive
Sauna-Bereich"
          className="w-full border border-ink/20 bg-transparent p-3 text-sm outline-none focus:border-ink"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Sortierung" name="sortOrder" type="number" defaultValue={String(plan?.sortOrder ?? 0)} />
        <label className="flex items-end gap-2 pb-2">
          <input type="checkbox" name="active" defaultChecked={plan?.active ?? true} className="h-4 w-4 accent-ink" />
          <span className="text-sm">Aktiv (in Mails sichtbar)</span>
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <button type="submit" className="bg-ink px-6 py-2 font-mono text-xs uppercase tracking-[0.12em] text-acid hover:bg-ink-soft">
          Speichern
        </button>
        <a href="/admin/plans" className="border border-ink/20 px-6 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:bg-ink/5">
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

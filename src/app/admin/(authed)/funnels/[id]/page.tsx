import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateFunnel, deleteFunnel, deleteFunnelStep } from "@/app/admin/_actions";
import { AddFunnelStepForm } from "./AddFunnelStepForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

const TRIGGER_LABELS: Record<string, string> = {
  INTERESSENT: "Interessent",
  NEUKUNDE: "Neukunde",
  KUNDE: "Kunde",
  EHEMALIGER: "Ehemaliger",
};

export default async function FunnelDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [funnel, locations] = await Promise.all([
    db.funnel.findUnique({
      where: { id },
      include: {
        location: { select: { id: true, name: true } },
        steps: { orderBy: { orderNum: "asc" } },
        enrollments: {
          include: {
            contact: { select: { firstName: true, lastName: true, email: true } },
          },
          orderBy: { startedAt: "desc" },
          take: 50,
        },
      },
    }),
    db.location.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);
  if (!funnel) notFound();

  const activeCount = funnel.enrollments.filter((e) => !e.completedAt && !e.cancelledAt).length;
  const completedCount = funnel.enrollments.filter((e) => e.completedAt).length;
  const cancelledCount = funnel.enrollments.filter((e) => e.cancelledAt).length;

  return (
    <div className="p-8 md:p-12">
      <Link
        href="/admin/funnels"
        className="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink"
      >
        ← Zurück zu Funnels
      </Link>

      <div className="mt-6 mb-12">
        <p className="label">Funnel</p>
        <h1 className="mt-2 text-display text-4xl">{funnel.name}</h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.1em] text-muted">
          Trigger: {TRIGGER_LABELS[funnel.trigger]}
          {funnel.location ? (
            <> · Standort: <span className="text-acid_dark">{funnel.location.name}</span></>
          ) : (
            " · Alle Standorte"
          )}
          {" · "}
          {funnel.active ? "Aktiv" : "Inaktiv"} ·{" "}
          {funnel.autoStop ? "Auto-Stop an" : "Auto-Stop aus"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        {/* Hauptbereich: Schritte */}
        <div className="space-y-12 lg:col-span-2">
          <section>
            <p className="label mb-4">Schritte ({funnel.steps.length})</p>
            {funnel.steps.length === 0 ? (
              <p className="border border-ink/15 p-8 text-center text-sm text-muted">
                Noch keine Schritte. Füg unten den ersten hinzu.
              </p>
            ) : (
              <div className="border border-ink/15 divide-y divide-ink/10">
                {funnel.steps.map((step) => (
                  <div key={step.id} className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                          Schritt {step.orderNum} · Wartezeit:{" "}
                          {formatWaitTime(
                            step.delayDays,
                            (step as { delayHours?: number }).delayHours ?? 0,
                          )}
                        </p>
                        <p className="mt-1 text-base font-medium">{step.subject}</p>
                      </div>
                      <form action={deleteFunnelStep.bind(null, step.id, funnel.id)}>
                        <button
                          type="submit"
                          className="font-mono text-[11px] uppercase tracking-[0.1em] text-red-700 hover:underline"
                        >
                          Löschen
                        </button>
                      </form>
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.1em] text-muted hover:text-ink">
                        Inhalt anzeigen
                      </summary>
                      <div className="mt-3 max-h-60 overflow-auto border border-ink/10 bg-ink/5 p-4 font-mono text-xs whitespace-pre-wrap break-all">
                        {step.bodyHtml}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <p className="label mb-4">Schritt hinzufügen</p>
            <AddFunnelStepForm funnelId={funnel.id} isFirst={funnel.steps.length === 0} />
          </section>

          {funnel.enrollments.length > 0 && (
            <section>
              <p className="label mb-4">Letzte Einschreibungen</p>
              <div className="border border-ink/15 divide-y divide-ink/10">
                {funnel.enrollments.slice(0, 20).map((e) => {
                  const status = e.completedAt
                    ? "Abgeschlossen"
                    : e.cancelledAt
                    ? `Abgebrochen (${e.cancelReason ?? "?"})`
                    : "Aktiv";
                  const fullName =
                    e.contact.firstName || e.contact.lastName
                      ? `${e.contact.firstName ?? ""} ${e.contact.lastName ?? ""}`.trim()
                      : e.contact.email;
                  return (
                    <div key={e.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="text-sm">{fullName}</p>
                        <p className="font-mono text-[11px] text-muted">
                          Start: {e.startedAt.toLocaleDateString("de-DE")}
                        </p>
                      </div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                        {status}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="border border-ink/15 p-6">
            <p className="label mb-4">Statistik</p>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Aktiv</dt>
                <dd className="font-mono">{activeCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Abgeschlossen</dt>
                <dd className="font-mono">{completedCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Abgebrochen</dt>
                <dd className="font-mono">{cancelledCount}</dd>
              </div>
            </dl>
          </div>

          <form
            action={updateFunnel.bind(null, funnel.id)}
            className="space-y-5 border border-ink/15 p-6"
          >
            <p className="label">Einstellungen</p>

            <label className="block">
              <span className="label mb-2 block">Name</span>
              <input
                type="text"
                name="name"
                defaultValue={funnel.name}
                required
                className="w-full border-b-2 border-ink bg-transparent py-2 text-sm outline-none focus:border-acid_dark"
              />
            </label>

            <fieldset>
              <legend className="label mb-2">Trigger</legend>
              <select
                name="trigger"
                defaultValue={funnel.trigger}
                className="w-full border border-ink/20 bg-transparent p-2 text-sm outline-none focus:border-ink"
              >
                {Object.entries(TRIGGER_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </fieldset>

            <label className="block">
              <span className="label mb-2 block">Standort</span>
              <select
                name="locationId"
                defaultValue={funnel.locationId ?? ""}
                className="w-full border border-ink/20 bg-transparent p-2 text-sm outline-none focus:border-ink"
              >
                <option value="">Alle Standorte</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                name="active"
                defaultChecked={funnel.active}
                className="mt-0.5 h-4 w-4 accent-ink"
              />
              <span>Aktiv</span>
            </label>

            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                name="autoStop"
                defaultChecked={funnel.autoStop}
                className="mt-0.5 h-4 w-4 accent-ink"
              />
              <span>Auto-Stop bei Status-/Standort-Wechsel</span>
            </label>

            <button
              type="submit"
              className="w-full bg-ink py-2.5 font-mono text-xs uppercase tracking-[0.12em] text-acid hover:bg-ink-soft"
            >
              Speichern
            </button>
          </form>

          <form action={deleteFunnel.bind(null, funnel.id)} className="border border-red-200 p-6">
            <p className="label !text-red-700 mb-2">Gefahrenzone</p>
            <p className="text-xs text-muted leading-relaxed mb-4">
              Funnel und alle Einschreibungen werden gelöscht.
            </p>
            <button
              type="submit"
              className="w-full border border-red-300 py-2.5 font-mono text-xs uppercase tracking-[0.12em] text-red-700 hover:bg-red-50"
            >
              Funnel löschen
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function formatWaitTime(days: number, hours: number): string {
  if (days === 0 && hours === 0) return "sofort";
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? "Tag" : "Tage"}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "Stunde" : "Stunden"}`);
  return parts.join(" + ");
}

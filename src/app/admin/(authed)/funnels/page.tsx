import Link from "next/link";
import { db } from "@/lib/db";
import { requireStudioId } from "@/lib/tenant";
import { runFunnelProcessing, toggleFunnelActive } from "@/app/admin/_actions";

const TRIGGER_LABELS: Record<string, string> = {
  INTERESSENT: "Interessent",
  NEUKUNDE: "Neukunde",
  KUNDE: "Kunde",
  EHEMALIGER: "Ehemaliger",
};

export default async function FunnelsPage() {
  const studioId = await requireStudioId();
  const funnels = await db.funnel.findMany({
    where: { studioId },
    orderBy: { createdAt: "desc" },
    include: {
      location: { select: { name: true } },
      _count: {
        select: {
          steps: true,
          enrollments: true,
        },
      },
    },
  });

  // Enrollment-/Versand-Zahlen über die Funnel-Relation aufs Studio einschränken.
  const [totalActive, totalCompleted, totalCancelled, totalSent] = await Promise.all([
    db.funnelEnrollment.count({
      where: { completedAt: null, cancelledAt: null, funnel: { studioId } },
    }),
    db.funnelEnrollment.count({ where: { completedAt: { not: null }, funnel: { studioId } } }),
    db.funnelEnrollment.count({ where: { cancelledAt: { not: null }, funnel: { studioId } } }),
    db.funnelStepEvent.count({ where: { enrollment: { funnel: { studioId } } } }),
  ]);

  return (
    <div className="p-8 md:p-12">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Marketing</p>
          <h1 className="mt-2 text-display text-5xl">Funnels</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted leading-relaxed">
            Automatisierte Mail-Sequenzen, ausgelöst durch Status-Wechsel. Optional pro Standort —
            so kannst du z.B. „Win-Back Bochum" anders fahren als „Win-Back Dortmund".
          </p>
        </div>
        <div className="flex items-center gap-3">
          <form action={runFunnelProcessing}>
            <button
              type="submit"
              className="border border-ink/20 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:bg-ink hover:text-cream"
            >
              Jetzt verarbeiten
            </button>
          </form>
          <Link
            href="/admin/funnels/new"
            className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-acid hover:bg-ink-soft"
          >
            + Neuer Funnel
          </Link>
        </div>
      </div>

      <div className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Aktive Enrollments" value={totalActive} />
        <Stat label="Mails versendet" value={totalSent} />
        <Stat label="Abgeschlossen" value={totalCompleted} />
        <Stat label="Abgebrochen" value={totalCancelled} />
      </div>

      <section>
        <p className="label mb-4">Alle Funnels</p>
        {funnels.length === 0 ? (
          <div className="border border-ink/15 p-12 text-center">
            <p className="text-sm text-muted">Noch keine Funnels angelegt.</p>
            <Link
              href="/admin/funnels/new"
              className="mt-6 inline-block bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-acid hover:bg-ink-soft"
            >
              Ersten Funnel anlegen →
            </Link>
          </div>
        ) : (
          <div className="border border-ink/15 divide-y divide-ink/10">
            {funnels.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/funnels/${f.id}`}
                    className="text-base font-medium hover:underline"
                  >
                    {f.name}
                  </Link>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                    Trigger: {TRIGGER_LABELS[f.trigger]}
                    {f.location ? (
                      <>
                        {" · "}
                        <span className="text-acid_dark">Standort: {f.location.name}</span>
                      </>
                    ) : (
                      " · Alle Standorte"
                    )}
                    {" · "}
                    {f._count.steps} {f._count.steps === 1 ? "Schritt" : "Schritte"} ·{" "}
                    {f._count.enrollments} Enrollments
                    {f.autoStop ? " · Auto-Stop an" : " · Auto-Stop aus"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <form action={toggleFunnelActive.bind(null, f.id)}>
                    <button
                      type="submit"
                      className={`px-3 py-1 font-mono text-[11px] uppercase tracking-[0.1em] border ${
                        f.active
                          ? "border-ink bg-ink text-acid"
                          : "border-ink/20 text-muted hover:border-ink/40"
                      }`}
                    >
                      {f.active ? "Aktiv" : "Inaktiv"}
                    </button>
                  </form>
                  <Link
                    href={`/admin/funnels/${f.id}`}
                    className="font-mono text-xs uppercase tracking-[0.1em] text-muted hover:text-ink"
                  >
                    Bearbeiten →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-12 text-xs text-muted leading-relaxed max-w-2xl">
        <strong>Hinweis:</strong> Verarbeitung läuft automatisch im Hintergrund (Rate-Limit alle
        5 Min). Sofortverarbeitung über „Jetzt verarbeiten".
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-ink/15 p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="mt-3 text-display text-4xl">{value}</p>
    </div>
  );
}

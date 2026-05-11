import Link from "next/link";
import { db } from "@/lib/db";
import { LiveActivity } from "@/components/admin/LiveActivity";
import { PushSubscribe } from "@/components/admin/PushSubscribe";

export default async function AdminDashboard() {
  // Status-Statistiken
  const [interessent, neukunde, kunde, ehemaliger] = await Promise.all([
    db.contact.count({ where: { status: "INTERESSENT" } }),
    db.contact.count({ where: { status: "NEUKUNDE" } }),
    db.contact.count({ where: { status: "KUNDE" } }),
    db.contact.count({ where: { status: "EHEMALIGER" } }),
  ]);

  // Phase 6: Neuanmeldungen aktueller Monat
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const newSignupsThisMonth = await db.contact.findMany({
    where: { signupAt: { gte: startOfMonth } },
    orderBy: { signupAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      signupAt: true,
      pricingPlan: { select: { name: true } },
    },
  });

  // Letzte 8 Kontakte allgemein
  const recent = await db.contact.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      createdAt: true,
    },
  });

  const [planCount, listCount, campaignCount, funnelCount] = await Promise.all([
    db.pricingPlan.count(),
    db.list.count(),
    db.campaign.count(),
    db.funnel.count(),
  ]);

  const monthLabel = new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  // VAPID-Key fürs Frontend (nur Public, sicher)
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? null;

  return (
    <div className="p-8 md:p-12">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Übersicht</p>
          <h1 className="mt-2 text-display text-5xl">Studio Dashboard</h1>
        </div>
        <Link
          href="/admin/club-anmeldung"
          className="bg-ink text-cream px-5 py-3 font-mono text-xs uppercase tracking-[0.14em] hover:bg-ink/90"
        >
          + Club-Anmeldung
        </Link>
      </div>

      {/* Status-Tiles */}
      <div className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Interessenten" value={interessent} />
        <Stat label="Neukunden" value={neukunde} />
        <Stat label="Mitglieder" value={kunde} />
        <Stat label="Ehemalige" value={ehemaliger} />
      </div>

      {/* Live-Activity + Push */}
      <section className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LiveActivity />
        </div>
        <div>
          <PushSubscribe vapidPublicKey={vapidPublicKey} />
        </div>
      </section>

      {/* Phase 6: Neuanmeldungen diesen Monat */}
      <section className="mb-12">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="label">Neuanmeldungen — {monthLabel}</p>
            <p className="mt-1 text-sm text-muted">
              {newSignupsThisMonth.length === 0
                ? "Diesen Monat noch keine Anmeldungen."
                : `${newSignupsThisMonth.length} ${newSignupsThisMonth.length === 1 ? "Anmeldung" : "Anmeldungen"} – Klick auf einen Eintrag für die Daten zur Übernahme in die Buchhaltung.`}
            </p>
          </div>
        </div>

        {newSignupsThisMonth.length > 0 && (
          <div className="border border-ink/15">
            <ul className="divide-y divide-ink/10">
              {newSignupsThisMonth.map((c) => {
                const fullName =
                  c.firstName || c.lastName
                    ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
                    : c.email;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/admin/contacts/${c.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-ink/5"
                    >
                      <div className="min-w-0">
                        <p className="text-base">{fullName}</p>
                        <p className="font-mono text-xs text-muted truncate">{c.email}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
                          {c.pricingPlan?.name ?? "—"}
                        </p>
                        <p className="font-mono text-xs text-muted">
                          {c.signupAt ? c.signupAt.toLocaleDateString("de-DE") : "—"}
                        </p>
                        <span className="font-mono text-xs uppercase tracking-[0.1em] text-acid_dark">
                          Details →
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Letzte Kontakte */}
      <section className="mb-12">
        <div className="mb-4 flex items-end justify-between">
          <p className="label">Letzte Kontakte</p>
          <Link
            href="/admin/contacts"
            className="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink"
          >
            Alle Kontakte →
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="border border-ink/15 p-8 text-sm text-muted">Noch keine Kontakte.</p>
        ) : (
          <ul className="border border-ink/15 divide-y divide-ink/10">
            {recent.map((c) => {
              const fullName =
                c.firstName || c.lastName
                  ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
                  : c.email;
              return (
                <li key={c.id}>
                  <Link
                    href={`/admin/contacts/${c.id}`}
                    className="flex items-center justify-between gap-4 p-4 hover:bg-ink/5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm">{fullName}</p>
                      <p className="font-mono text-xs text-muted truncate">{c.email}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                        {c.status}
                      </p>
                      <p className="font-mono text-[11px] text-muted">
                        {c.createdAt.toLocaleDateString("de-DE")}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Schnellzugriff */}
      <section>
        <p className="label mb-4">Verwaltung</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <QuickLink href="/admin/plans" label="Tarife" count={planCount} />
          <QuickLink href="/admin/lists" label="Listen" count={listCount} />
          <QuickLink href="/admin/campaigns" label="Kampagnen" count={campaignCount} />
          <QuickLink href="/admin/funnels" label="Funnels" count={funnelCount} />
        </div>
      </section>
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

function QuickLink({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <Link
      href={href}
      className="border border-ink/15 p-6 hover:border-ink/40 hover:bg-ink/5 transition-colors"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="mt-3 text-display text-3xl">{count}</p>
      <p className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-acid_dark">öffnen →</p>
    </Link>
  );
}

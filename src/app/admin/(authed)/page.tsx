import Link from "next/link";
import { db } from "@/lib/db";

export default async function AdminDashboard() {
  const [interessenten, neukunden, kunden, ehemalige, listen, campaigns, plans] = await Promise.all([
    db.contact.count({ where: { status: "INTERESSENT" } }),
    db.contact.count({ where: { status: "NEUKUNDE" } }),
    db.contact.count({ where: { status: "KUNDE" } }),
    db.contact.count({ where: { status: "EHEMALIGER" } }),
    db.list.count(),
    db.campaign.count(),
    db.pricingPlan.count({ where: { active: true } }),
  ]);

  const recentContacts = await db.contact.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, email: true, firstName: true, lastName: true, status: true, createdAt: true },
  });

  return (
    <div className="p-8 md:p-12">
      <p className="label mb-4">Übersicht</p>
      <h1 className="text-display text-4xl mb-12">Dashboard</h1>

      <div className="grid grid-cols-2 gap-px bg-ink/15 md:grid-cols-4">
        <Stat label="Interessenten" value={interessenten} href="/admin/contacts?status=INTERESSENT" />
        <Stat label="Neukunden" value={neukunden} href="/admin/contacts?status=NEUKUNDE" />
        <Stat label="Kunden" value={kunden} href="/admin/contacts?status=KUNDE" highlight />
        <Stat label="Ehemalige" value={ehemalige} href="/admin/contacts?status=EHEMALIGER" />
      </div>

      <div className="mt-12 grid grid-cols-1 gap-12 md:grid-cols-3">
        <div className="md:col-span-2">
          <p className="label mb-4">Zuletzt eingetragen</p>
          <div className="border border-ink/15">
            {recentContacts.length === 0 ? (
              <p className="p-6 text-sm text-muted">Noch keine Einträge.</p>
            ) : (
              <ul className="divide-y divide-ink/15">
                {recentContacts.map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/contacts/${c.id}`} className="flex items-center justify-between p-4 hover:bg-ink/5">
                      <div>
                        <p className="text-sm">
                          {c.firstName || c.lastName
                            ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
                            : c.email}
                        </p>
                        <p className="font-mono text-[11px] text-muted">{c.email}</p>
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{c.status}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <p className="label mb-4">Stand</p>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between border-b border-ink/15 pb-2"><span>Aktive Tarife</span><span className="font-mono">{plans}</span></li>
            <li className="flex justify-between border-b border-ink/15 pb-2"><span>Listen</span><span className="font-mono">{listen}</span></li>
            <li className="flex justify-between border-b border-ink/15 pb-2"><span>Kampagnen</span><span className="font-mono">{campaigns}</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, href, highlight }: { label: string; value: number; href: string; highlight?: boolean }) {
  return (
    <Link href={href} className={`block p-6 hover:bg-ink/5 ${highlight ? "bg-ink text-cream hover:bg-ink-soft" : "bg-cream"}`}>
      <p className={`label ${highlight ? "!text-acid" : ""}`}>{label}</p>
      <p className="mt-3 text-display text-5xl">{value}</p>
    </Link>
  );
}

import Link from "next/link";
import { db } from "@/lib/db";
import type { ContactStatus } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string }>;
}

const STATUS_TABS: Array<{ key: ContactStatus | "ALL"; label: string }> = [
  { key: "ALL", label: "Alle" },
  { key: "INTERESSENT", label: "Interessenten" },
  { key: "NEUKUNDE", label: "Neukunden" },
  { key: "KUNDE", label: "Kunden" },
  { key: "EHEMALIGER", label: "Ehemalige" },
];

const STATUS_VALUES: ContactStatus[] = ["INTERESSENT", "NEUKUNDE", "KUNDE", "EHEMALIGER"];

export default async function ContactsPage({ searchParams }: PageProps) {
  const { status, q } = await searchParams;
  const activeStatus = status && (STATUS_VALUES as string[]).includes(status) ? (status as ContactStatus) : null;

  const contacts = await db.contact.findMany({
    where: {
      ...(activeStatus ? { status: activeStatus } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { pricingPlan: { select: { name: true } } },
  });

  const counts = await db.contact.groupBy({
    by: ["status"],
    _count: true,
  });
  const countMap: Record<string, number> = {};
  counts.forEach((c) => {
    countMap[c.status] = c._count;
  });
  const total = Object.values(countMap).reduce((a, b) => a + b, 0);

  return (
    <div className="p-8 md:p-12">
      <p className="label mb-4">Kontakte</p>
      <h1 className="text-display text-4xl mb-8">Alle Datensätze</h1>

      {/* Status-Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-ink/15">
        {STATUS_TABS.map((tab) => {
          const isActive = (tab.key === "ALL" && !activeStatus) || tab.key === activeStatus;
          const count = tab.key === "ALL" ? total : countMap[tab.key] ?? 0;
          return (
            <Link
              key={tab.key}
              href={tab.key === "ALL" ? "/admin/contacts" : `/admin/contacts?status=${tab.key}`}
              className={`-mb-px border-b-2 px-4 py-3 font-mono text-xs uppercase tracking-[0.12em] ${
                isActive ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {tab.label} <span className="ml-1 text-[10px]">({count})</span>
            </Link>
          );
        })}
      </div>

      {/* Suche */}
      <form className="mb-6">
        {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="E-Mail, Vorname, Nachname suchen..."
          className="w-full max-w-md border border-ink/20 bg-transparent px-4 py-2 text-sm outline-none focus:border-ink"
        />
      </form>

      {/* Tabelle */}
      <div className="border border-ink/15">
        <table className="w-full text-sm">
          <thead className="border-b border-ink/15 bg-ink/5">
            <tr className="text-left">
              <Th>Name / E-Mail</Th>
              <Th>Status</Th>
              <Th>Tarif</Th>
              <Th>Quelle</Th>
              <Th>Eingetragen</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-sm text-muted">
                  Keine Einträge gefunden.
                </td>
              </tr>
            ) : (
              contacts.map((c) => (
                <tr key={c.id} className="hover:bg-ink/5">
                  <Td>
                    <Link href={`/admin/contacts/${c.id}`} className="block">
                      <p className="font-medium">
                        {c.firstName || c.lastName
                          ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
                          : "—"}
                      </p>
                      <p className="font-mono text-[11px] text-muted">{c.email}</p>
                    </Link>
                  </Td>
                  <Td><StatusBadge status={c.status} /></Td>
                  <Td>{c.pricingPlan?.name ?? "—"}</Td>
                  <Td className="font-mono text-[10px] uppercase text-muted">{c.source}</Td>
                  <Td className="font-mono text-[11px] text-muted">
                    {c.createdAt.toLocaleDateString("de-DE")}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function StatusBadge({ status }: { status: ContactStatus }) {
  const colors: Record<ContactStatus, string> = {
    INTERESSENT: "bg-cream border-ink/30 text-ink",
    NEUKUNDE: "bg-acid text-ink border-acid_dark",
    KUNDE: "bg-ink text-acid border-ink",
    EHEMALIGER: "bg-cream border-ink/30 text-muted",
  };
  return (
    <span className={`inline-block border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${colors[status]}`}>
      {status}
    </span>
  );
}

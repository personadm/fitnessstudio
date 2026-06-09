import Link from "next/link";
import { db } from "@/lib/db";
import { requireStudioId } from "@/lib/tenant";

const STATUS_LABELS: Record<string, string> = {
  INTERESSENT: "Interessenten",
  NEUKUNDE: "Neukunden",
  KUNDE: "Mitglieder",
  EHEMALIGER: "Ehemalige",
};

export default async function CampaignsPage() {
  const studioId = await requireStudioId();
  const campaigns = await db.campaign.findMany({
    where: { studioId },
    orderBy: { createdAt: "desc" },
    include: {
      list: { select: { name: true } },
      targetLocation: { select: { name: true } },
      _count: { select: { events: true } },
    },
  });

  return (
    <div className="p-8 md:p-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="label">Newsletter</p>
          <h1 className="mt-2 text-display text-4xl">Kampagnen</h1>
        </div>
        <Link
          href="/admin/campaigns/new"
          className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-acid hover:bg-ink-soft"
        >
          + Neue Kampagne
        </Link>
      </div>

      <div className="border border-ink/15">
        {campaigns.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">Noch keine Kampagnen.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-ink/15 bg-ink/5">
              <tr className="text-left">
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  Betreff
                </th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  Empfänger
                </th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  Status
                </th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  Versendet
                </th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  Erstellt
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {campaigns.map((c) => {
                // Empfänger-Beschreibung bauen
                const parts: string[] = [];
                if (c.list) {
                  parts.push(`Liste: ${c.list.name}`);
                } else if (c.targetStatus) {
                  parts.push(STATUS_LABELS[c.targetStatus] ?? c.targetStatus);
                }
                if (c.targetLocation) {
                  parts.push(c.targetLocation.name);
                }
                const recipientLabel = parts.length > 0 ? parts.join(" · ") : "—";

                return (
                  <tr key={c.id} className="hover:bg-ink/5">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/campaigns/${c.id}`}
                        className="font-medium underline underline-offset-2"
                      >
                        {c.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs">{recipientLabel}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.status}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c._count.events}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {c.createdAt.toLocaleDateString("de-DE")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

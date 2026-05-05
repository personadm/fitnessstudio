import Link from "next/link";
import { db } from "@/lib/db";

export default async function CampaignsPage() {
  const campaigns = await db.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { list: true, _count: { select: { events: true } } },
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
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Betreff</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Liste</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Status</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Versendet</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Erstellt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-ink/5">
                  <td className="px-4 py-3">
                    <Link href={`/admin/campaigns/${c.id}`} className="font-medium underline underline-offset-2">
                      {c.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{c.list.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.status}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c._count.events}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {c.createdAt.toLocaleDateString("de-DE")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

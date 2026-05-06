import Link from "next/link";
import { db } from "@/lib/db";
import { CampaignFormWithAI } from "./CampaignFormWithAI";

export default async function NewCampaignPage() {
  const lists = await db.list.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { contacts: true } } },
  });

  if (lists.length === 0) {
    return (
      <div className="p-8 md:p-12">
        <Link
          href="/admin/campaigns"
          className="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink"
        >
          ← Zurück
        </Link>
        <p className="mt-6 max-w-xl text-base">
          Du hast noch keine Listen. Leg unter{" "}
          <Link href="/admin/lists" className="underline">
            Listen
          </Link>{" "}
          mindestens eine an und füge Kontakte hinzu, bevor du eine Kampagne erstellst.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12">
      <Link
        href="/admin/campaigns"
        className="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink"
      >
        ← Zurück zu Kampagnen
      </Link>

      <p className="mt-6 label">Newsletter</p>
      <h1 className="mt-2 text-display text-4xl mb-12">Neue Kampagne</h1>

      <CampaignFormWithAI
        lists={lists.map((l) => ({
          id: l.id,
          name: l.name,
          count: l._count.contacts,
        }))}
      />
    </div>
  );
}

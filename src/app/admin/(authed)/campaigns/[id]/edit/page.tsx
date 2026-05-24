import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CampaignEditForm } from "./CampaignEditForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignEditPage({ params }: PageProps) {
  const { id } = await params;

  const [campaign, lists, locations] = await Promise.all([
    db.campaign.findUnique({
      where: { id },
      select: {
        id: true,
        subject: true,
        bodyHtml: true,
        status: true,
        listId: true,
        targetStatus: true,
        targetLocationId: true,
      },
    }),
    db.list.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        _count: { select: { contacts: true } },
      },
    }),
    db.location.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, city: true },
    }),
  ]);

  if (!campaign) notFound();

  // Versendete Campaigns können nicht editiert werden — zurück zur Detail-Page
  if (campaign.status !== "DRAFT") {
    redirect(`/admin/campaigns/${id}`);
  }

  return (
    <div className="p-8 md:p-12">
      <Link
        href={`/admin/campaigns/${id}`}
        className="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink"
      >
        ← Zurück zur Kampagne
      </Link>

      <div className="mt-6 mb-12">
        <p className="label">Entwurf bearbeiten</p>
        <h1 className="mt-2 text-display text-4xl">Newsletter bearbeiten</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted leading-relaxed">
          Du kannst alle Felder anpassen solange der Newsletter noch nicht
          versendet wurde. Beim Speichern bleibt der Status auf „Entwurf" —
          versenden machst du danach auf der Detail-Seite.
        </p>
      </div>

      <CampaignEditForm
        campaign={{
          id: campaign.id,
          subject: campaign.subject,
          bodyHtml: campaign.bodyHtml,
          listId: campaign.listId,
          targetStatus: campaign.targetStatus,
          targetLocationId: campaign.targetLocationId,
        }}
        lists={lists.map((l) => ({ id: l.id, name: l.name, count: l._count.contacts }))}
        locations={locations}
      />
    </div>
  );
}

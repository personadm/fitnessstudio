import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStudioId } from "@/lib/tenant";
import { CampaignEditForm } from "./CampaignEditForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignEditPage({ params }: PageProps) {
  const { id } = await params;
  const studioId = await requireStudioId();

  const [campaign, lists, locations] = await Promise.all([
    db.campaign.findFirst({
      where: { id, studioId },
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
      where: { studioId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        _count: { select: { contacts: true } },
      },
    }),
    db.location.findMany({
      where: { studioId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, city: true },
    }),
  ]);

  if (!campaign) notFound();

  const isSent = campaign.status === "SENT";

  return (
    <div className="p-8 md:p-12">
      <Link
        href={`/admin/campaigns/${id}`}
        className="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink"
      >
        ← Zurück zur Kampagne
      </Link>

      <div className="mt-6 mb-12">
        <p className="label">
          {isSent ? "Versendete Kampagne bearbeiten" : "Entwurf bearbeiten"}
        </p>
        <h1 className="mt-2 text-display text-4xl">Newsletter bearbeiten</h1>

        {isSent ? (
          <div className="mt-4 max-w-2xl border border-acid bg-acid/20 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink">
              ⓘ Diese Kampagne wurde bereits versendet
            </p>
            <p className="mt-2 text-sm text-ink leading-relaxed">
              Du kannst Betreff, Inhalt und Targeting bearbeiten — der Versand-Status
              bleibt erhalten. Falls du an eine neue Liste senden willst: Liste hier
              ändern, speichern, danach auf der Detail-Seite „Erneut versenden" klicken.
              Empfänger, die schon eine Mail bekommen haben, bekommen <strong>keine zweite</strong>.
            </p>
          </div>
        ) : (
          <p className="mt-3 max-w-2xl text-sm text-muted leading-relaxed">
            Du kannst alle Felder anpassen solange der Newsletter noch nicht
            versendet wurde. Beim Speichern bleibt der Status auf „Entwurf" —
            versenden machst du danach auf der Detail-Seite.
          </p>
        )}
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

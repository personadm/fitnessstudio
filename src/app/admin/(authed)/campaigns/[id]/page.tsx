import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { deleteCampaign } from "@/app/admin/_actions";
import { CampaignSendButton } from "./CampaignSendButton";
import { getCampaignRecipients } from "@/lib/campaigns";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  INTERESSENT: "Interessenten",
  NEUKUNDE: "Neukunden",
  KUNDE: "Mitglieder",
  EHEMALIGER: "Ehemalige",
};

export default async function CampaignDetailPage({ params }: PageProps) {
  const { id } = await params;

  const campaign = await db.campaign.findUnique({
    where: { id },
    include: {
      list: { select: { id: true, name: true, _count: { select: { contacts: true } } } },
      targetLocation: { select: { id: true, name: true } },
      _count: { select: { events: true } },
    },
  });
  if (!campaign) notFound();

  const recipients = await getCampaignRecipients({
    listId: campaign.listId,
    targetStatus: campaign.targetStatus,
    targetLocationId: campaign.targetLocationId,
  });

  const sentEvents = await db.campaignEvent.count({
    where: { campaignId: id, event: "SENT" },
  });

  // Targeting-Beschreibung bauen
  const targetParts: string[] = [];
  if (campaign.list) {
    targetParts.push(`Liste „${campaign.list.name}" (${campaign.list._count.contacts} insgesamt)`);
  } else if (campaign.targetStatus) {
    targetParts.push(`Status: ${STATUS_LABELS[campaign.targetStatus]}`);
  }
  if (campaign.targetLocation) {
    targetParts.push(`Standort: ${campaign.targetLocation.name}`);
  } else if (campaign.targetStatus && !campaign.targetLocation) {
    targetParts.push("alle Standorte");
  }

  return (
    <div className="p-8 md:p-12">
      <Link
        href="/admin/campaigns"
        className="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink"
      >
        ← Zurück
      </Link>

      <div className="mt-6 mb-12">
        <p className="label">Kampagne · {campaign.status}</p>
        <h1 className="mt-2 text-display text-3xl">{campaign.subject}</h1>
        <p className="mt-2 text-sm text-muted">
          {targetParts.join(" · ")} · {recipients.length} versandfähig (DOI bestätigt
          {campaign.targetStatus !== "EHEMALIGER" ? ", nicht Ehemaliger" : ""})
        </p>
      </div>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
        <div className="md:col-span-2">
          <p className="label mb-3">Vorschau Inhalt</p>
          <div className="border border-ink/15 bg-cream p-6">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: campaign.bodyHtml }}
            />
          </div>
        </div>

        <div className="space-y-6">
          {campaign.status === "SENT" ? (
            <div className="border border-ink/15 p-4">
              <p className="label !text-acid_dark">✓ Versendet</p>
              <p className="mt-2 text-sm">{sentEvents} Mails verschickt</p>
              <p className="text-xs text-muted">
                am {campaign.sentAt?.toLocaleString("de-DE") ?? "—"}
              </p>
            </div>
          ) : (
            <CampaignSendButton campaignId={campaign.id} recipientCount={recipients.length} />
          )}

          <form action={deleteCampaign.bind(null, campaign.id)}>
            <button className="w-full border border-red-700/40 px-3 py-2 font-mono text-xs uppercase tracking-[0.1em] text-red-700 hover:bg-red-700 hover:text-cream">
              Kampagne löschen
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

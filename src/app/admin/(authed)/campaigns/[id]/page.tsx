import Link from "next/link";
import { notFound } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { db } from "@/lib/db";
import { deleteCampaign } from "@/app/admin/_actions";
import { CampaignSendButton } from "./CampaignSendButton";
import { RestartCampaignButton } from "./RestartCampaignButton";
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

  // Wie viele der aktuellen Empfänger haben noch kein SENT-Event?
  // (Wichtig nach restartCampaign, wenn neue Liste = teilweise neue Kontakte)
  const sentEventsForRecipients = await db.campaignEvent.findMany({
    where: {
      campaignId: id,
      event: "SENT",
      contactId: { in: recipients.map((r) => r.id) },
    },
    select: { contactId: true },
  });
  const newRecipientsCount = recipients.length - sentEventsForRecipients.length;

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

  const isSent = campaign.status === "SENT";
  const isDraftOrSending = campaign.status === "DRAFT" || campaign.status === "SENDING";

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
          {targetParts.join(" · ")} · {recipients.length} versandfähig
          {isSent && newRecipientsCount > 0 && (
            <span className="ml-2 text-acid_dark">
              · {newRecipientsCount} noch nicht angeschrieben
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
        <div className="md:col-span-2">
          <p className="label mb-3">Vorschau Inhalt</p>
          <div className="border border-ink/15 bg-cream p-6">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(campaign.bodyHtml) }}
            />
          </div>
        </div>

        <div className="space-y-3">
          {/* Bearbeiten — immer sichtbar (auch bei SENT) */}
          <Link
            href={`/admin/campaigns/${campaign.id}/edit`}
            className="block w-full border border-ink/20 px-3 py-2 text-center font-mono text-xs uppercase tracking-[0.1em] hover:bg-ink hover:text-cream"
          >
            ✎ Bearbeiten
          </Link>

          {/* DRAFT / SENDING: Senden-Button */}
          {isDraftOrSending && (
            <CampaignSendButton campaignId={campaign.id} recipientCount={recipients.length} />
          )}

          {/* SENT: Versand-Info + Erneut-Versenden */}
          {isSent && (
            <>
              <div className="border border-ink/15 p-4">
                <p className="label !text-acid_dark">✓ Versendet</p>
                <p className="mt-2 text-sm">{sentEvents} Mails verschickt</p>
                <p className="text-xs text-muted">
                  am {campaign.sentAt?.toLocaleString("de-DE") ?? "—"}
                </p>
              </div>

              <RestartCampaignButton
                campaignId={campaign.id}
                newRecipientsCount={newRecipientsCount}
              />
            </>
          )}

          {/* Löschen */}
          <form action={deleteCampaign.bind(null, campaign.id)}>
            <button className="w-full border border-red-700/40 px-3 py-2 font-mono text-xs uppercase tracking-[0.1em] text-red-700 hover:bg-red-700 hover:text-cream">
              Kampagne löschen
            </button>
          </form>

          {/* Hilfetexte */}
          {isSent && (
            <p className="font-mono text-[10px] text-muted leading-relaxed">
              Du kannst die Kampagne bearbeiten (z.B. Liste ändern). Bei
              „Erneut versenden" wird sie wieder versandbereit. Empfänger,
              die bereits eine Mail bekommen haben, bekommen <strong>keine zweite</strong>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

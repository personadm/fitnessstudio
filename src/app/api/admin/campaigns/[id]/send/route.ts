import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendCampaignMail } from "@/lib/mail";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 Min für längere Listen

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const campaign = await db.campaign.findUnique({
    where: { id },
    include: {
      list: {
        include: {
          contacts: { include: { contact: true } },
        },
      },
    },
  });
  if (!campaign) return NextResponse.json({ ok: false, message: "Kampagne nicht gefunden." }, { status: 404 });
  if (campaign.status === "SENT") {
    return NextResponse.json({ ok: false, message: "Bereits versendet." }, { status: 400 });
  }

  // Empfänger filtern
  const recipients = campaign.list.contacts
    .map((cl) => cl.contact)
    .filter((c) => c.doiConfirmedAt && c.status !== "EHEMALIGER");

  if (recipients.length === 0) {
    return NextResponse.json({ ok: false, message: "Keine versandfähigen Empfänger." }, { status: 400 });
  }

  await db.campaign.update({
    where: { id },
    data: { status: "SENDING" },
  });

  let sent = 0;
  let failed = 0;

  // Rate-Limit-freundlich: ~5 Mails/Sek (200ms Pause zwischen Sends)
  for (const c of recipients) {
    try {
      await sendCampaignMail({
        to: c.email,
        subject: campaign.subject,
        bodyHtml: campaign.bodyHtml,
      });
      await db.campaignEvent.create({
        data: { campaignId: id, contactId: c.id, event: "SENT" },
      });
      sent++;
    } catch (err) {
      console.error(`[campaign send] failed for ${c.email}`, err);
      await db.campaignEvent.create({
        data: {
          campaignId: id,
          contactId: c.id,
          event: "FAILED",
          meta: { error: String(err) },
        },
      });
      failed++;
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  await db.campaign.update({
    where: { id },
    data: {
      status: failed === recipients.length ? "FAILED" : "SENT",
      sentAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, sent, failed, total: recipients.length });
}

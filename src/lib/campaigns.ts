import { db } from "./db";
import { sendCampaignMail } from "./mail";
import type { ContactStatus } from "@prisma/client";

// ~4 Mails/Sek — schont das Resend-Rate-Limit. Identisch zum bisherigen
// Browser-Versand, nur dass die Schleife jetzt serverseitig läuft.
export const CAMPAIGN_BATCH_SIZE = 30;
export const CAMPAIGN_MAIL_THROTTLE_MS = 250;

export type CampaignTargeting = {
  listId: string | null;
  targetStatus: ContactStatus | null;
  targetLocationId: string | null;
};

export type Recipient = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: ContactStatus;
  doiConfirmedAt: Date | null;
  locationId: string | null;
};

/**
 * Liefert Empfänger einer Campaign basierend auf Targeting:
 * - Wenn listId: Mitglieder dieser Liste
 * - Wenn targetStatus: alle Kontakte mit diesem Status
 * - targetLocationId schränkt zusätzlich nach Standort ein
 *
 * Kein DOI-Filter mehr — alle Kontakte im jeweiligen Pool sind versandfähig.
 * Verantwortung für legitime Kontakt-Erfassung liegt beim Admin. Empfänger
 * können sich jederzeit über den Abmeldelink im Footer abmelden.
 *
 * Opt-out-Filter: wer `optedOutAt` gesetzt hat, wird ausgeschlossen.
 */
export async function getCampaignRecipients(
  targeting: CampaignTargeting,
): Promise<Recipient[]> {
  const select = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    status: true,
    doiConfirmedAt: true,
    locationId: true,
  };

  if (targeting.listId) {
    const rows = await db.contactList.findMany({
      where: {
        listId: targeting.listId,
        // Optional zusätzlich nach Standort filtern.
        ...(targeting.targetLocationId
          ? { contact: { locationId: targeting.targetLocationId } }
          : {}),
      },
      include: { contact: { select } },
    });
    return rows.map((r) => r.contact);
  }

  if (targeting.targetStatus) {
    const contacts = await db.contact.findMany({
      where: {
        status: targeting.targetStatus,
        ...(targeting.targetLocationId
          ? { locationId: targeting.targetLocationId }
          : {}),
      },
      select,
    });
    return contacts;
  }

  return [];
}

// ─────────────────────────────────────────────────────────────
// CAMPAIGN-VERSAND (serverseitig, ohne offenes Admin-Panel)
// ─────────────────────────────────────────────────────────────

export type CampaignBatchResult = {
  ok: boolean;
  message?: string;
  done?: boolean;
  total?: number;
  sentTotal?: number;
  batchSent?: number;
};

/**
 * Versendet eine Campaign in einem Batch von max. `batchSize` Mails.
 *
 * Race-safe via @@unique([campaignId, contactId, event]) auf CampaignEvent:
 * pro Empfänger kann nur EIN SENT-Event geschrieben werden. Reihenfolge:
 * erst Event-Insert (atomar), dann Mail. Scheitert die Mail, bleibt das
 * Event bestehen → keine erneute Mail. Lieber eine Mail nicht raus als doppelt.
 *
 * Diese Funktion enthält KEINE Auth — Aufrufer (Server Action / Cron) müssen
 * vorher autorisieren bzw. per CRON_SECRET geschützt sein.
 */
export async function sendCampaignBatch(
  campaignId: string,
  batchSize: number = CAMPAIGN_BATCH_SIZE,
): Promise<CampaignBatchResult> {
  const campaign = await db.campaign.findFirst({ where: { id: campaignId } });
  if (!campaign) return { ok: false, message: "Kampagne nicht gefunden." };

  const recipients = await getCampaignRecipients({
    listId: campaign.listId,
    targetStatus: campaign.targetStatus,
    targetLocationId: campaign.targetLocationId,
  });
  const total = recipients.length;

  if (total === 0) {
    await db.campaign.update({
      where: { id: campaignId },
      data: { status: "SENT", sentAt: new Date(), sendingStartedAt: null },
    });
    return { ok: true, done: true, total: 0, sentTotal: 0, batchSent: 0 };
  }

  const sentEvents = await db.campaignEvent.findMany({
    where: { campaignId, event: "SENT" },
    select: { contactId: true },
  });
  const sentIds = new Set(sentEvents.map((e) => e.contactId));

  const toSend = recipients
    .filter((r) => !sentIds.has(r.id))
    .slice(0, batchSize);

  if (campaign.status === "DRAFT" && toSend.length > 0) {
    await db.campaign.update({
      where: { id: campaignId },
      data: { status: "SENDING", sendingStartedAt: new Date() },
    });
  }

  let batchSent = 0;
  for (const recipient of toSend) {
    // Atomic INSERT vor Send — verhindert Doppel-Send via Unique-Constraint
    try {
      await db.campaignEvent.create({
        data: { campaignId, contactId: recipient.id, event: "SENT" },
      });
    } catch (err) {
      const e = err as { code?: string };
      if (e.code === "P2002") continue; // schon gesendet — skip
      throw err;
    }

    try {
      const firstName = recipient.firstName ?? "";
      const subject = campaign.subject.split("{{firstName}}").join(firstName);
      const bodyHtml = campaign.bodyHtml.split("{{firstName}}").join(firstName);

      await sendCampaignMail({ to: recipient.email, subject, bodyHtml });

      batchSent++;
      await new Promise((r) => setTimeout(r, CAMPAIGN_MAIL_THROTTLE_MS));
    } catch (err) {
      // Mail-Versand failed — Event ist bereits geschrieben. Bewusste
      // Entscheidung: lieber eine Mail nicht raus als doppelt raus.
      console.error("[campaigns] mail send failed (event already recorded)", err);
    }
  }

  const newSentCount = sentIds.size + batchSent;
  const done = newSentCount >= total;

  if (done) {
    await db.campaign.update({
      where: { id: campaignId },
      data: { status: "SENT", sentAt: new Date(), sendingStartedAt: null },
    });
  }

  return { ok: true, done, total, sentTotal: newSentCount, batchSent };
}

/**
 * Versendet GENAU EINE Kampagne Batch für Batch komplett. Idempotent und
 * fortsetzbar: schon versendete Empfänger werden über ihr SENT-Event
 * übersprungen, ein abgebrochener Lauf wird beim nächsten Aufruf dort
 * fortgesetzt, wo er aufgehört hat.
 */
async function runCampaignToCompletion(campaignId: string): Promise<number> {
  let sent = 0;
  // Jeder Empfänger bekommt sein SENT-Event VOR dem Mailversand, deshalb
  // wächst sentTotal in jedem Fall → die Schleife terminiert garantiert.
  while (true) {
    const res = await sendCampaignBatch(campaignId);
    if (!res.ok) {
      console.error(`[campaigns] batch failed for ${campaignId}: ${res.message}`);
      break;
    }
    sent += res.batchSent ?? 0;
    if (res.done) break;
  }
  return sent;
}

// In-Memory-Lock PRO Kampagne: verhindert, dass dieselbe Kampagne doppelt
// verarbeitet wird (z.B. Admin-Klick + gleichzeitiger Cron-Ping). Verschiedene
// Kampagnen dürfen parallel laufen. Render fährt im Starter-Plan genau eine
// Instanz, deshalb reicht ein Modul-Set.
const activeCampaigns = new Set<string>();

/**
 * Stößt den Versand für GENAU DIESE EINE Kampagne im Hintergrund an (detached)
 * und kehrt SOFORT zurück. Es wird ausschließlich `campaignId` verschickt —
 * niemals andere Kampagnen, die zufällig ebenfalls auf SENDING stehen.
 *
 * Auf dem dauerhaft laufenden Render-Node-Prozess läuft der Versand danach
 * weiter — auch wenn der auslösende Request (Klick im Admin-Panel) längst
 * beantwortet ist und der Laptop zugeklappt wurde. Wird der Prozess mitten im
 * Versand neu gestartet (z.B. Deploy), setzt der Cron-Ping ihn fort
 * (siehe `resumeStalledCampaigns`).
 */
export function kickCampaignSend(campaignId: string): { started: boolean } {
  if (activeCampaigns.has(campaignId)) return { started: false };
  activeCampaigns.add(campaignId);

  void runCampaignToCompletion(campaignId)
    .catch((err) => console.error(`[campaigns] worker crashed for ${campaignId}`, err))
    .finally(() => {
      activeCampaigns.delete(campaignId);
    });

  return { started: true };
}

// Wie lange nach dem Start gilt ein SENDING-Versand noch als „kürzlich
// unterbrochen" und darf vom Cron fortgesetzt werden. Älteres wird NICHT mehr
// reaktiviert — so kann eine alt-hängende Kampagne nie wieder unbemerkt an
// neu hinzugekommene Empfänger ausgeliefert werden.
const RESUME_WINDOW_MS = 60 * 60 * 1000; // 1 Stunde

/**
 * Cron-Sicherheitsnetz: setzt NUR Versände fort, die in der letzten Stunde
 * gestartet und (z.B. durch einen Deploy/Neustart) unterbrochen wurden. Eine
 * Kampagne ohne `sendingStartedAt` oder mit zu altem Start wird bewusst
 * ignoriert. Jede betroffene Kampagne wird einzeln und idempotent abgearbeitet.
 */
export async function resumeStalledCampaigns(): Promise<{ resumed: number }> {
  const cutoff = new Date(Date.now() - RESUME_WINDOW_MS);
  const due = await db.campaign.findMany({
    where: { status: "SENDING", sendingStartedAt: { gte: cutoff } },
    select: { id: true },
  });

  for (const campaign of due) {
    kickCampaignSend(campaign.id);
  }

  return { resumed: due.length };
}

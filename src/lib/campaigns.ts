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
      data: { status: "SENT", sentAt: new Date() },
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
      data: { status: "SENDING" },
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
      data: { status: "SENT", sentAt: new Date() },
    });
  }

  return { ok: true, done, total, sentTotal: newSentCount, batchSent };
}

/**
 * Arbeitet alle fälligen Kampagnen (Status SENDING) Batch für Batch komplett
 * ab. Idempotent und fortsetzbar: schon versendete Empfänger werden über ihr
 * SENT-Event übersprungen, ein abgebrochener Lauf wird beim nächsten Aufruf
 * dort fortgesetzt, wo er aufgehört hat.
 */
export async function processAllDueCampaigns(): Promise<{
  processed: number;
  sent: number;
}> {
  const due = await db.campaign.findMany({
    where: { status: "SENDING" },
    select: { id: true },
  });

  let sent = 0;
  for (const campaign of due) {
    try {
      // Jeder Empfänger bekommt sein SENT-Event VOR dem Mailversand, deshalb
      // wächst sentTotal in jedem Fall → die Schleife terminiert garantiert.
      while (true) {
        const res = await sendCampaignBatch(campaign.id);
        if (!res.ok) {
          console.error(`[campaigns] batch failed for ${campaign.id}: ${res.message}`);
          break;
        }
        sent += res.batchSent ?? 0;
        if (res.done) break;
      }
    } catch (err) {
      console.error(`[campaigns] worker error for ${campaign.id}`, err);
    }
  }

  return { processed: due.length, sent };
}

// In-Memory-Lock: verhindert parallele Worker auf derselben Instanz. Render
// fährt im Starter-Plan genau eine Instanz, deshalb reicht ein Modul-Flag.
let campaignWorkerActive = false;

/**
 * Stößt den Kampagnen-Worker im Hintergrund an (detached) und kehrt SOFORT
 * zurück. Auf dem dauerhaft laufenden Render-Node-Prozess läuft der Versand
 * danach weiter — auch wenn der auslösende Request (Klick im Admin-Panel oder
 * Cron-Ping) längst beantwortet ist und der Laptop zugeklappt wurde.
 *
 * Wird der Prozess mitten im Versand neu gestartet (z.B. Deploy), setzt der
 * nächste Cron-Ping den Versand idempotent fort.
 */
export function kickCampaignWorker(): { started: boolean } {
  if (campaignWorkerActive) return { started: false };
  campaignWorkerActive = true;

  void processAllDueCampaigns()
    .catch((err) => console.error("[campaigns] worker crashed", err))
    .finally(() => {
      campaignWorkerActive = false;
    });

  return { started: true };
}

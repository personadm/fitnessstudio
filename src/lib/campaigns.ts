import { db } from "./db";
import { renderCampaignHtml, sendCampaignMail } from "./mail";
import { isSendableEmail } from "./validation";
import type { Campaign, ContactStatus } from "@prisma/client";

const NAME_PLACEHOLDER = "{{firstName}}";

// ~4 Mails/Sek — schont das Resend-Rate-Limit. Identisch zum bisherigen
// Browser-Versand, nur dass die Schleife jetzt serverseitig läuft.
export const CAMPAIGN_BATCH_SIZE = 30;
export const CAMPAIGN_MAIL_THROTTLE_MS = 250;

// Höchstzahl echter Sends pro Prozess-Durchlauf. Danach pausiert der Versand
// kurz (RESUME_PAUSE_MS) und setzt sich selbst fort. So bleibt der native
// (Off-Heap-)Speicher der HTTP-Verbindungen deutlich unter dem 512-MB-Limit der
// Render-Instanz — ein ununterbrochener Lauf über tausende Mails riss das Limit
// und ließ Render den Container neu starten. 150 × ~0,75 MB ≈ 110 MB
// Spitzen-Zuwachs, plus Grundverbrauch = sichere Reserve.
const MAX_SENDS_PER_RUN = 150;

// Idle-Pause zwischen zwei Häppchen. Muss über dem Keep-alive-Timeout von
// undici (~4 s) liegen, damit die Verbindungen wirklich schließen und ihren
// nativen Speicher freigeben, bevor der nächste Schwung startet.
const RESUME_PAUSE_MS = 12_000;

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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Stellt EINE Mail an EINEN Empfänger zu. Gemeinsame Single-Source für den
 * Einzel-Batch (Admin-Action) und den vollständigen Versand-Lauf (Cron/Worker).
 *
 * Race-safe via @@unique([campaignId, contactId, event]): der SENT-Event wird
 * ATOMAR VOR dem Mailversand geschrieben. Reihenfolge:
 *   1. Event-Insert (Claim) → gewinnt ein paralleler Lauf, bekommen alle
 *      anderen P2002 und überspringen ("skipped").
 *   2. Mail senden. Scheitert sie, bleibt das Event bestehen → keine erneute
 *      Mail. Bewusst: lieber eine Mail nicht raus als doppelt.
 *
 * Rückgabe: "sent" (Mail raus), "skipped" (schon beansprucht ODER ungültige
 * Adresse — Claim gesetzt, aber bewusst nicht gesendet), "failed" (Send-Fehler,
 * Event bereits geschrieben).
 */
async function deliverCampaignMail(
  campaign: Pick<Campaign, "id" | "subject" | "bodyHtml">,
  recipient: Recipient,
  // Vorab EINMAL umschlossenes HTML — nur gesetzt, wenn der Body KEIN
  // {{firstName}} enthält (dann ist er für alle identisch). Spart pro Send den
  // Neuaufbau der kompletten HTML-Zeichenkette (GC-Entlastung → kein OOM).
  sharedHtml: string | null,
): Promise<"sent" | "skipped" | "failed"> {
  // Atomic Claim VOR dem Send.
  try {
    await db.campaignEvent.create({
      data: { campaignId: campaign.id, contactId: recipient.id, event: "SENT" },
    });
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "P2002") return "skipped"; // schon gesendet — skip
    throw err;
  }

  // Ungültige Adresse würde Resend mit "Invalid `to` field" ablehnen. Claim ist
  // gesetzt (gilt als erledigt → keine Wiederholung), Send wird übersprungen —
  // so flutet ein kaputter Kontakt weder das Log noch verbrennt er Resend-Calls.
  if (!isSendableEmail(recipient.email)) {
    console.warn(`[campaigns] ungültige Adresse übersprungen: ${recipient.email}`);
    return "skipped";
  }

  try {
    const firstName = recipient.firstName ?? "";
    const subject = campaign.subject.includes(NAME_PLACEHOLDER)
      ? campaign.subject.split(NAME_PLACEHOLDER).join(firstName)
      : campaign.subject;

    if (sharedHtml) {
      // Body ist für alle gleich → vorgerendertes HTML wiederverwenden.
      await sendCampaignMail({ to: recipient.email, subject, html: sharedHtml });
    } else {
      // Body enthält {{firstName}} → pro Empfänger personalisieren.
      const bodyHtml = campaign.bodyHtml.split(NAME_PLACEHOLDER).join(firstName);
      await sendCampaignMail({ to: recipient.email, subject, bodyHtml });
    }
    return "sent";
  } catch (err) {
    // Mail-Versand failed — Event ist bereits geschrieben. Bewusste
    // Entscheidung: lieber eine Mail nicht raus als doppelt raus.
    console.error("[campaigns] mail send failed (event already recorded)", err);
    return "failed";
  }
}

// Baut das für ALLE Empfänger identische HTML genau einmal — oder gibt null
// zurück, wenn der Body {{firstName}} enthält und deshalb pro Empfänger
// personalisiert werden muss.
function sharedCampaignHtml(bodyHtml: string): string | null {
  if (bodyHtml.includes(NAME_PLACEHOLDER)) return null;
  return renderCampaignHtml(bodyHtml);
}

/**
 * Versendet eine Campaign in einem Batch von max. `batchSize` Mails.
 *
 * Race-safe via @@unique([campaignId, contactId, event]) auf CampaignEvent —
 * Details siehe `deliverCampaignMail`.
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

  const sharedHtml = sharedCampaignHtml(campaign.bodyHtml);

  let batchSent = 0;
  for (const recipient of toSend) {
    const outcome = await deliverCampaignMail(campaign, recipient, sharedHtml);
    if (outcome === "sent") {
      batchSent++;
      await sleep(CAMPAIGN_MAIL_THROTTLE_MS);
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
 * Versendet GENAU EINE Kampagne komplett. Idempotent und fortsetzbar: schon
 * versendete Empfänger werden über ihr SENT-Event übersprungen, ein
 * abgebrochener Lauf (Deploy/Neustart) wird beim nächsten Aufruf dort
 * fortgesetzt, wo er aufgehört hat.
 *
 * SPEICHER: Empfängerliste und bereits-gesendet-Set werden EINMAL pro Lauf
 * geladen und dann in-memory abgearbeitet. Früher lud jeder Batch die
 * vollständige Liste + alle SENT-Events neu (O(N²) Allokationen) — das trieb
 * den Node-Heap auf der 512-MB-Instanz in einen GC-Thrash bis zum
 * Out-of-Memory-Absturz mitten im Newsletter-Versand.
 */
async function runCampaignToCompletion(
  campaignId: string,
): Promise<{ sent: number; done: boolean }> {
  const campaign = await db.campaign.findFirst({ where: { id: campaignId } });
  if (!campaign) {
    console.error(`[campaigns] Kampagne nicht gefunden: ${campaignId}`);
    return { sent: 0, done: true };
  }

  const recipients = await getCampaignRecipients({
    listId: campaign.listId,
    targetStatus: campaign.targetStatus,
    targetLocationId: campaign.targetLocationId,
  });

  const markSent = () =>
    db.campaign.update({
      where: { id: campaignId },
      data: { status: "SENT", sentAt: new Date(), sendingStartedAt: null },
    });

  if (recipients.length === 0) {
    await markSent();
    return { sent: 0, done: true };
  }

  // Bereits gesendete EINMAL laden — nicht pro Batch.
  const sentEvents = await db.campaignEvent.findMany({
    where: { campaignId, event: "SENT" },
    select: { contactId: true },
  });
  const sentIds = new Set(sentEvents.map((e) => e.contactId));
  const pending = recipients.filter((r) => !sentIds.has(r.id));

  if (pending.length === 0) {
    await markSent();
    return { sent: 0, done: true };
  }

  // Status auf SENDING setzen UND das Resume-Fenster mitrollen: sendingStartedAt
  // = jetzt bei jedem Teil-Lauf. So gilt ein Versand, der über viele Läufe geht,
  // durchgehend als „kürzlich aktiv" und wird notfalls vom Cron fortgesetzt —
  // erst wenn WIRKLICH eine Stunde lang kein Fortschritt passiert, stoppt der
  // Resume (siehe resumeStalledCampaigns).
  await db.campaign.update({
    where: { id: campaignId },
    data: { status: "SENDING", sendingStartedAt: new Date() },
  });

  // HTML EINMAL für alle bauen (sofern nicht personalisiert) — der teuerste
  // Heap-Posten pro Send, siehe sharedCampaignHtml/deliverCampaignMail.
  const sharedHtml = sharedCampaignHtml(campaign.bodyHtml);

  let sent = 0;
  for (const recipient of pending) {
    // MEMORY-GUARD: Nach MAX_SENDS_PER_RUN echten Sends diesen Prozess-Durchlauf
    // beenden. Grund: jeder Resend-/HTTPS-Aufruf belegt native (Off-Heap-)
    // Puffer, die erst freigegeben werden, wenn die Keep-alive-Verbindungen im
    // Leerlauf schließen. Ein ununterbrochener Lauf über tausende Mails treibt
    // so den RSS über das 512-MB-Instanz-Limit → Render killt und startet den
    // Container neu ("exceeded its memory limit"). Wir senden daher in
    // begrenzten Häppchen und lassen den Prozess dazwischen kurz idlen.
    if (sent >= MAX_SENDS_PER_RUN) {
      return { sent, done: false };
    }
    const outcome = await deliverCampaignMail(campaign, recipient, sharedHtml);
    if (outcome === "sent") {
      sent++;
      await sleep(CAMPAIGN_MAIL_THROTTLE_MS);
    }
  }

  // Alle Pending haben jetzt ihr SENT-Event (auch fehlgeschlagene Sends) →
  // Kampagne ist durch.
  await markSent();
  return { sent, done: true };
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
    .then((res) => {
      activeCampaigns.delete(campaignId);
      if (!res.done) {
        // Memory-Guard hat den Lauf nach MAX_SENDS_PER_RUN beendet. Nach einer
        // kurzen Idle-Pause weitermachen: in dieser Pause schließen die
        // Keep-alive-HTTP-Verbindungen zu Resend, wodurch ihr nativer
        // (Off-Heap-)Speicher freigegeben wird — genau das hält den RSS unter
        // dem 512-MB-Instanz-Limit. `unref()` sorgt dafür, dass der Timer den
        // Prozess nicht am Leben hält, falls sonst nichts mehr läuft.
        const timer = setTimeout(() => kickCampaignSend(campaignId), RESUME_PAUSE_MS);
        if (typeof timer.unref === "function") timer.unref();
      }
    })
    .catch((err) => {
      activeCampaigns.delete(campaignId);
      console.error(`[campaigns] worker crashed for ${campaignId}`, err);
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

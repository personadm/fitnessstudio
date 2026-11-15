import { db } from "./db";
import { enrollIntoMatchingFunnels, triggerToStatus } from "./funnels";
import { CONTACT_EVENT } from "./contact-events";
import type { ContactStatus, Prisma } from "@prisma/client";

// ─────────────────────────────────────────────────────────────
// Statuswechsel PER HAND im Admin — inkl. Funnels
// ─────────────────────────────────────────────────────────────

/** Grund im Protokoll, wenn ein Funnel nach einem Widerruf neu startet. */
const RESTART_REASON_REVOCATION = "NEUKUNDE_TO_INTERESSENT";

type Tx = Prisma.TransactionClient;

// Prod läuft mit connection_limit=1 über den Supabase-Pooler: großzügig auf die
// Verbindung warten (läuft z. B. gerade ein Funnel-Lauf), statt nach 2 s
// (Prisma-Standard) abzubrechen.
const TX_OPTIONS = { maxWait: 10_000, timeout: 15_000 };

/**
 * Setzt den Status eines Kontakts per Hand (Admin) und zieht die Funnels nach:
 *
 * 1. Offene Funnels, die nicht mehr zum Status passen (autoStop), enden SOFORT —
 *    nicht erst beim nächsten Funnel-Lauf. Es geht keine weitere Mail daraus raus.
 * 2. Neukunde → Interessent (Widerruf, Vorgabe Erik 15.11.2026): der
 *    Interessenten-Funnel startet neu bei Mail 1 — auch wenn der Kontakt ihn
 *    früher schon bekommen hat. Der Wechsel zum Mitglied greift für ihn nicht
 *    mehr: er ist kein Neukunde mehr und sein Neukunden-Funnel ist abgebrochen.
 * 3. Passende Funnels, in denen der Kontakt noch nie war, starten wie bisher.
 *
 * Status, Protokoll, Beenden und Neustart laufen in EINER Transaktion: schlägt
 * etwas fehl, bleibt alles beim Alten und ein erneuter Klick versucht es wieder.
 * Bedingt auf den gelesenen Status → Doppelklick/zweiter Tab ändert nur einmal.
 *
 * Rückgabe: true, wenn der Status geändert wurde.
 */
export async function changeContactStatusManually(
  contactId: string,
  newStatus: ContactStatus,
): Promise<boolean> {
  const changed = await db.$transaction(async (tx) => {
    const previous = await tx.contact.findUnique({ where: { id: contactId }, select: { status: true } });
    if (!previous || previous.status === newStatus) return false;

    const { count } = await tx.contact.updateMany({
      where: { id: contactId, status: previous.status },
      data: {
        status: newStatus,
        ...(newStatus === "KUNDE" ? { memberSince: { set: new Date() } } : {}),
        ...(newStatus === "EHEMALIGER" ? { memberUntil: { set: new Date() } } : {}),
      },
    });
    if (count !== 1) return false;

    await tx.contactEvent.create({
      data: { contactId, type: CONTACT_EVENT.STATUS_CHANGED, meta: { from: previous.status, to: newStatus } },
    });
    await cancelNonMatchingEnrollments(tx, contactId, newStatus);
    if (previous.status === "NEUKUNDE" && newStatus === "INTERESSENT") {
      await restartMatchingFunnels(tx, contactId, newStatus, RESTART_REASON_REVOCATION);
    }
    return true;
  }, TX_OPTIONS);

  // Noch nie betretene, passende Funnels starten. Idempotent; schlägt es fehl,
  // holt der globale Funnel-Lauf die Einschreibung nach.
  if (changed) await enrollIntoMatchingFunnels(contactId, newStatus);
  return changed;
}

async function cancelNonMatchingEnrollments(tx: Tx, contactId: string, status: ContactStatus): Promise<void> {
  const openEnrollments = await tx.funnelEnrollment.findMany({
    where: { contactId, completedAt: null, cancelledAt: null },
    select: { id: true, funnel: { select: { id: true, name: true, trigger: true, autoStop: true } } },
  });
  const stale = openEnrollments.filter(
    (e) => e.funnel.autoStop && triggerToStatus(e.funnel.trigger) !== status,
  );
  for (const e of stale) {
    // Bedingt auf „noch offen" → hat ein paralleler Funnel-Lauf sie schon
    // beendet, wird sie nicht doppelt beendet/protokolliert.
    const { count } = await tx.funnelEnrollment.updateMany({
      where: { id: e.id, completedAt: null, cancelledAt: null },
      data: { cancelledAt: new Date(), cancelReason: "STATUS_CHANGED" },
    });
    if (count === 0) continue;
    await tx.contactEvent.create({
      data: {
        contactId,
        type: "FUNNEL_CANCELLED",
        meta: { funnelId: e.funnel.id, funnelName: e.funnel.name, reason: "STATUS_CHANGED" },
      },
    });
  }
}

/**
 * Startet die zum Status passenden Funnels neu, in denen der Kontakt schon
 * einmal war. Die bisherigen Versand-Markierungen werden entfernt (sonst hält
 * die Doppel-Mail-Sperre pro Enrollment+Schritt die Mails zurück) und vorher
 * als FUNNEL_RESTARTED im Kontakt-Protokoll festgehalten.
 */
async function restartMatchingFunnels(
  tx: Tx,
  contactId: string,
  status: ContactStatus,
  reason: string,
): Promise<void> {
  const contact = await tx.contact.findUnique({
    where: { id: contactId },
    select: { locationId: true, newsletterOnly: true },
  });
  if (!contact || contact.newsletterOnly) return;

  const funnels = await tx.funnel.findMany({
    where: { active: true },
    select: { id: true, name: true, trigger: true, locationId: true },
  });
  const matching = funnels.filter(
    (f) =>
      triggerToStatus(f.trigger) === status &&
      (!f.locationId || f.locationId === contact.locationId),
  );

  for (const funnel of matching) {
    const previous = await tx.funnelEnrollment.findFirst({
      where: { funnelId: funnel.id, contactId },
      include: { events: { include: { step: { select: { orderNum: true, subject: true } } } } },
    });
    if (!previous) continue; // noch nie drin → normale Einschreibung danach

    await tx.contactEvent.create({
      data: {
        contactId,
        type: "FUNNEL_RESTARTED",
        meta: {
          funnelId: funnel.id,
          funnelName: funnel.name,
          reason,
          previousStartedAt: previous.startedAt.toISOString(),
          previousCompletedAt: previous.completedAt?.toISOString() ?? null,
          previousCancelledAt: previous.cancelledAt?.toISOString() ?? null,
          previousCancelReason: previous.cancelReason,
          previousSteps: previous.events
            .map((e) => ({
              orderNum: e.step.orderNum,
              subject: e.step.subject,
              sentAt: e.sentAt.toISOString(),
              skipped: e.skipped,
            }))
            .sort((a, b) => a.orderNum - b.orderNum),
        },
      },
    });
    await tx.funnelStepEvent.deleteMany({ where: { enrollmentId: previous.id } });
    await tx.funnelEnrollment.update({
      where: { id: previous.id },
      data: { startedAt: new Date(), completedAt: null, cancelledAt: null, cancelReason: null },
    });
  }
}

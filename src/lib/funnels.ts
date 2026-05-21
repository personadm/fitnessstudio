import { db } from "./db";
import { sendFunnelMail } from "./mail";
import type { ContactStatus, FunnelTrigger } from "@prisma/client";

const STUDIO_URL = process.env.STUDIO_URL ?? "http://localhost:3000";

function triggerToStatus(t: FunnelTrigger): ContactStatus {
  return t as unknown as ContactStatus;
}

function renderTemplate(
  template: string,
  contact: { firstName: string | null; lastName: string | null },
): string {
  return template
    .split("{{firstName}}")
    .join(contact.firstName ?? "")
    .split("{{lastName}}")
    .join(contact.lastName ?? "");
}

/**
 * Stellt sicher dass der Kontakt einen unsubscribeToken hat.
 * Hintergrund: bestehende Kontakte (vor diesem Feature) haben keinen Token.
 * Bei jedem Mail-Versand wird das hier per Backfill nachgeholt.
 *
 * Returns: gültiger Token-String, der für den Abmeldelink verwendet werden kann.
 */
async function ensureUnsubscribeToken(contactId: string, existing: string | null): Promise<string> {
  if (existing) return existing;

  // Neuen Token via crypto generieren — Prisma's cuid() greift nur bei INSERT,
  // nicht bei UPDATE, daher manuell.
  const token = `unsub_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  await db.contact.update({
    where: { id: contactId },
    data: { unsubscribeToken: token },
  });
  return token;
}

let lastRunAt = 0;
const MIN_INTERVAL_MS = 5 * 60 * 1000;

export type ProcessResult = {
  skipped: boolean;
  reason?: string;
  enrolled?: number;
  sent?: number;
  cancelled?: number;
  completed?: number;
};

/**
 * Verarbeitet alle aktiven Funnels:
 *  1. Trägt passende Kontakte ein (Status = Trigger; und falls Funnel
 *     auf einen Standort beschränkt ist, nur Kontakte an diesem Standort).
 *  2. Schickt fällige Schritte raus.
 *  3. Bricht Enrollments ab bei Statuswechsel oder Standort-Mismatch.
 *  4. Markiert Enrollments als completed wenn alle Schritte raus sind.
 */
export async function processFunnels(
  opts: { force?: boolean } = {},
): Promise<ProcessResult> {
  const now = Date.now();
  if (!opts.force && now - lastRunAt < MIN_INTERVAL_MS) {
    return { skipped: true, reason: "rate_limited" };
  }
  lastRunAt = now;

  let enrolled = 0;
  let sent = 0;
  let cancelled = 0;
  let completed = 0;

  const funnels = await db.funnel.findMany({
    where: { active: true },
    include: { steps: { orderBy: { orderNum: "asc" } } },
  });

  for (const funnel of funnels) {
    if (funnel.steps.length === 0) continue;

    const targetStatus = triggerToStatus(funnel.trigger);

    // 1. Neue Kontakte einschreiben
    const candidates = await db.contact.findMany({
      where: {
        status: targetStatus,
        // Standort-Filter: wenn Funnel an Standort gebunden, nur passende Kontakte
        ...(funnel.locationId ? { locationId: funnel.locationId } : {}),
        funnelEnrollments: {
          none: { funnelId: funnel.id },
        },
      },
      select: { id: true },
    });

    for (const c of candidates) {
      try {
        await db.funnelEnrollment.create({
          data: { funnelId: funnel.id, contactId: c.id },
        });
        await db.contactEvent.create({
          data: {
            contactId: c.id,
            type: "FUNNEL_ENROLLED",
            meta: { funnelId: funnel.id, funnelName: funnel.name },
          },
        });
        enrolled++;
      } catch (err) {
        console.warn("[funnels] enroll skip", err);
      }
    }

    // 2. Aktive Enrollments durchgehen
    const enrollments = await db.funnelEnrollment.findMany({
      where: {
        funnelId: funnel.id,
        completedAt: null,
        cancelledAt: null,
      },
      include: {
        contact: true,
        events: true,
      },
    });

    for (const enrollment of enrollments) {
      // Auto-Stop: Status verlassen?
      const statusMismatch =
        funnel.autoStop && enrollment.contact.status !== targetStatus;
      // Standort-Mismatch: Funnel ist an Standort gebunden,
      // Kontakt hat aber inzwischen anderen Standort.
      const locationMismatch =
        !!funnel.locationId &&
        enrollment.contact.locationId !== funnel.locationId;

      if (statusMismatch || locationMismatch) {
        const reason = locationMismatch ? "LOCATION_CHANGED" : "STATUS_CHANGED";
        await db.funnelEnrollment.update({
          where: { id: enrollment.id },
          data: { cancelledAt: new Date(), cancelReason: reason },
        });
        await db.contactEvent.create({
          data: {
            contactId: enrollment.contactId,
            type: "FUNNEL_CANCELLED",
            meta: { funnelId: funnel.id, funnelName: funnel.name, reason },
          },
        });
        cancelled++;
        continue;
      }

      const sentStepIds = new Set(enrollment.events.map((e) => e.stepId));
      const now = Date.now();
      const scheduleEnabled =
        funnel.scheduleWeekday !== null && funnel.scheduleWeekday !== undefined;
      const firstScheduled = scheduleEnabled
        ? nextWeekdayOccurrence(
            enrollment.startedAt,
            funnel.scheduleWeekday as number,
            funnel.scheduleHour,
            funnel.scheduleMinute,
          )
        : null;
      const elapsedMs = now - enrollment.startedAt.getTime();
      const elapsedHours = elapsedMs / (1000 * 60 * 60);

      for (const step of funnel.steps) {
        if (sentStepIds.has(step.id)) continue;

        let dueAt: number;
        if (scheduleEnabled && firstScheduled) {
          // Wochenplan: Schritt N = firstScheduled + (N-1) * Intervall * 7 Tage
          const stepIndex = step.orderNum - 1;
          dueAt =
            firstScheduled.getTime() +
            stepIndex * funnel.scheduleWeekInterval * 7 * 24 * 60 * 60 * 1000;
        } else {
          // Klassischer Modus: delayDays + delayHours nach Funnel-Start
          const requiredHours = step.delayDays * 24 + (step.delayHours ?? 0);
          dueAt = enrollment.startedAt.getTime() + requiredHours * 60 * 60 * 1000;
        }

        if (now < dueAt) break;

        // OPT-OUT CHECK: wenn der Kontakt sich abgemeldet hat, keine Mail mehr.
        // Wir markieren den Step trotzdem als "verarbeitet" damit der Funnel
        // nicht unendlich hier hängen bleibt — aber via Cancel-Mechanismus,
        // nicht via SENT.
        if (enrollment.contact.optedOutAt) {
          await db.funnelEnrollment.update({
            where: { id: enrollment.id },
            data: { cancelledAt: new Date(), cancelReason: "OPTED_OUT" },
          });
          await db.contactEvent.create({
            data: {
              contactId: enrollment.contactId,
              type: "FUNNEL_CANCELLED",
              meta: { funnelId: funnel.id, funnelName: funnel.name, reason: "OPTED_OUT" },
            },
          });
          cancelled++;
          break;
        }

        try {
          const subject = renderTemplate(step.subject, enrollment.contact);
          const bodyHtml = renderTemplate(step.bodyHtml, enrollment.contact);

          // Abmeldelink bauen — Token bei Bedarf nachgenerieren
          const token = await ensureUnsubscribeToken(
            enrollment.contactId,
            enrollment.contact.unsubscribeToken,
          );
          const unsubscribeUrl = `${STUDIO_URL}/abmelden?t=${token}`;

          await sendFunnelMail({
            to: enrollment.contact.email,
            subject,
            bodyHtml,
            unsubscribeUrl,
          });

          await db.funnelStepEvent.create({
            data: { enrollmentId: enrollment.id, stepId: step.id },
          });
          await db.contactEvent.create({
            data: {
              contactId: enrollment.contactId,
              type: "FUNNEL_STEP_SENT",
              meta: {
                funnelId: funnel.id,
                funnelName: funnel.name,
                stepId: step.id,
                subject,
              },
            },
          });

          sentStepIds.add(step.id);
          sent++;

          await new Promise((r) => setTimeout(r, 200));
        } catch (err) {
          console.error("[funnels] sending failed", err);
          break;
        }
      }

      if (sentStepIds.size >= funnel.steps.length) {
        await db.funnelEnrollment.update({
          where: { id: enrollment.id },
          data: { completedAt: new Date() },
        });
        completed++;
      }
    }
  }

  return { skipped: false, enrolled, sent, cancelled, completed };
}

/**
 * Wird sofort nach Status-Wechsel oder Anmeldung aufgerufen.
 * Schreibt den Kontakt in alle aktiven Funnels mit passendem Trigger
 * UND passendem Standort ein (oder ohne Standort-Restriktion).
 */
export async function enrollIntoMatchingFunnels(
  contactId: string,
  status: ContactStatus,
): Promise<void> {
  const trigger = status as unknown as FunnelTrigger;

  // Standort des Kontakts laden, um Standort-spezifische Funnels zu prüfen
  const contact = await db.contact.findUnique({
    where: { id: contactId },
    select: { locationId: true },
  });

  const funnels = await db.funnel.findMany({
    where: {
      trigger,
      active: true,
      // Funnel matcht wenn:
      // - Funnel hat keinen Standort (locationId: null) → matcht alle
      // - ODER Funnel-Standort = Kontakt-Standort
      OR: [
        { locationId: null },
        ...(contact?.locationId ? [{ locationId: contact.locationId }] : []),
      ],
    },
    select: { id: true, name: true },
  });

  for (const f of funnels) {
    const existing = await db.funnelEnrollment.findUnique({
      where: { funnelId_contactId: { funnelId: f.id, contactId } },
    });
    if (existing) continue;

    try {
      await db.funnelEnrollment.create({
        data: { funnelId: f.id, contactId },
      });
      await db.contactEvent.create({
        data: {
          contactId,
          type: "FUNNEL_ENROLLED",
          meta: { funnelId: f.id, funnelName: f.name },
        },
      });
    } catch (err) {
      console.warn("[funnels] enroll skip", err);
    }
  }
}

/**
 * Findet das nächste Vorkommen eines Wochentags ab/nach `after`.
 * targetWeekday: 0=So, 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr, 6=Sa (JS Date.getDay())
 * Wenn `after` am gewünschten Wochentag UND vor Uhrzeit → heute, sonst nächste Woche.
 */
export function nextWeekdayOccurrence(
  after: Date,
  targetWeekday: number,
  hour: number,
  minute: number,
): Date {
  const result = new Date(after);
  result.setHours(hour, minute, 0, 0);
  // Iteriere Tag für Tag, bis Wochentag passt UND result > after
  for (let i = 0; i < 8; i++) {
    if (result.getDay() === targetWeekday && result > after) return result;
    result.setDate(result.getDate() + 1);
  }
  return result;
}

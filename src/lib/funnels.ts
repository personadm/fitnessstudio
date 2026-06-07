import { db } from "./db";
import { sendFunnelMail } from "./mail";
import type { ContactStatus, FunnelTrigger } from "@prisma/client";

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

let lastRunAt = 0;
const MIN_INTERVAL_MS = 5 * 60 * 1000;

export type ProcessResult = {
  skipped: boolean;
  reason?: string;
  enrolled?: number;
  sent?: number;
  cancelled?: number;
  skippedSteps?: number;
};

/**
 * Berechnet den frühesten Sendezeitpunkt eines Schritts für eine Enrollment.
 *
 * Drei Modi:
 *   1) KLASSISCH (step.scheduleWeekday === null): genau `delayDays + delayHours`
 *      nach Funnel-Start.
 *   2) HYBRID (step.scheduleWeekday gesetzt): frühestens nach `delayDays +
 *      delayHours` nach Funnel-Start, dann nächster passender Wochentag um
 *      die konfigurierte Uhrzeit.
 *   3) LEGACY-WOCHENPLAN: wenn der Step keine eigenen Schedule-Felder hat,
 *      aber der Funnel funnel-weit auf Wochenplan steht, wird die alte
 *      Logik angewendet (alle Steps am gleichen Wochentag, Step N = Step 1
 *      + (N-1) * Wochen-Intervall). Wird bei der Migration eliminiert.
 */
function calculateDueAt(
  step: {
    orderNum: number;
    delayDays: number;
    delayHours: number | null;
    scheduleWeekday: number | null;
    scheduleHour: number | null;
    scheduleMinute: number | null;
  },
  enrollmentStartedAt: Date,
  funnelLegacy: {
    scheduleWeekday: number | null;
    scheduleWeekInterval: number;
    scheduleHour: number;
    scheduleMinute: number;
  },
): number {
  const baseDelayMs =
    (step.delayDays * 24 + (step.delayHours ?? 0)) * 60 * 60 * 1000;
  const earliestDueAt = enrollmentStartedAt.getTime() + baseDelayMs;

  // HYBRID: Step hat eigene Schedule-Felder
  if (step.scheduleWeekday !== null && step.scheduleWeekday !== undefined) {
    const earliestDate = new Date(earliestDueAt);
    return nextWeekdayOccurrence(
      earliestDate,
      step.scheduleWeekday,
      step.scheduleHour ?? 9,
      step.scheduleMinute ?? 0,
    ).getTime();
  }

  // LEGACY-WOCHENPLAN: Step hat keine eigenen Schedule-Felder,
  // aber Funnel ist im alten Wochenplan-Modus
  if (
    funnelLegacy.scheduleWeekday !== null &&
    funnelLegacy.scheduleWeekday !== undefined
  ) {
    const first = nextWeekdayOccurrence(
      enrollmentStartedAt,
      funnelLegacy.scheduleWeekday,
      funnelLegacy.scheduleHour,
      funnelLegacy.scheduleMinute,
    );
    const stepIndex = step.orderNum - 1;
    return (
      first.getTime() +
      stepIndex *
        funnelLegacy.scheduleWeekInterval *
        7 *
        24 *
        60 *
        60 *
        1000
    );
  }

  // KLASSISCH
  return earliestDueAt;
}

/**
 * Nächster passender Wochentag NACH einem gegebenen Datum.
 * Wenn das Datum bereits auf dem Wochentag liegt UND die Uhrzeit noch nicht
 * vorbei ist, wird dieser Tag zurückgegeben. Sonst der NÄCHSTE Wochentag X.
 */
function nextWeekdayOccurrence(
  earliest: Date,
  targetWeekday: number,
  hour: number,
  minute: number,
): Date {
  const result = new Date(earliest);
  result.setHours(hour, minute, 0, 0);

  const currentWeekday = result.getDay();
  let daysToAdd = (targetWeekday - currentWeekday + 7) % 7;

  // Wenn wir heute schon am Zielwochentag sind, aber die Uhrzeit verpasst haben
  // → eine Woche weiter
  if (daysToAdd === 0 && result.getTime() < earliest.getTime()) {
    daysToAdd = 7;
  }

  result.setDate(result.getDate() + daysToAdd);
  return result;
}

export async function processFunnels(): Promise<ProcessResult> {
  const now = Date.now();
  if (now - lastRunAt < MIN_INTERVAL_MS) {
    return { skipped: true, reason: "rate_limited" };
  }
  lastRunAt = now;

  await enrollIntoMatchingFunnels();
  const stats = await processFunnelsInner();
  return { skipped: false, ...stats };
}

async function enrollIntoMatchingFunnels(): Promise<number> {
  const funnels = await db.funnel.findMany({
    where: { active: true },
    select: { id: true, name: true, trigger: true, locationId: true },
  });

  let enrolled = 0;
  for (const funnel of funnels) {
    const targetStatus = triggerToStatus(funnel.trigger);
    const candidates = await db.contact.findMany({
      where: {
        status: targetStatus,
        ...(funnel.locationId ? { locationId: funnel.locationId } : {}),
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
      } catch {
        // unique constraint @@unique([funnelId, contactId]) → schon eingeschrieben, ok
      }
    }
  }
  return enrolled;
}

async function processFunnelsInner() {
  let sent = 0;
  let cancelled = 0;
  let skippedSteps = 0;

  const funnels = await db.funnel.findMany({
    where: { active: true },
    include: {
      steps: { orderBy: { orderNum: "asc" } },
    },
  });

  for (const funnel of funnels) {
    if (funnel.steps.length === 0) continue;

    const targetStatus = triggerToStatus(funnel.trigger);

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
      // Standort-Mismatch
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
      const nowMs = Date.now();

      const funnelLegacy = {
        scheduleWeekday: funnel.scheduleWeekday,
        scheduleWeekInterval: funnel.scheduleWeekInterval,
        scheduleHour: funnel.scheduleHour,
        scheduleMinute: funnel.scheduleMinute,
      };

      // ─────────────────────────────────────────────────────────
      // STEPS NACH dueAt SORTIEREN
      // ─────────────────────────────────────────────────────────
      // Wir berechnen pro Step die Fälligkeit für DIESE Enrollment und
      // sortieren danach. Damit funktioniert das `break` bei "noch nicht
      // fällig" korrekt, egal in welcher orderNum-Reihenfolge die Steps
      // angelegt wurden.
      const stepsWithDueAt = funnel.steps.map((step) => ({
        step,
        dueAt: calculateDueAt(step, enrollment.startedAt, funnelLegacy),
      }));
      stepsWithDueAt.sort((a, b) => a.dueAt - b.dueAt);

      // ─────────────────────────────────────────────────────────
      // SKIP-CHECK: welche Steps sind "historisch verspätet"?
      // ─────────────────────────────────────────────────────────
      // Wenn für diese Enrollment bereits ein zeitlich SPÄTERER Step
      // versendet wurde, dürfen frühere Steps NICHT mehr rausgehen.
      const skipStepIds = new Set<string>();
      let maxSentDueAt = -1;
      for (const { step, dueAt } of stepsWithDueAt) {
        if (sentStepIds.has(step.id) && dueAt > maxSentDueAt) {
          maxSentDueAt = dueAt;
        }
      }
      for (const { step, dueAt } of stepsWithDueAt) {
        if (sentStepIds.has(step.id)) continue;
        if (dueAt < maxSentDueAt) {
          skipStepIds.add(step.id);
        }
      }

      for (const { step, dueAt } of stepsWithDueAt) {
        if (sentStepIds.has(step.id)) continue;

        // SKIP: dieser Step liegt zeitlich vor einem bereits gesendeten Step
        if (skipStepIds.has(step.id)) {
          try {
            await db.funnelStepEvent.create({
              data: { enrollmentId: enrollment.id, stepId: step.id },
            });
          } catch (err) {
            console.warn("[funnels] skip-marker insert (ignored)", err);
          }
          await db.contactEvent
            .create({
              data: {
                contactId: enrollment.contactId,
                type: "FUNNEL_STEP_SKIPPED",
                meta: {
                  funnelId: funnel.id,
                  funnelName: funnel.name,
                  stepId: step.id,
                  subject: step.subject,
                  reason: "retroactive_earlier_step",
                },
              },
            })
            .catch((err) => {
              console.warn("[funnels] skip log failed (non-critical)", err);
            });
          sentStepIds.add(step.id);
          skippedSteps++;
          continue;
        }

        // Noch nicht fällig? → break (Steps sind sortiert, alle weiteren
        // sind ebenfalls noch nicht fällig)
        if (nowMs < dueAt) break;

        // → SENDEN
        try {
          const subject = renderTemplate(step.subject, enrollment.contact);
          const bodyHtml = renderTemplate(step.bodyHtml, enrollment.contact);

          await sendFunnelMail({
            to: enrollment.contact.email,
            subject,
            bodyHtml,
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
                stepOrderNum: step.orderNum,
                subject: step.subject,
              },
            },
          });

          sentStepIds.add(step.id);
          sent++;

          // Throttle gegen Resend-Rate-Limit (10/sek Pro-Plan, defensiv 8/sek)
          await sleep(125);
        } catch (err) {
          console.error("[funnels] send failed", err);
          break;
        }
      }

      // Enrollment komplett durchgelaufen?
      if (sentStepIds.size >= funnel.steps.length) {
        await db.funnelEnrollment.update({
          where: { id: enrollment.id },
          data: { completedAt: new Date() },
        });
      }
    }
  }

  return { sent, cancelled, skippedSteps };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

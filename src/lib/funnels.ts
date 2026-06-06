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

      // ─────────────────────────────────────────────────────────
      // STEPS NACH GESAMTZEIT SORTIEREN
      // ─────────────────────────────────────────────────────────
      // Prisma liefert Steps in orderNum-Reihenfolge. Wenn Tim aber
      // nachträglich einen Step mit kürzerer Wartezeit hinzufügt
      // (z.B. erst "1 Tag" mit orderNum=1, dann "3h" mit orderNum=2),
      // wäre die orderNum-Reihenfolge ≠ Zeit-Reihenfolge.
      //
      // Hier sortieren wir die Steps für DIESE Enrollment nach Gesamtzeit
      // aufsteigend → damit das `break` bei "noch nicht fällig" korrekt
      // bleibt. Wochenplan-Modus bleibt unverändert (orderNum-Reihenfolge).
      const stepsInTimeOrder = scheduleEnabled
        ? funnel.steps
        : [...funnel.steps].sort((a, b) => {
            const aTotal = a.delayDays * 24 + (a.delayHours ?? 0);
            const bTotal = b.delayDays * 24 + (b.delayHours ?? 0);
            return aTotal - bTotal;
          });

      // ─────────────────────────────────────────────────────────
      // SKIP-CHECK: welche Steps sind "historisch verspätet"?
      // ─────────────────────────────────────────────────────────
      // Wenn für diese Enrollment bereits ein zeitlich SPÄTERER Step
      // versendet wurde, dürfen frühere Steps NICHT mehr rausgehen.
      // Beispiel: Maria ist 5 Tage im Funnel, hat die "1 Tag"-Mail schon
      // bekommen. Tim fügt eine neue "3 Stunden"-Mail hinzu. Diese würde
      // rückwirkend bei Maria ankommen → unprofessionell, weil sie
      // zeitlich "vor" der schon erhaltenen Mail liegt.
      //
      // Solche Steps werden in skipStepIds gesammelt und unten in der
      // Send-Loop als "verarbeitet, aber keine Mail" markiert: ein
      // FunnelStepEvent wird angelegt (damit der Step beim nächsten Lauf
      // nicht erneut versucht wird), plus ein ContactEvent mit type
      // "FUNNEL_STEP_SKIPPED" für die Nachvollziehbarkeit.
      const skipStepIds = new Set<string>();
      if (!scheduleEnabled) {
        let maxSentHours = -1;
        for (const s of funnel.steps) {
          if (!sentStepIds.has(s.id)) continue;
          const total = s.delayDays * 24 + (s.delayHours ?? 0);
          if (total > maxSentHours) maxSentHours = total;
        }
        for (const step of funnel.steps) {
          if (sentStepIds.has(step.id)) continue;
          const stepTotal = step.delayDays * 24 + (step.delayHours ?? 0);
          if (stepTotal < maxSentHours) {
            skipStepIds.add(step.id);
          }
        }
      }

      for (const step of stepsInTimeOrder) {
        if (sentStepIds.has(step.id)) continue;

        // SKIP: dieser Step liegt zeitlich vor einem bereits gesendeten
        // Step für diese Enrollment. Atomar als "verarbeitet" markieren
        // und KEINE Mail rausschicken.
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
          continue;
        }

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

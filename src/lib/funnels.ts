import { db } from "./db";
import { sendFunnelMail } from "./mail";
import type { ContactStatus, FunnelTrigger } from "@prisma/client";

/**
 * FunnelTrigger und ContactStatus haben dieselben Werte
 * (INTERESSENT, NEUKUNDE, KUNDE, EHEMALIGER), sind aber
 * in Prisma getrennte Enums. Diese Funktion mapped zwischen ihnen.
 */
function triggerToStatus(t: FunnelTrigger): ContactStatus {
  return t as unknown as ContactStatus;
}

/**
 * Ersetzt die Platzhalter {{firstName}} und {{lastName}}
 * im Mail-Inhalt durch die echten Werte des Kontakts.
 */
function renderTemplate(
  template: string,
  contact: { firstName: string | null; lastName: string | null }
): string {
  return template
    .split("{{firstName}}")
    .join(contact.firstName ?? "")
    .split("{{lastName}}")
    .join(contact.lastName ?? "");
}

// In-Memory Rate-Limit. Reicht für Render mit einem einzigen Node-Prozess.
// Bei einem Neustart wird der Wert zurückgesetzt — das ist OK,
// weil die Verarbeitung idempotent ist.
let lastRunAt = 0;
const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 Minuten

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
 *  1. Trägt passende Kontakte (Status = Trigger) in noch nicht
 *     zugeordnete Funnels ein.
 *  2. Schickt fällige Schritte raus (delayDays seit Eintragung erreicht).
 *  3. Bricht Enrollments ab, wenn der Kontakt den Trigger-Status
 *     wieder verlässt und autoStop=true ist.
 *  4. Markiert Enrollments als completed, wenn alle Schritte raus sind.
 *
 * Rate-Limit: läuft maximal alle 5 Min. Mit force=true ignorieren.
 */
export async function processFunnels(
  opts: { force?: boolean } = {}
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

    // 1. Neue Kontakte einschreiben — alle, die den Status haben
    //    und in diesem Funnel noch keine Enrollment haben.
    const candidates = await db.contact.findMany({
      where: {
        status: targetStatus,
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
        // Race Condition: bereits eingeschrieben — egal
        console.warn("[funnels] enroll skip", err);
      }
    }

    // 2. Aktive Enrollments dieses Funnels durchgehen
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
      // Auto-Stop: hat der Kontakt den Trigger-Status verlassen?
      if (funnel.autoStop && enrollment.contact.status !== targetStatus) {
        await db.funnelEnrollment.update({
          where: { id: enrollment.id },
          data: {
            cancelledAt: new Date(),
            cancelReason: "STATUS_CHANGED",
          },
        });
        await db.contactEvent.create({
          data: {
            contactId: enrollment.contactId,
            type: "FUNNEL_CANCELLED",
            meta: {
              funnelId: funnel.id,
              funnelName: funnel.name,
              reason: "STATUS_CHANGED",
            },
          },
        });
        cancelled++;
        continue;
      }

      const sentStepIds = new Set(enrollment.events.map((e) => e.stepId));
      const elapsedMs = Date.now() - enrollment.startedAt.getTime();
      const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

      // Schritte in Reihenfolge prüfen
      for (const step of funnel.steps) {
        if (sentStepIds.has(step.id)) continue;
        if (elapsedDays < step.delayDays) break; // noch nicht fällig

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

          // Kleine Pause, um Resend-Rate nicht zu überlasten
          await new Promise((r) => setTimeout(r, 200));
        } catch (err) {
          console.error("[funnels] sending failed", err);
          // Nicht weitermachen — der nächste Lauf versucht es erneut.
          break;
        }
      }

      // Komplett durch?
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
 * Wird sofort nach einem Status-Wechsel oder einer Anmeldung aufgerufen.
 * Schreibt den Kontakt in alle aktiven Funnels mit passendem Trigger ein
 * (sofern noch nicht eingeschrieben). Tatsächliches Versenden passiert
 * dann beim nächsten processFunnels-Lauf.
 */
export async function enrollIntoMatchingFunnels(
  contactId: string,
  status: ContactStatus
): Promise<void> {
  const trigger = status as unknown as FunnelTrigger;
  const funnels = await db.funnel.findMany({
    where: { trigger, active: true },
    select: { id: true, name: true },
  });

  for (const f of funnels) {
    const existing = await db.funnelEnrollment.findUnique({
      where: { funnelId_contactId: { funnelId: f.id, contactId } },
    });
    if (existing) continue; // Wurde schon mal eingeschrieben — nicht doppelt

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
      // Race Condition — egal
      console.warn("[funnels] enroll skip", err);
    }
  }
}

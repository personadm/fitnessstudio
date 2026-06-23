import { db } from "./db";
import { sendFunnelMail } from "./mail";
import { calculateDueAt } from "./funnel-schedule";
import type { ContactStatus, FunnelTrigger } from "@prisma/client";

// Explizites Mapping statt Cast: FunnelTrigger und ContactStatus sind getrennte
// Prisma-Enums. Ein Cast würde stillschweigend brechen, falls sich die Enums je
// auseinanderentwickeln. Der Record erzwingt zur Compile-Zeit Vollständigkeit.
const TRIGGER_TO_STATUS: Record<FunnelTrigger, ContactStatus> = {
  INTERESSENT: "INTERESSENT",
  NEUKUNDE: "NEUKUNDE",
  KUNDE: "KUNDE",
  EHEMALIGER: "EHEMALIGER",
};

function triggerToStatus(t: FunnelTrigger): ContactStatus {
  return TRIGGER_TO_STATUS[t];
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

// Termin-Berechnung (calculateDueAt / nextWeekdayOccurrence) lebt jetzt in
// src/lib/funnel-schedule.ts — als reine, server-unabhängige Single-Source,
// die Versand-Engine UND Admin-Vorschau gemeinsam nutzen.

// ─────────────────────────────────────────────────────────────
// MAIN ENTRY: processFunnels({ force?: boolean })
// ─────────────────────────────────────────────────────────────
/**
 * Hauptverarbeitungs-Funktion. Wird vom Cron und vom manuellen
 * "Jetzt verarbeiten"-Button aufgerufen.
 *
 * Rate-Limit: alle 5 Minuten. Kann mit `{ force: true }` umgangen werden
 * (für manuelle Trigger aus der Admin-UI).
 */
export async function processFunnels(
  opts: { force?: boolean } = {},
): Promise<ProcessResult> {
  const nowMs = Date.now();
  if (!opts.force && nowMs - lastRunAt < MIN_INTERVAL_MS) {
    return { skipped: true, reason: "rate_limited" };
  }
  lastRunAt = nowMs;

  const enrolled = await enrollIntoMatchingFunnels();
  const stats = await processFunnelsInner();
  return { skipped: false, enrolled, ...stats };
}

// ─────────────────────────────────────────────────────────────
// ENROLLMENT: kann global ODER für einen spezifischen Kontakt aufgerufen werden
// ─────────────────────────────────────────────────────────────
/**
 * Schreibt Kontakte in passende Funnels ein.
 *
 * Zwei Aufruf-Modi:
 *   - Global (ohne Args): alle Kontakte werden geprüft. Wird vom Cron-Job
 *     und vom Funnel-Prozessor selbst aufgerufen.
 *   - Targeted (mit contactId + status): nur dieser eine Kontakt wird in
 *     passende Funnels eingeschrieben. Wird aus updateContactStatus +
 *     createClubContact aufgerufen — direkt nach Status-Wechsel.
 *
 * Returnt: Anzahl der neuen Enrollments.
 */
export async function enrollIntoMatchingFunnels(
  contactId?: string,
  status?: ContactStatus | FunnelTrigger,
): Promise<number> {
  const funnels = await db.funnel.findMany({
    where: { active: true },
    select: { id: true, name: true, trigger: true, locationId: true },
  });

  let enrolled = 0;

  // ── TARGETED: nur ein spezifischer Kontakt ──
  if (contactId && status) {
    const contact = await db.contact.findUnique({
      where: { id: contactId },
      select: { id: true, locationId: true },
    });
    if (!contact) return 0;

    for (const funnel of funnels) {
      const targetStatus = triggerToStatus(funnel.trigger);
      if (status !== targetStatus) continue;
      if (funnel.locationId && contact.locationId !== funnel.locationId) continue;

      // Schon eingeschrieben? → überspringen, statt einen INSERT zu provozieren,
      // den @@unique([funnelId, contactId]) ablehnt. Sonst loggt Prisma jedes Mal
      // eine prisma:error-Zeile, obwohl der catch den Fehler verschluckt.
      const existing = await db.funnelEnrollment.findFirst({
        where: { funnelId: funnel.id, contactId: contact.id },
        select: { id: true },
      });
      if (existing) continue;

      try {
        await db.funnelEnrollment.create({
          data: { funnelId: funnel.id, contactId: contact.id },
        });
        await db.contactEvent.create({
          data: {
            contactId: contact.id,
            type: "FUNNEL_ENROLLED",
            meta: { funnelId: funnel.id, funnelName: funnel.name },
          },
        });
        enrolled++;
      } catch {
        // @@unique([funnelId, contactId]) → schon eingeschrieben, ok
      }
    }
    return enrolled;
  }

  // ── GLOBAL: alle passenden Kontakte ──
  for (const funnel of funnels) {
    const targetStatus = triggerToStatus(funnel.trigger);
    const candidates = await db.contact.findMany({
      where: {
        status: targetStatus,
        ...(funnel.locationId ? { locationId: funnel.locationId } : {}),
      },
      select: { id: true },
    });

    // Bereits eingeschriebene Kontakte vorab sammeln → wir versuchen gar nicht
    // erst einen INSERT, den @@unique([funnelId, contactId]) ablehnt. Sonst
    // loggt Prisma pro schon-eingeschriebenem Kontakt eine prisma:error-Zeile
    // (Log-Flut bei jedem Cron-Lauf), obwohl der catch sie verschluckt.
    const existing = await db.funnelEnrollment.findMany({
      where: {
        funnelId: funnel.id,
        contactId: { in: candidates.map((c) => c.id) },
      },
      select: { contactId: true },
    });
    const alreadyEnrolled = new Set(existing.map((e) => e.contactId));

    for (const c of candidates) {
      if (alreadyEnrolled.has(c.id)) continue;
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
        // schon eingeschrieben — ok
      }
    }
  }
  return enrolled;
}

// ─────────────────────────────────────────────────────────────
// INNERE LOOP: Mails versenden + Skip-Logik
// ─────────────────────────────────────────────────────────────
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
      // Opt-out: Abgemeldete Kontakte (optedOutAt gesetzt) erhalten NIE wieder
      // Funnel-Mails — rechtlich zwingend, unabhängig von autoStop. Enrollment
      // wird beendet, damit sie nicht erneut verarbeitet werden.
      if (enrollment.contact.optedOutAt) {
        await db.funnelEnrollment.update({
          where: { id: enrollment.id },
          data: { cancelledAt: new Date(), cancelReason: "OPTED_OUT" },
        });
        await db.contactEvent.create({
          data: {
            contactId: enrollment.contactId,
            type: "FUNNEL_CANCELLED",
            meta: {
              funnelId: funnel.id,
              funnelName: funnel.name,
              reason: "OPTED_OUT",
            },
          },
        });
        cancelled++;
        continue;
      }

      // Auto-Stop: Status verlassen?
      const statusMismatch =
        funnel.autoStop && enrollment.contact.status !== targetStatus;
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
      // STEPS NACH BERECHNETEM dueAt SORTIEREN
      // ─────────────────────────────────────────────────────────
      const stepsWithDueAt = funnel.steps.map((step) => ({
        step,
        dueAt: calculateDueAt(step, enrollment.startedAt, funnelLegacy),
      }));
      stepsWithDueAt.sort((a, b) => a.dueAt - b.dueAt);

      // ─────────────────────────────────────────────────────────
      // SKIP-CHECK
      // ─────────────────────────────────────────────────────────
      // Ein noch nicht gesendeter Step wird übersprungen (nur als erledigt
      // markiert, NICHT versendet), wenn für diese Enrollment bereits ein
      // zeitlich SPÄTERER Step versendet wurde ("retroactive_earlier_step") →
      // frühere dürfen dann nicht mehr rückwirkend raus.
      //
      // NACHTRÄGLICH hinzugefügte Steps werden NICHT mehr übersprungen: ihr
      // Sendezeitpunkt wird in calculateDueAt ab dem Erstell-Datum des Steps
      // gerechnet (nicht ab Eintragung), sodass Alt-Abonnenten sie zeitversetzt
      // normal nachgeliefert bekommen — statt sie ganz zu verlieren.
      const skipStepIds = new Map<string, string>();
      let maxSentDueAt = -1;
      for (const { step, dueAt } of stepsWithDueAt) {
        if (sentStepIds.has(step.id) && dueAt > maxSentDueAt) {
          maxSentDueAt = dueAt;
        }
      }
      for (const { step, dueAt } of stepsWithDueAt) {
        if (sentStepIds.has(step.id)) continue;
        if (dueAt < maxSentDueAt) {
          skipStepIds.set(step.id, "retroactive_earlier_step");
        }
      }

      for (const { step, dueAt } of stepsWithDueAt) {
        if (sentStepIds.has(step.id)) continue;

        // SKIP-Step: zeitlich vor einem bereits gesendeten
        if (skipStepIds.has(step.id)) {
          try {
            await db.funnelStepEvent.create({
              data: { enrollmentId: enrollment.id, stepId: step.id, skipped: true },
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
                  reason: skipStepIds.get(step.id) ?? "retroactive_earlier_step",
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

        // Noch nicht fällig? → break (Steps sind sortiert)
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

          // Throttle gegen Resend-Rate-Limit
          await sleep(125);
        } catch (err) {
          console.error("[funnels] send failed", err);
          break;
        }
      }

      // Enrollment komplett durch?
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

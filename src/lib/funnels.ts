import { db } from "./db";
import { sendFunnelMail } from "./mail";
import { calculateDueAt } from "./funnel-schedule";
import { isSendableEmail } from "./validation";
import { Prisma } from "@prisma/client";
import type { ContactStatus, FunnelTrigger } from "@prisma/client";

// Genau die Felder, die die Versand-Schleife braucht — bewusst schlank, damit
// pro Seite nur wenig im Speicher liegt (siehe Paginierung unten). Als
// expliziter Typ, sonst dreht Prismas Rückgabe-Inferenz mit dem `cursor`, der
// aus dem Ergebnis gelesen und wieder in die Query gesteckt wird, im Kreis
// (TS7022).
const ENROLLMENT_INCLUDE = {
  contact: {
    select: {
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      locationId: true,
      optedOutAt: true,
    },
  },
  events: { select: { stepId: true } },
} satisfies Prisma.FunnelEnrollmentInclude;

type PagedEnrollment = Prisma.FunnelEnrollmentGetPayload<{
  include: typeof ENROLLMENT_INCLUDE;
}>;

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

// E-Mail-Guard, der Resends `to`-Validierung vorwegnimmt — gemeinsame
// Single-Source in validation.ts (isSendableEmail). Verhindert, dass ein
// einzelner Kontakt mit leerer/kaputter Adresse den Step bei jedem Cron-Lauf
// endlos scheitern lässt (Resend: "Invalid `to` field").
const isValidEmail = isSendableEmail;

// Erkennt einen dauerhaften Resend-Validierungsfehler (kaputte Adresse o.ä.),
// der bei JEDEM erneuten Versuch wieder scheitern würde. Solche Fehler dürfen
// nicht als transient behandelt werden — sonst rollt der Claim endlos zurück
// und derselbe Send scheitert bei jedem Cron-Lauf aufs Neue (Log-Flut).
function isPermanentSendError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /validation_error|Invalid `to`|invalid.*email/i.test(msg);
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

// Wie viele offene Enrollments pro DB-Abfrage geladen werden. Deckelt den
// Speicher pro Funnel unabhängig von der Gesamt-Kontaktzahl (siehe
// Paginierung in processFunnelsInner).
const ENROLLMENT_PAGE_SIZE = 200;

// Überlappungs-Schutz: solange ein Lauf aktiv ist, steigt ein zweiter Aufruf
// sofort aus (auch force:true). Verhindert, dass parallele Cron-Pings — z.B.
// ein Retry, nachdem cron-job.org den ersten (langsamen) Aufruf als Timeout
// gewertet hat — dieselben fälligen Mails ein zweites Mal verschicken.
let isProcessing = false;

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

  // Läuft bereits ein Durchlauf? → nicht parallel starten. Schützt vor
  // Doppel-Versand durch überlappende (Retry-)Cron-Pings.
  if (isProcessing) {
    return { skipped: true, reason: "already_running" };
  }
  isProcessing = true;
  lastRunAt = nowMs;

  try {
    const enrolled = await enrollIntoMatchingFunnels();
    const stats = await processFunnelsInner();
    return { skipped: false, enrolled, ...stats };
  } finally {
    isProcessing = false;
  }
}

/**
 * Stößt den Funnel-Versand im Hintergrund an und kehrt SOFORT zurück.
 *
 * Für den Cron-Endpoint gedacht: cron-job.org bekommt umgehend eine Antwort
 * (kein 30s-Timeout → keine false-positive-Fehlschläge → keine
 * Auto-Deaktivierung des Jobs), während der eigentliche Versand auf dem
 * dauerhaften Render-Prozess weiterläuft. Der isProcessing-Guard in
 * processFunnels verhindert dabei überlappende Läufe.
 */
export function kickFunnelProcessing(): { triggered: boolean } {
  if (isProcessing) return { triggered: false };

  void processFunnels({ force: true }).catch((err) =>
    console.error("[funnels] background processing crashed", err),
  );
  return { triggered: true };
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
      select: { id: true, locationId: true, newsletterOnly: true },
    });
    if (!contact) return 0;
    // Nur-Newsletter-Kontakte werden nie in Funnels eingeschrieben.
    if (contact.newsletterOnly) return 0;

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
        // Nur-Newsletter-Kontakte werden nie in Funnels eingeschrieben.
        newsletterOnly: false,
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

    // SPEICHER: Enrollments werden NICHT mehr alle auf einmal geladen. Bei
    // mehreren tausend Kontakten war das include:{contact:true,events:true} über
    // alle offenen Enrollments ein einzelner großer Allocation-Block, der auf der
    // 512-MB-Instanz zusammen mit dem Next.js-Grundverbrauch den Heap sprengte
    // ("heap out of memory"). Stattdessen: Cursor-Pagination über die id in
    // Blöcken von ENROLLMENT_PAGE_SIZE + nur die tatsächlich genutzten Felder.
    // Vorwärts-Paginierung per `id > cursor` (NICHT Prismas cursor/skip): wir
    // setzen Zeilen im Lauf auf cancelled/completed, wodurch sie aus dem
    // WHERE-Filter fallen — ein Prisma-Cursor, der genau auf so eine Zeile
    // zeigt, könnte sich dann nicht mehr positionieren. `id > cursor` ist
    // dagegen rein wertbasiert und immer eindeutig vorwärts.
    let cursor: string | undefined = undefined;
    while (true) {
      const enrollments: PagedEnrollment[] = await db.funnelEnrollment.findMany({
        where: {
          funnelId: funnel.id,
          completedAt: null,
          cancelledAt: null,
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        include: ENROLLMENT_INCLUDE,
        orderBy: { id: "asc" },
        take: ENROLLMENT_PAGE_SIZE,
      });

      if (enrollments.length === 0) break;
      cursor = enrollments[enrollments.length - 1].id;

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

      // Ungültige/leere E-Mail: Resend würde den Send mit "Invalid `to` field"
      // ablehnen. Ohne diesen Guard rollt der Claim zurück und derselbe Step
      // scheitert bei JEDEM weiteren Cron-Lauf erneut (Log-Flut, hängt fest).
      // → Enrollment abbrechen, damit der Rest des Funnels sauber weiterläuft.
      if (!isValidEmail(enrollment.contact.email)) {
        await db.funnelEnrollment.update({
          where: { id: enrollment.id },
          data: { cancelledAt: new Date(), cancelReason: "INVALID_EMAIL" },
        });
        await db.contactEvent
          .create({
            data: {
              contactId: enrollment.contactId,
              type: "FUNNEL_CANCELLED",
              meta: {
                funnelId: funnel.id,
                funnelName: funnel.name,
                reason: "INVALID_EMAIL",
                email: enrollment.contact.email ?? null,
              },
            },
          })
          .catch((e) =>
            console.warn("[funnels] invalid-email log failed (non-critical)", e),
          );
        console.warn(
          `[funnels] enrollment ${enrollment.id} cancelled — invalid email:`,
          enrollment.contact.email,
        );
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

        // → SENDEN — CLAIM-BEFORE-SEND
        //
        // Erst das Step-Event atomar anlegen (race-safe via
        // @@unique([enrollmentId, stepId])), DANN die Mail verschicken.
        // Gewinnt ein paralleler Lauf den INSERT, bekommen alle anderen P2002
        // und überspringen OHNE zu senden — dieselbe Mail kann so nie mehrfach
        // rausgehen. (Vorher: erst senden, dann Event → überlappende Läufe
        // sendeten alle, bevor einer den Marker committen konnte → Duplikate.)
        try {
          await db.funnelStepEvent.create({
            data: { enrollmentId: enrollment.id, stepId: step.id },
          });
        } catch (err) {
          const e = err as { code?: string };
          if (e.code === "P2002") {
            // Anderer Lauf hat diesen Step schon beansprucht → nicht senden.
            sentStepIds.add(step.id);
            continue;
          }
          console.error("[funnels] step-claim insert failed", err);
          break;
        }

        try {
          const subject = renderTemplate(step.subject, enrollment.contact);
          const bodyHtml = renderTemplate(step.bodyHtml, enrollment.contact);

          await sendFunnelMail({
            to: enrollment.contact.email.trim(),
            subject,
            bodyHtml,
          });
        } catch (err) {
          // DAUERHAFTER Fehler (z.B. Resend "Invalid `to` field")? → würde bei
          // jedem Cron-Lauf erneut scheitern. Claim BEHALTEN (Step gilt als
          // erledigt, keine Wiederholung) und die Enrollment abbrechen, damit
          // der Kontakt nicht endlos den Log flutet und Resend-Calls verbrennt.
          if (isPermanentSendError(err)) {
            console.error(
              `[funnels] permanenter Send-Fehler — Enrollment ${enrollment.id} abgebrochen:`,
              err,
            );
            await db.funnelEnrollment
              .update({
                where: { id: enrollment.id },
                data: { cancelledAt: new Date(), cancelReason: "INVALID_EMAIL" },
              })
              .catch((e) => console.error("[funnels] cancel after permanent error failed", e));
            cancelled++;
            break;
          }

          // TRANSIENTER Fehler (Rate-Limit, Netzwerk …) → Claim zurückrollen,
          // damit der Step beim nächsten Lauf erneut versucht wird (kein
          // dauerhafter Verlust). Der Claim hat in der Zwischenzeit parallele
          // Doppel-Sends verhindert.
          console.error("[funnels] send failed — rolling back claim", err);
          await db.funnelStepEvent
            .deleteMany({ where: { enrollmentId: enrollment.id, stepId: step.id } })
            .catch((e) => console.error("[funnels] claim rollback failed", e));
          break;
        }

        // Aktivitäts-Log ist unkritisch fürs Dedup — Fehler hier nie eskalieren.
        await db.contactEvent
          .create({
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
          })
          .catch((e) => console.warn("[funnels] sent-log failed (non-critical)", e));

        sentStepIds.add(step.id);
        sent++;

        // Throttle gegen Resend-Rate-Limit
        await sleep(125);
      }

      // Enrollment komplett durch?
      if (sentStepIds.size >= funnel.steps.length) {
        await db.funnelEnrollment.update({
          where: { id: enrollment.id },
          data: { completedAt: new Date() },
        });
      }
      }

      // Weniger als eine volle Seite → alle offenen Enrollments dieses Funnels
      // sind abgearbeitet.
      if (enrollments.length < ENROLLMENT_PAGE_SIZE) break;
    }
  }

  return { sent, cancelled, skippedSteps };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

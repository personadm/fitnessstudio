import { db } from "./db";
import { sendFunnelMail } from "./mail";
import type { ContactStatus, FunnelTrigger } from "@prisma/client";

// ─────────────────────────────────────────────────────────────
// KONFIGURATION
// ─────────────────────────────────────────────────────────────

/// Name des globalen DB-Locks für processFunnels-Läufe.
const PROCESS_LOCK_NAME = "process_funnels";

/// TTL nach der der Lock automatisch verfällt — als Sicherheitsnetz
/// gegen abgestürzte Prozesse. Großzügig: ein Run mit 100 Mails
/// dauert ~15-30 Sek, also liegen 5 Min weit über dem Worst-Case.
const PROCESS_LOCK_TTL_MS = 5 * 60 * 1000;

/// Wie viele Mails maximal pro Lauf verschickt werden. Verhindert
/// dass Render-Container in den 60-100s Request-Timeout laufen.
/// Bei 1777 Enrollments × 1 Step: 18 Cron-Läufe à 5 Min = ~90 Min
/// bis alles raus ist. Lieber langsam und sicher als schnell und doppelt.
const MAX_MAILS_PER_RUN = 100;

/// Throttle zwischen Mails. Resend Pro erlaubt 10/Sek, wir bleiben mit
/// 125ms (= 8/Sek) defensiv darunter.
const MAIL_THROTTLE_MS = 125;

// ─────────────────────────────────────────────────────────────
// LOCK-MECHANISMUS
// ─────────────────────────────────────────────────────────────

/**
 * Versucht, einen named lock zu erwerben. Race-safe via atomic UPSERT-Pattern:
 *  1) updateMany mit Bedingung "expired" — wenn ein abgelaufener Lock da ist, übernehmen
 *  2) sonst INSERT — wenn keiner da ist, neuen anlegen
 *  3) wenn Lock noch gültig vergeben → false
 *
 * Beide Operationen sind atomar in Postgres. Bei parallelen Aufrufen
 * gewinnt genau EINER (entweder via updateMany count=1 oder via INSERT).
 */
async function acquireLock(name: string, ttlMs: number): Promise<boolean> {
  const now = new Date();
  const expires = new Date(now.getTime() + ttlMs);

  // 1) Falls vorhandener Lock abgelaufen ist → atomar übernehmen.
  //    updateMany ist atomic: nur eine parallele Operation gewinnt.
  const taken = await db.systemLock.updateMany({
    where: { id: name, expiresAt: { lt: now } },
    data: { acquiredAt: now, expiresAt: expires },
  });
  if (taken.count > 0) return true;

  // 2) Falls kein Lock existiert → atomar einfügen.
  //    Bei Race: unique-Constraint auf id sorgt dafür dass nur einer gewinnt.
  try {
    await db.systemLock.create({
      data: { id: name, acquiredAt: now, expiresAt: expires },
    });
    return true;
  } catch {
    // Lock existiert und ist noch gültig — anderer Prozess hält ihn.
    return false;
  }
}

async function releaseLock(name: string): Promise<void> {
  // Schluckt Fehler bewusst: wenn der Lock z.B. via TTL schon weg ist,
  // ist das ein OK-Zustand.
  await db.systemLock.delete({ where: { id: name } }).catch(() => undefined);
}

// ─────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────

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
 * Prüft ob ein Prisma-Fehler ein Unique-Constraint-Violation ist (P2002).
 * Genutzt um die "Step schon eingetragen"-Situation sauber zu erkennen.
 */
function isUniqueConstraintError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: string };
  return e.code === "P2002";
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

export type ProcessResult = {
  skipped: boolean;
  reason?: string;
  enrolled?: number;
  sent?: number;
  cancelled?: number;
  completed?: number;
  batchLimited?: boolean;
};

/**
 * Verarbeitet alle aktiven Funnels mit Race-Condition-Schutz auf zwei Ebenen:
 *
 *  Ebene 1 (Lock): Globaler DB-Lock verhindert parallele Läufe.
 *  Ebene 2 (Unique): Atomarer INSERT in FunnelStepEvent VOR dem Mail-Versand.
 *                    @@unique([enrollmentId, stepId]) garantiert dass jeder
 *                    Step pro Enrollment nur EINMAL als gesendet markiert
 *                    werden kann — und nur wer den INSERT gewinnt, sendet.
 *
 * Dadurch: selbst wenn der Lock z.B. nach Timeout ausläuft und zwei Läufe
 * doch parallel arbeiten, wird jede Mail nur EINMAL versendet.
 *
 * Plus: Batch-Limit von MAX_MAILS_PER_RUN verhindert dass ein einzelner
 * Lauf in Render-Timeouts läuft. Der nächste Run macht weiter wo dieser
 * aufgehört hat.
 */
export async function processFunnels(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _opts: { force?: boolean } = {},
): Promise<ProcessResult> {
  const locked = await acquireLock(PROCESS_LOCK_NAME, PROCESS_LOCK_TTL_MS);
  if (!locked) {
    return { skipped: true, reason: "already_running" };
  }

  try {
    return await processFunnelsInner();
  } finally {
    await releaseLock(PROCESS_LOCK_NAME);
  }
}

/**
 * Innere Verarbeitungslogik. Vorausgesetzt: globaler Lock ist gehalten.
 */
async function processFunnelsInner(): Promise<ProcessResult> {
  let enrolled = 0;
  let sent = 0;
  let cancelled = 0;
  let completed = 0;
  let batchLimited = false;

  const funnels = await db.funnel.findMany({
    where: { active: true },
    include: { steps: { orderBy: { orderNum: "asc" } } },
  });

  outer: for (const funnel of funnels) {
    if (funnel.steps.length === 0) continue;

    const targetStatus = triggerToStatus(funnel.trigger);

    // 1) Neue Kontakte einschreiben
    const candidates = await db.contact.findMany({
      where: {
        status: targetStatus,
        ...(funnel.locationId ? { locationId: funnel.locationId } : {}),
        funnelEnrollments: { none: { funnelId: funnel.id } },
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
        // Race oder unique-violation — überspringen
        console.warn("[funnels] enroll skip", err);
      }
    }

    // 2) Aktive Enrollments verarbeiten
    const enrollments = await db.funnelEnrollment.findMany({
      where: {
        funnelId: funnel.id,
        completedAt: null,
        cancelledAt: null,
      },
      include: { contact: true, events: true },
    });

    for (const enrollment of enrollments) {
      // Auto-Stop bei Status- oder Standort-Wechsel
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

      // ─────────────────────────────────────────────────────────
      // STEPS NACH GESAMTZEIT SORTIEREN
      // ─────────────────────────────────────────────────────────
      // Prisma liefert die Steps in orderNum-Reihenfolge. Wenn Tim aber
      // nachträglich einen Step mit kürzerer Wartezeit hinzufügt (z.B.
      // erst "1 Tag" mit orderNum=1, dann "3h" mit orderNum=2), wäre
      // die orderNum-Reihenfolge ≠ Zeit-Reihenfolge.
      //
      // Hier sortieren wir die Steps für DIESE Enrollment-Verarbeitung
      // nach Gesamtzeit aufsteigend → damit das `break` bei "noch nicht
      // fällig" korrekt bleibt. Wochenplan-Modus bleibt unverändert
      // (dort gilt orderNum-Reihenfolge weiter).
      const stepsInTimeOrder = scheduleEnabled
        ? funnel.steps
        : [...funnel.steps].sort((a, b) => {
            const aTotal = a.delayDays * 24 + (a.delayHours ?? 0);
            const bTotal = b.delayDays * 24 + (b.delayHours ?? 0);
            return aTotal - bTotal;
          });

      // ─────────────────────────────────────────────────────────
      // SKIP-CHECK: Welche Steps sind "historisch verspätet"?
      // ─────────────────────────────────────────────────────────
      // Wenn für diese Enrollment bereits ein zeitlich SPÄTERER Step
      // versendet wurde, dürfen frühere Steps NICHT mehr nachgesendet
      // werden. Beispiel: Maria ist 5 Tage im Funnel, hat die "1 Tag"-
      // Mail schon bekommen. Tim fügt jetzt eine "3 Stunden"-Mail hinzu.
      // Diese würde rückwirkend an Maria gehen → unprofessionell, weil
      // sie zeitlich "vor" der schon erhaltenen Mail liegt.
      //
      // Wir markieren solche Steps als "geskippt": ein FunnelStepEvent
      // wird angelegt (damit der Step nicht beim nächsten Lauf erneut
      // versucht wird), aber KEINE Mail geht raus. Plus ein ContactEvent
      // "FUNNEL_STEP_SKIPPED" für Nachvollziehbarkeit.
      const skipStepIds = new Set<string>();
      if (!scheduleEnabled) {
        const sentStepsWithTimes = funnel.steps
          .filter((s) => sentStepIds.has(s.id))
          .map((s) => ({
            id: s.id,
            totalHours: s.delayDays * 24 + (s.delayHours ?? 0),
          }));
        const maxSentHours = sentStepsWithTimes.reduce(
          (max, s) => Math.max(max, s.totalHours),
          -1,
        );
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

        // SKIP: dieser Step liegt zeitlich vor einem bereits gesendeten Step
        // für diese Enrollment. Atomar als "verarbeitet" markieren und
        // NICHT senden — siehe Skip-Check-Block oben.
        if (skipStepIds.has(step.id)) {
          try {
            await db.funnelStepEvent.create({
              data: { enrollmentId: enrollment.id, stepId: step.id },
            });
          } catch (err) {
            if (!isUniqueConstraintError(err)) {
              console.error("[funnels] skip-marker insert failed", err);
              continue;
            }
            // Bei P2002: anderer Lauf war schneller — ist OK, Step ist
            // jetzt auch dort als verarbeitet markiert.
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
              // Skip-Log ist nur informational — bei Fehler nicht abbrechen
              console.warn("[funnels] skip log failed (non-critical)", err);
            });
          sentStepIds.add(step.id);
          continue;
        }

        // Batch-Limit erreicht? → Rest dem nächsten Lauf überlassen.
        if (sent >= MAX_MAILS_PER_RUN) {
          batchLimited = true;
          break outer;
        }

        // Fälligkeit berechnen
        let dueAt: number;
        if (scheduleEnabled && firstScheduled) {
          const stepIndex = step.orderNum - 1;
          dueAt =
            firstScheduled.getTime() +
            stepIndex * funnel.scheduleWeekInterval * 7 * 24 * 60 * 60 * 1000;
        } else {
          const requiredHours = step.delayDays * 24 + (step.delayHours ?? 0);
          dueAt = enrollment.startedAt.getTime() + requiredHours * 60 * 60 * 1000;
        }

        if (now < dueAt) break;

        // ─────────────────────────────────────────────────────────
        // RACE-SAFE SEND-LOGIK
        // ─────────────────────────────────────────────────────────
        //
        // Schritt 1: Atomar Event eintragen. Wenn jemand parallel
        //            schon eingetragen hat → P2002 → skip (kein Send).
        //
        // Schritt 2: Mail verschicken. Wenn das fehlschlägt, bleibt
        //            das Event stehen. Bewusste Entscheidung:
        //            "Mail eventuell nicht raus" >> "Mail doppelt raus".
        //            User kann den Step manuell als Test neu schicken.
        // ─────────────────────────────────────────────────────────
        try {
          await db.funnelStepEvent.create({
            data: { enrollmentId: enrollment.id, stepId: step.id },
          });
        } catch (err) {
          if (isUniqueConstraintError(err)) {
            // Anderer Lauf hat diesen Step schon abgearbeitet — silently skip
            sentStepIds.add(step.id);
            continue;
          }
          // Anderer DB-Fehler → log + abbrechen für dieses Enrollment
          console.error("[funnels] step event insert failed", err);
          break;
        }

        // Erst nach erfolgreichem Event-Insert wird die Mail verschickt
        try {
          const subject = renderTemplate(step.subject, enrollment.contact);
          const bodyHtml = renderTemplate(step.bodyHtml, enrollment.contact);

          await sendFunnelMail({
            to: enrollment.contact.email,
            subject,
            bodyHtml,
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

          // Throttle für Resend Rate-Limit (max ~8 Mails/Sek)
          await new Promise((r) => setTimeout(r, MAIL_THROTTLE_MS));
        } catch (err) {
          // Mail-Versand fehlgeschlagen — Event ist bereits geschrieben.
          // Dieser Step zählt damit als "abgehakt" (kein Re-Send beim
          // nächsten Lauf). Das ist gewollt: lieber eine Mail die nicht
          // raus ist als drei Mails die raus sind.
          console.error(
            "[funnels] mail send failed (event already recorded — no retry)",
            err,
          );
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

  return {
    skipped: false,
    enrolled,
    sent,
    cancelled,
    completed,
    batchLimited,
  };
}

/**
 * Wird sofort nach Status-Wechsel oder Anmeldung aufgerufen.
 * Schreibt den Kontakt in alle aktiven Funnels mit passendem Trigger
 * UND passendem Standort ein.
 */
export async function enrollIntoMatchingFunnels(
  contactId: string,
  status: ContactStatus,
): Promise<void> {
  const trigger = status as unknown as FunnelTrigger;

  const contact = await db.contact.findUnique({
    where: { id: contactId },
    select: { locationId: true },
  });

  const funnels = await db.funnel.findMany({
    where: {
      trigger,
      active: true,
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
 *
 * WICHTIG ZUR ZEITZONE: nutzt setHours/getDay (Server-Lokalzeit).
 * Auf Render läuft der Container in UTC — damit Mittwoch 9:00 korrekt als
 * deutsche Zeit interpretiert wird, MUSS die ENV-Variable `TZ=Europe/Berlin`
 * im Render-Service gesetzt sein. Sonst geht Mi 9:00 als UTC raus = 11:00 MESZ.
 */
export function nextWeekdayOccurrence(
  after: Date,
  targetWeekday: number,
  hour: number,
  minute: number,
): Date {
  const result = new Date(after);
  result.setHours(hour, minute, 0, 0);
  for (let i = 0; i < 8; i++) {
    if (result.getDay() === targetWeekday && result > after) return result;
    result.setDate(result.getDate() + 1);
  }
  return result;
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  planSchema,
  campaignSchema,
  funnelSchema,
  funnelStepSchema,
  aiFunnelSchema,
  locationSchema,
  clubSignupSchema,
} from "@/lib/validation";
import { enrollIntoMatchingFunnels, processFunnels } from "@/lib/funnels";
import { getCampaignRecipients } from "@/lib/campaigns";
import { sendCampaignMail } from "@/lib/mail";
import type { ContactStatus, FunnelTrigger } from "@prisma/client";

async function requireAdmin(): Promise<{ userId: string }> {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  return { userId: s.userId };
}

/**
 * Parst einen optional gesetzten Integer aus FormData.
 * Returnt null bei leerem String, fehlendem Feld oder NaN.
 * Wird für Hybrid-Modus-Felder (scheduleWeekday/Hour/Minute) genutzt.
 */
function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

// ─────────────────────────────────────────────────────────────
// CONTACTS
// ─────────────────────────────────────────────────────────────

export async function updateContactStatus(contactId: string, newStatus: ContactStatus) {
  await requireAdmin();
  const previous = await db.contact.findFirst({
    where: { id: contactId },
    select: { status: true },
  });
  if (!previous) return;

  await db.contact.update({
    where: { id: contactId },
    data: {
      status: newStatus,
      ...(newStatus === "KUNDE" ? { memberSince: { set: new Date() } } : {}),
      ...(newStatus === "EHEMALIGER" ? { memberUntil: { set: new Date() } } : {}),
    },
  });
  await db.contactEvent.create({
    data: {
      contactId,
      type: "STATUS_CHANGED",
      meta: { from: previous.status, to: newStatus },
    },
  });

  await enrollIntoMatchingFunnels(contactId, newStatus);

  revalidatePath("/admin/contacts");
  revalidatePath(`/admin/contacts/${contactId}`);
}

export async function updateContactNotes(contactId: string, notes: string) {
  await requireAdmin();
  if (typeof notes !== "string" || notes.length > 10000) {
    throw new Error("Notiz ist zu lang (max. 10000 Zeichen).");
  }
  const owned = await db.contact.findFirst({ where: { id: contactId }, select: { id: true } });
  if (!owned) return;
  await db.contact.update({ where: { id: contactId }, data: { notes } });
  revalidatePath(`/admin/contacts/${contactId}`);
}

export async function updateContactLocation(contactId: string, locationId: string | null) {
  await requireAdmin();
  const owned = await db.contact.findFirst({ where: { id: contactId }, select: { id: true } });
  if (!owned) return;
  if (locationId) {
    const loc = await db.location.findFirst({ where: { id: locationId }, select: { id: true } });
    if (!loc) return;
  }
  await db.contact.update({
    where: { id: contactId },
    data: { locationId: locationId || null },
  });
  await db.contactEvent.create({
    data: {
      contactId,
      type: "LOCATION_CHANGED",
      meta: { locationId },
    },
  });
  revalidatePath(`/admin/contacts/${contactId}`);
  revalidatePath("/admin/contacts");
}

export async function deleteContact(contactId: string) {
  await requireAdmin();
  await db.contact.deleteMany({ where: { id: contactId } });
  revalidatePath("/admin/contacts");
  redirect("/admin/contacts");
}

export async function addContactToList(contactId: string, listId: string) {
  await requireAdmin();
  const [c, l] = await Promise.all([
    db.contact.findFirst({ where: { id: contactId }, select: { id: true } }),
    db.list.findFirst({ where: { id: listId }, select: { id: true } }),
  ]);
  if (!c || !l) return;
  await db.contactList.upsert({
    where: { contactId_listId: { contactId, listId } },
    update: {},
    create: { contactId, listId },
  });
  revalidatePath(`/admin/contacts/${contactId}`);
}

export async function removeContactFromList(contactId: string, listId: string) {
  await requireAdmin();
  const [c, l] = await Promise.all([
    db.contact.findFirst({ where: { id: contactId }, select: { id: true } }),
    db.list.findFirst({ where: { id: listId }, select: { id: true } }),
  ]);
  if (!c || !l) return;
  await db.contactList.delete({ where: { contactId_listId: { contactId, listId } } });
  revalidatePath(`/admin/contacts/${contactId}`);
}

// ─────────────────────────────────────────────────────────────
// LOCATIONS
// ─────────────────────────────────────────────────────────────

export async function saveLocation(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id") as string | null;
  const parsed = locationSchema.parse({
    name: formData.get("name"),
    street: formData.get("street") || "",
    postalCode: formData.get("postalCode") || "",
    city: formData.get("city") || "",
    phone: formData.get("phone") || "",
    email: formData.get("email") || "",
    active: formData.get("active") === "on",
    sortOrder: Number(formData.get("sortOrder") || 0),
  });

  const data = {
    name: parsed.name,
    street: parsed.street || null,
    postalCode: parsed.postalCode || null,
    city: parsed.city || null,
    phone: parsed.phone || null,
    email: parsed.email || null,
    active: parsed.active,
    sortOrder: parsed.sortOrder,
  };

  if (id) {
    await db.location.update({ where: { id }, data });
  } else {
    await db.location.create({ data });
  }
  revalidatePath("/admin/locations");
  redirect("/admin/locations");
}

export async function toggleLocationActive(locationId: string) {
  await requireAdmin();
  const loc = await db.location.findFirst({ where: { id: locationId } });
  if (!loc) return;
  await db.location.update({ where: { id: locationId }, data: { active: !loc.active } });
  revalidatePath("/admin/locations");
}

export async function deleteLocation(locationId: string) {
  await requireAdmin();
  await db.location.deleteMany({ where: { id: locationId } });
  revalidatePath("/admin/locations");
}

// ─────────────────────────────────────────────────────────────
// PRICING PLANS
// ─────────────────────────────────────────────────────────────

export async function savePlan(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id") as string | null;
  const highlights = (formData.get("highlights") as string)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  // Top-Highlights: aus dem Hidden-Input "topHighlights" (JSON-String) parsen.
  // Bei Parse-Fehler oder fehlendem Feld → leeres Array (Fallback im Frontend).
  let topHighlights: Array<{ text: string; subtitle: string; isGold: boolean }> = [];
  const rawTopHighlights = formData.get("topHighlights") as string | null;
  if (rawTopHighlights) {
    try {
      const parsed = JSON.parse(rawTopHighlights);
      if (Array.isArray(parsed)) {
        topHighlights = parsed
          .filter(
            (x) =>
              x && typeof x === "object" && typeof x.text === "string" && x.text.trim().length > 0,
          )
          .slice(0, 3)
          .map((x) => ({
            text: String(x.text).trim().slice(0, 120),
            subtitle: typeof x.subtitle === "string" ? x.subtitle.trim().slice(0, 120) : "",
            isGold: x.isGold === true,
          }));
      }
    } catch {
      // Bei Parse-Fehler einfach leer lassen
    }
  }

  const rawLocationId = formData.get("locationId") as string | null;

  const parsed = planSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || "",
    // Math.round verhindert IEEE-754-Artefakte (z.B. 19.99*100 = 1998.9999…),
    // die sonst an z.int() in planSchema scheitern.
    priceCents: Math.round(Number(formData.get("priceEur")) * 100),
    billingInterval: formData.get("billingInterval"),
    highlights,
    topHighlights,
    agb: formData.get("agb") || "",
    availableOnline: formData.get("availableOnline") === "on",
    availableOffline: formData.get("availableOffline") === "on",
    active: formData.get("active") === "on",
    sortOrder: Number(formData.get("sortOrder") || 0),
    locationId: rawLocationId || null,
  });

  const data = {
    name: parsed.name,
    description: parsed.description || null,
    priceCents: parsed.priceCents,
    billingInterval: parsed.billingInterval,
    highlights: parsed.highlights,
    topHighlights: parsed.topHighlights,
    agb: parsed.agb || null,
    availableOnline: parsed.availableOnline,
    availableOffline: parsed.availableOffline,
    active: parsed.active,
    sortOrder: parsed.sortOrder,
    locationId: parsed.locationId || null,
  };

  // Zugeordneter Standort (falls gesetzt) muss existieren.
  if (data.locationId) {
    const loc = await db.location.findFirst({
      where: { id: data.locationId },
      select: { id: true },
    });
    if (!loc) data.locationId = null;
  }

  if (id) {
    const owned = await db.pricingPlan.findFirst({ where: { id }, select: { id: true } });
    if (!owned) return;
    await db.pricingPlan.update({ where: { id }, data });
  } else {
    await db.pricingPlan.create({ data });
  }
  revalidatePath("/admin/plans");
  redirect("/admin/plans");
}

export async function togglePlanActive(planId: string) {
  await requireAdmin();
  const p = await db.pricingPlan.findFirst({ where: { id: planId } });
  if (!p) return;
  await db.pricingPlan.update({ where: { id: planId }, data: { active: !p.active } });
  revalidatePath("/admin/plans");
}

export async function deletePlan(planId: string) {
  await requireAdmin();
  const owned = await db.pricingPlan.findFirst({ where: { id: planId }, select: { id: true } });
  if (!owned) return;
  const inUse = await db.contact.count({ where: { pricingPlanId: planId } });
  if (inUse > 0) {
    await db.pricingPlan.update({ where: { id: planId }, data: { active: false } });
  } else {
    await db.pricingPlan.delete({ where: { id: planId } });
  }
  revalidatePath("/admin/plans");
}

// ─────────────────────────────────────────────────────────────
// LISTS
// ─────────────────────────────────────────────────────────────

export async function createList(formData: FormData) {
  await requireAdmin();
  const name = (formData.get("name") as string).trim();
  const description = ((formData.get("description") as string) || "").trim();
  if (!name) return;
  if (name.length > 200) throw new Error("Listenname ist zu lang (max. 200 Zeichen).");
  if (description.length > 1000)
    throw new Error("Beschreibung ist zu lang (max. 1000 Zeichen).");
  await db.list.create({ data: { name, description: description || null } });
  revalidatePath("/admin/lists");
}

export async function deleteList(listId: string) {
  await requireAdmin();
  await db.list.deleteMany({ where: { id: listId } });
  revalidatePath("/admin/lists");
}

// ─────────────────────────────────────────────────────────────
// CAMPAIGNS — neu mit Status+Standort-Targeting
// ─────────────────────────────────────────────────────────────

export async function createCampaign(formData: FormData) {
  await requireAdmin();

  const targetMode = (formData.get("targetMode") as string) || "LIST";
  const listIdRaw = formData.get("listId") as string | null;
  const targetStatusRaw = formData.get("targetStatus") as string | null;
  const targetLocationIdRaw = formData.get("targetLocationId") as string | null;

  const parsed = campaignSchema.parse({
    targetMode,
    listId: listIdRaw || null,
    targetStatus: targetStatusRaw || null,
    targetLocationId: targetLocationIdRaw || null,
    subject: formData.get("subject"),
    bodyHtml: formData.get("bodyHtml"),
  });

  const listId = parsed.targetMode === "LIST" ? parsed.listId : null;
  if (listId) {
    const l = await db.list.findFirst({ where: { id: listId }, select: { id: true } });
    if (!l) throw new Error("Liste nicht gefunden.");
  }
  let targetLocationId = parsed.targetLocationId || null;
  if (targetLocationId) {
    const loc = await db.location.findFirst({
      where: { id: targetLocationId },
      select: { id: true },
    });
    if (!loc) targetLocationId = null;
  }

  const c = await db.campaign.create({
    data: {
      listId,
      targetStatus: parsed.targetMode === "STATUS" ? parsed.targetStatus : null,
      targetLocationId,
      subject: parsed.subject,
      bodyHtml: parsed.bodyHtml,
      status: "DRAFT",
    },
  });
  revalidatePath("/admin/campaigns");
  redirect(`/admin/campaigns/${c.id}`);
}

export async function deleteCampaign(campaignId: string) {
  await requireAdmin();
  await db.campaign.deleteMany({ where: { id: campaignId } });
  revalidatePath("/admin/campaigns");
  redirect("/admin/campaigns");
}

// ─────────────────────────────────────────────────────────────
// FUNNELS — mit locationId
// ─────────────────────────────────────────────────────────────

export async function createFunnel(formData: FormData) {
  await requireAdmin();
  const locationIdRaw = formData.get("locationId") as string | null;
  const scheduleEnabled = formData.get("scheduleEnabled") === "on";
  const weekdayRaw = formData.get("scheduleWeekday");

  const parsed = funnelSchema.parse({
    name: formData.get("name"),
    trigger: formData.get("trigger"),
    active: formData.get("active") === "on",
    autoStop: formData.get("autoStop") === "on",
    locationId: locationIdRaw || null,
    scheduleWeekday: scheduleEnabled && weekdayRaw !== null && weekdayRaw !== "" ? weekdayRaw : null,
    scheduleWeekInterval: formData.get("scheduleWeekInterval") || 1,
    scheduleHour: formData.get("scheduleHour") || 9,
    scheduleMinute: formData.get("scheduleMinute") || 0,
  });

  let funnelLocationId = parsed.locationId || null;
  if (funnelLocationId) {
    const loc = await db.location.findFirst({
      where: { id: funnelLocationId },
      select: { id: true },
    });
    if (!loc) funnelLocationId = null;
  }

  const f = await db.funnel.create({
    data: {
      name: parsed.name,
      trigger: parsed.trigger,
      active: parsed.active,
      autoStop: parsed.autoStop,
      locationId: funnelLocationId,
      scheduleWeekday: parsed.scheduleWeekday ?? null,
      scheduleWeekInterval: parsed.scheduleWeekInterval,
      scheduleHour: parsed.scheduleHour,
      scheduleMinute: parsed.scheduleMinute,
    },
  });
  revalidatePath("/admin/funnels");
  redirect(`/admin/funnels/${f.id}`);
}

/**
 * Legt einen komplett von der KI generierten Funnel inkl. aller Schritte an.
 * Wird aus der KI-Vorschau (KiCreator) übernommen. Gibt die neue Funnel-ID
 * zurück; die Navigation übernimmt der Client (kein redirect aus der Action,
 * damit der Client den Erfolg sauber behandeln kann).
 */
export async function createFunnelFromAi(input: unknown): Promise<
  { ok: true; funnelId: string } | { ok: false; message: string }
> {
  await requireAdmin();

  const parsed = aiFunnelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? "Ungültige Eingabe." };
  }
  const data = parsed.data;

  // Standort validieren (wie in createFunnel): unbekannte ID → alle Standorte.
  let funnelLocationId = data.locationId || null;
  if (funnelLocationId) {
    const loc = await db.location.findFirst({
      where: { id: funnelLocationId },
      select: { id: true },
    });
    if (!loc) funnelLocationId = null;
  }

  // Schritte nach Gesamt-Wartezeit sortieren und fortlaufend nummerieren.
  const sortedSteps = [...data.steps].sort(
    (a, b) => a.delayDays * 24 + a.delayHours - (b.delayDays * 24 + b.delayHours),
  );

  const funnel = await db.funnel.create({
    data: {
      name: data.name,
      trigger: data.trigger,
      active: false, // bewusst inaktiv: erst prüfen, dann scharf schalten
      autoStop: true,
      locationId: funnelLocationId,
      steps: {
        create: sortedSteps.map((s, i) => ({
          orderNum: i + 1,
          delayDays: s.delayDays,
          delayHours: s.delayHours,
          subject: s.subject,
          bodyHtml: s.bodyHtml,
        })),
      },
    },
  });

  revalidatePath("/admin/funnels");
  return { ok: true, funnelId: funnel.id };
}

export async function updateFunnel(funnelId: string, formData: FormData) {
  await requireAdmin();
  const owned = await db.funnel.findFirst({ where: { id: funnelId }, select: { id: true } });
  if (!owned) return;
  const locationIdRaw = formData.get("locationId") as string | null;
  const scheduleEnabled = formData.get("scheduleEnabled") === "on";
  const weekdayRaw = formData.get("scheduleWeekday");

  const parsed = funnelSchema.parse({
    name: formData.get("name"),
    trigger: formData.get("trigger"),
    active: formData.get("active") === "on",
    autoStop: formData.get("autoStop") === "on",
    locationId: locationIdRaw || null,
    scheduleWeekday: scheduleEnabled && weekdayRaw !== null && weekdayRaw !== "" ? weekdayRaw : null,
    scheduleWeekInterval: formData.get("scheduleWeekInterval") || 1,
    scheduleHour: formData.get("scheduleHour") || 9,
    scheduleMinute: formData.get("scheduleMinute") || 0,
  });

  let updLocationId = parsed.locationId || null;
  if (updLocationId) {
    const loc = await db.location.findFirst({
      where: { id: updLocationId },
      select: { id: true },
    });
    if (!loc) updLocationId = null;
  }

  await db.funnel.update({
    where: { id: funnelId },
    data: {
      name: parsed.name,
      trigger: parsed.trigger,
      active: parsed.active,
      autoStop: parsed.autoStop,
      locationId: updLocationId,
      scheduleWeekday: parsed.scheduleWeekday ?? null,
      scheduleWeekInterval: parsed.scheduleWeekInterval,
      scheduleHour: parsed.scheduleHour,
      scheduleMinute: parsed.scheduleMinute,
    },
  });
  revalidatePath("/admin/funnels");
  revalidatePath(`/admin/funnels/${funnelId}`);
}

export async function toggleFunnelActive(funnelId: string) {
  await requireAdmin();
  const f = await db.funnel.findFirst({ where: { id: funnelId } });
  if (!f) return;
  await db.funnel.update({ where: { id: funnelId }, data: { active: !f.active } });
  revalidatePath("/admin/funnels");
  revalidatePath(`/admin/funnels/${funnelId}`);
}

export async function deleteFunnel(funnelId: string) {
  await requireAdmin();
  await db.funnel.deleteMany({ where: { id: funnelId } });
  revalidatePath("/admin/funnels");
  redirect("/admin/funnels");
}

/**
 * Legt einen neuen Funnel-Schritt an.
 *
 * Hybrid-Modus: wenn `scheduleWeekday` aus dem FormData gesetzt ist (0-6),
 * gilt für diesen Step:
 *   → frühestens nach delayDays + delayHours nach Funnel-Start
 *   → dann am nächsten passenden Wochentag um die angegebene Uhrzeit
 * Wenn `scheduleWeekday` leer/null → klassischer Modus (genau nach Wartezeit).
 */
export async function addFunnelStep(funnelId: string, formData: FormData) {
  await requireAdmin();
  const ownedFunnel = await db.funnel.findFirst({ where: { id: funnelId }, select: { id: true } });
  if (!ownedFunnel) return;
  const parsed = funnelStepSchema.parse({
    funnelId,
    delayDays: formData.get("delayDays") || 0,
    delayHours: formData.get("delayHours") || 0,
    subject: formData.get("subject"),
    bodyHtml: formData.get("bodyHtml"),
  });

  // Hybrid-Modus-Felder — außerhalb des Zod-Schemas validiert
  const scheduleWeekday = parseOptionalInt(formData.get("scheduleWeekday"));
  const scheduleHour = parseOptionalInt(formData.get("scheduleHour"));
  const scheduleMinute = parseOptionalInt(formData.get("scheduleMinute"));
  if (scheduleWeekday !== null && (scheduleWeekday < 0 || scheduleWeekday > 6)) {
    throw new Error("Wochentag muss zwischen 0 (Sonntag) und 6 (Samstag) liegen.");
  }
  if (scheduleHour !== null && (scheduleHour < 0 || scheduleHour > 23)) {
    throw new Error("Stunde muss zwischen 0 und 23 liegen.");
  }
  if (scheduleMinute !== null && (scheduleMinute < 0 || scheduleMinute > 59)) {
    throw new Error("Minute muss zwischen 0 und 59 liegen.");
  }

  const lastStep = await db.funnelStep.findFirst({
    where: { funnelId },
    orderBy: { orderNum: "desc" },
    select: { orderNum: true },
  });
  const orderNum = (lastStep?.orderNum ?? 0) + 1;

  await db.funnelStep.create({
    data: {
      funnelId,
      orderNum,
      delayDays: parsed.delayDays,
      delayHours: parsed.delayHours,
      subject: parsed.subject,
      bodyHtml: parsed.bodyHtml,
      // Hybrid-Modus: nur setzen wenn scheduleWeekday gegeben ist.
      // Hour/Minute defaulten dann auf 9:00 falls nicht mitgesendet.
      scheduleWeekday,
      scheduleHour: scheduleWeekday !== null ? (scheduleHour ?? 9) : null,
      scheduleMinute: scheduleWeekday !== null ? (scheduleMinute ?? 0) : null,
    },
  });
  revalidatePath(`/admin/funnels/${funnelId}`);
}

export async function deleteFunnelStep(stepId: string, funnelId: string) {
  await requireAdmin();
  await db.funnelStep.deleteMany({ where: { id: stepId } });
  revalidatePath(`/admin/funnels/${funnelId}`);
}

/**
 * Aktualisiert einen bestehenden Funnel-Schritt.
 * Anwendung: User korrigiert nachträglich Links, Betreff, ganzen Body
 * oder den Hybrid-Modus. Reihenfolge (orderNum) bleibt unverändert.
 */
export async function updateFunnelStep(
  stepId: string,
  funnelId: string,
  formData: FormData,
) {
  await requireAdmin();
  const ownedStep = await db.funnelStep.findFirst({
    where: { id: stepId },
    select: { id: true },
  });
  if (!ownedStep) return;

  const parsed = funnelStepSchema.parse({
    funnelId,
    delayDays: formData.get("delayDays") || 0,
    delayHours: formData.get("delayHours") || 0,
    subject: formData.get("subject"),
    bodyHtml: formData.get("bodyHtml"),
  });

  // Hybrid-Modus-Felder — außerhalb des Zod-Schemas validiert
  const scheduleWeekday = parseOptionalInt(formData.get("scheduleWeekday"));
  const scheduleHour = parseOptionalInt(formData.get("scheduleHour"));
  const scheduleMinute = parseOptionalInt(formData.get("scheduleMinute"));
  if (scheduleWeekday !== null && (scheduleWeekday < 0 || scheduleWeekday > 6)) {
    throw new Error("Wochentag muss zwischen 0 (Sonntag) und 6 (Samstag) liegen.");
  }
  if (scheduleHour !== null && (scheduleHour < 0 || scheduleHour > 23)) {
    throw new Error("Stunde muss zwischen 0 und 23 liegen.");
  }
  if (scheduleMinute !== null && (scheduleMinute < 0 || scheduleMinute > 59)) {
    throw new Error("Minute muss zwischen 0 und 59 liegen.");
  }

  await db.funnelStep.update({
    where: { id: stepId },
    data: {
      delayDays: parsed.delayDays,
      delayHours: parsed.delayHours,
      subject: parsed.subject,
      bodyHtml: parsed.bodyHtml,
      scheduleWeekday,
      scheduleHour: scheduleWeekday !== null ? (scheduleHour ?? 9) : null,
      scheduleMinute: scheduleWeekday !== null ? (scheduleMinute ?? 0) : null,
    },
  });

  revalidatePath(`/admin/funnels/${funnelId}`);
  redirect(`/admin/funnels/${funnelId}`);
}

export async function runFunnelProcessing() {
  await requireAdmin();
  await processFunnels({ force: true });
  revalidatePath("/admin/funnels");
  revalidatePath("/admin");
}

// ─────────────────────────────────────────────────────────────
// CLUB-ANMELDUNG (intern, durch Mitarbeiter:in)
// ─────────────────────────────────────────────────────────────

export type ClubSignupResult =
  | { ok: true; contactId: string; firstName: string; lastName: string; existing: boolean }
  | { ok: false; error: string };

export async function createClubContact(formData: FormData): Promise<ClubSignupResult> {
  await requireAdmin();

  try {
    const raw = {
      staff: formData.get("staff"),
      signupMode: formData.get("signupMode"),
      email: formData.get("email"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      gender: formData.get("gender"),
      phone: formData.get("phone") || "",
      birthDate: formData.get("birthDate") || "",
      street: formData.get("street") || "",
      postalCode: formData.get("postalCode") || "",
      city: formData.get("city") || "",
      iban: formData.get("iban") || "",
      contractStartDate: formData.get("contractStartDate") || "",
      pricingPlanId: formData.get("pricingPlanId") || "",
      locationId: formData.get("locationId") || "",
      notes: formData.get("notes") || "",
    };

    const parsed = clubSignupSchema.parse(raw);
    const source = parsed.signupMode === "OFFLINE" ? "CLUB_OFFLINE" : "CLUB_ONLINE";

    let clubPlanId = parsed.pricingPlanId || null;
    if (clubPlanId) {
      const plan = await db.pricingPlan.findFirst({ where: { id: clubPlanId }, select: { id: true } });
      if (!plan) clubPlanId = null;
    }
    let clubLocationId = parsed.locationId || null;
    if (clubLocationId) {
      const loc = await db.location.findFirst({ where: { id: clubLocationId }, select: { id: true } });
      if (!loc) clubLocationId = null;
    }

    // Upsert: falls Mail schon existiert → updaten und Status anheben
    const existing = await db.contact.findUnique({
      where: { email: parsed.email },
      select: { id: true, status: true },
    });

    const data = {
      email: parsed.email,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      gender: parsed.gender,
      phone: parsed.phone || null,
      birthDate: parsed.birthDate ? new Date(parsed.birthDate) : null,
      street: parsed.street || null,
      postalCode: parsed.postalCode || null,
      city: parsed.city || null,
      iban: parsed.iban || null,
      contractStartDate: parsed.contractStartDate ? new Date(parsed.contractStartDate) : null,
      pricingPlanId: clubPlanId,
      locationId: clubLocationId,
      notes: parsed.notes || null,
      signupStaff: parsed.staff,
      status: "NEUKUNDE" as const,
      source: source as "CLUB_OFFLINE" | "CLUB_ONLINE",
      signupAt: new Date(),
      memberSince: new Date(),
    };

    const contact = existing
      ? await db.contact.update({ where: { id: existing.id }, data })
      : await db.contact.create({ data });

    // Funnels für NEUKUNDE direkt einreihen (passt zum normalen Signup-Flow)
    try {
      await enrollIntoMatchingFunnels(contact.id, "NEUKUNDE" as FunnelTrigger);
    } catch (e) {
      console.error("[club-signup] funnel enroll failed", e);
    }

    revalidatePath("/admin");
    revalidatePath("/admin/contacts");

    return {
      ok: true,
      contactId: contact.id,
      firstName: contact.firstName ?? "",
      lastName: contact.lastName ?? "",
      existing: !!existing,
    };
  } catch (e: unknown) {
    console.error("[createClubContact]", e);
    const msg =
      e instanceof Error
        ? e.message.includes("Unique constraint")
          ? "E-Mail-Adresse existiert bereits."
          : e.message
        : "Unbekannter Fehler.";
    return { ok: false, error: msg };
  }
}

export type { FunnelTrigger };

/**
 * Massenlöschung mehrerer Kontakte. Verwendet in der Bulk-Auswahl-Toolbar
 * der Kontakte-Liste.
 *
 * Sicherheits-Limit: max. 1000 IDs pro Aufruf, um nicht versehentlich
 * eine ganze DB leer zu räumen.
 *
 * Cascades: zugehörige ContactEvents, FunnelEnrollments und CampaignEvents
 * werden durch Prisma onDelete=Cascade im Schema mit entfernt.
 */
export async function bulkDeleteContacts(ids: string[]) {
  await requireAdmin();

  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, message: "Keine Kontakte ausgewählt." };
  }
  if (ids.length > 1000) {
    return { ok: false, message: "Maximal 1000 Kontakte pro Aktion." };
  }

  const result = await db.contact.deleteMany({
    where: { id: { in: ids } },
  });

  revalidatePath("/admin/contacts");
  return { ok: true, deleted: result.count };
}

// ─────────────────────────────────────────────────────────────
// BULK-ADD ZU LISTEN
// ─────────────────────────────────────────────────────────────

/**
 * Mehrere Kontakte gleichzeitig zu einer Liste hinzufügen.
 * Existierende Mitglieder werden übersprungen (kein Fehler).
 *
 * Max. 5000 IDs pro Aufruf als Sicherheitsnetz.
 */
export async function bulkAddContactsToList(
  listId: string,
  contactIds: string[],
) {
  await requireAdmin();

  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return { ok: false, added: 0, message: "Keine Kontakte ausgewählt." };
  }
  if (contactIds.length > 5000) {
    return { ok: false, added: 0, message: "Maximal 5000 Kontakte pro Aktion." };
  }

  const ownedList = await db.list.findFirst({ where: { id: listId }, select: { id: true } });
  if (!ownedList) return { ok: false, added: 0, message: "Liste nicht gefunden." };

  const ownedContacts = await db.contact.findMany({
    where: { id: { in: contactIds } },
    select: { id: true },
  });
  const ownedIds = ownedContacts.map((c) => c.id);

  // Bereits-Mitglieder herausfiltern, sonst zählt skipDuplicates die als "added".
  const existing = await db.contactList.findMany({
    where: { listId, contactId: { in: ownedIds } },
    select: { contactId: true },
  });
  const existingIds = new Set(existing.map((e) => e.contactId));
  const newIds = ownedIds.filter((id) => !existingIds.has(id));

  if (newIds.length > 0) {
    await db.contactList.createMany({
      data: newIds.map((id) => ({ contactId: id, listId })),
      skipDuplicates: true,
    });
  }

  revalidatePath(`/admin/lists/${listId}`);
  return { ok: true, added: newIds.length, skipped: existingIds.size };
}

/**
 * Alle Kontakte mit bestimmtem Status (optional gefiltert nach Standort)
 * zu einer Liste hinzufügen. Bereits-Mitglieder werden übersprungen.
 */
export async function bulkAddByStatusToList(
  listId: string,
  status: ContactStatus,
  locationId?: string | null,
) {
  await requireAdmin();

  const ownedList = await db.list.findFirst({ where: { id: listId }, select: { id: true } });
  if (!ownedList) return { ok: false, added: 0 };

  const candidates = await db.contact.findMany({
    where: {
      status,
      ...(locationId ? { locationId } : {}),
      lists: { none: { listId } },
    },
    select: { id: true },
  });

  if (candidates.length === 0) {
    return { ok: true, added: 0 };
  }

  await db.contactList.createMany({
    data: candidates.map((c) => ({ contactId: c.id, listId })),
    skipDuplicates: true,
  });

  revalidatePath(`/admin/lists/${listId}`);
  return { ok: true, added: candidates.length };
}

/**
 * Zählt wie viele Kontakte ein Status-Filter (plus optional Standort)
 * matched, die NICHT bereits in der Liste sind. Für die Vorschau-Anzeige.
 */
export async function countContactsForBulkAdd(
  listId: string,
  status: ContactStatus,
  locationId?: string | null,
) {
  await requireAdmin();
  return db.contact.count({
    where: {
      status,
      ...(locationId ? { locationId } : {}),
      lists: { none: { listId } },
    },
  });
}

// ─────────────────────────────────────────────────────────────
// CAMPAIGN BEARBEITEN
// ─────────────────────────────────────────────────────────────

/**
 * Aktualisiert eine Campaign — auch nach Versand.
 *
 * Bei einer SENT-Campaign bleibt der Status auf SENT. Der Edit ändert nur
 * die Vorlage (Betreff, Inhalt, Targeting). Bereits versendete Mails sind
 * davon nicht betroffen (die sind ja schon raus).
 *
 * Wenn die Campaign erneut versendet werden soll, muss danach noch
 * `restartCampaign` aufgerufen werden — das setzt Status zurück auf DRAFT.
 */
export async function updateCampaign(campaignId: string, formData: FormData) {
  await requireAdmin();

  const existing = await db.campaign.findFirst({
    where: { id: campaignId },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new Error("Kampagne nicht gefunden.");
  }

  const subject = (formData.get("subject") as string)?.trim() ?? "";
  const bodyHtml = (formData.get("bodyHtml") as string) ?? "";
  const targetMode = (formData.get("targetMode") as string) ?? "STATUS";
  const listIdRaw = (formData.get("listId") as string)?.trim() ?? "";
  const targetStatusRaw = (formData.get("targetStatus") as string)?.trim() ?? "";
  const targetLocationIdRaw = (formData.get("targetLocationId") as string)?.trim() ?? "";

  if (!subject) throw new Error("Betreff fehlt.");
  if (!bodyHtml || bodyHtml === "<p></p>") throw new Error("Mail-Inhalt fehlt.");

  // Targeting: entweder listId ODER targetStatus, nicht beides
  let updateData: {
    subject: string;
    bodyHtml: string;
    listId: string | null;
    targetStatus: ContactStatus | null;
    targetLocationId: string | null;
  };

  if (targetMode === "LIST") {
    if (!listIdRaw) throw new Error("Bitte eine Liste auswählen.");
    updateData = {
      subject,
      bodyHtml,
      listId: listIdRaw,
      targetStatus: null,
      targetLocationId: targetLocationIdRaw || null,
    };
  } else {
    if (!targetStatusRaw) throw new Error("Bitte einen Status auswählen.");
    const VALID_STATUSES: ContactStatus[] = [
      "INTERESSENT",
      "NEUKUNDE",
      "KUNDE",
      "EHEMALIGER",
    ];
    if (!VALID_STATUSES.includes(targetStatusRaw as ContactStatus)) {
      throw new Error("Ungültiger Status.");
    }
    updateData = {
      subject,
      bodyHtml,
      listId: null,
      targetStatus: targetStatusRaw as ContactStatus,
      targetLocationId: targetLocationIdRaw || null,
    };
  }

  if (updateData.listId) {
    const l = await db.list.findFirst({ where: { id: updateData.listId }, select: { id: true } });
    if (!l) throw new Error("Liste nicht gefunden.");
  }
  if (updateData.targetLocationId) {
    const loc = await db.location.findFirst({
      where: { id: updateData.targetLocationId },
      select: { id: true },
    });
    if (!loc) updateData.targetLocationId = null;
  }

  await db.campaign.update({
    where: { id: campaignId },
    data: updateData,
  });

  revalidatePath(`/admin/campaigns/${campaignId}`);
  revalidatePath("/admin/campaigns");
  redirect(`/admin/campaigns/${campaignId}`);
}

// ─────────────────────────────────────────────────────────────
// CAMPAIGN BATCH-SEND
// ─────────────────────────────────────────────────────────────

const CAMPAIGN_BATCH_SIZE = 30;
const CAMPAIGN_MAIL_THROTTLE_MS = 250;

/**
 * Versendet eine Campaign in Batches von max. CAMPAIGN_BATCH_SIZE Mails pro Aufruf.
 *
 * Race-safe via @@unique([campaignId, contactId, event]) auf CampaignEvent:
 * pro Empfänger kann nur EIN SENT-Event geschrieben werden. Bei parallelen
 * Aufrufen gewinnt einer den INSERT, alle anderen bekommen P2002 und skippen.
 *
 * Mail-Versand-Reihenfolge: erst Event-Insert (atomic), dann Mail. Wenn Mail
 * scheitert, ist Event trotzdem da → keine erneute Mail. Lieber eine Mail
 * nicht raus als doppelt raus.
 */
export async function processCampaignBatch(campaignId: string) {
  await requireAdmin();

  const campaign = await db.campaign.findFirst({
    where: { id: campaignId },
  });

  if (!campaign) {
    return { ok: false, message: "Kampagne nicht gefunden." };
  }

  // Bei SENT-Status erstmal weitermachen, aber nur wenn neue Empfänger da sind
  // die noch kein SENT-Event haben. Falls Tim einen erneuten Versand via
  // restartCampaign angestoßen hat, ist der Status sowieso wieder DRAFT.
  // Hier nur defensiv: wenn SENT + keine neuen Empfänger → done.

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

  // Schon-Versendete via SENT-Events erkennen
  const sentEvents = await db.campaignEvent.findMany({
    where: { campaignId, event: "SENT" },
    select: { contactId: true },
  });
  const sentIds = new Set(sentEvents.map((e) => e.contactId));

  const toSend = recipients
    .filter((r) => !sentIds.has(r.id))
    .slice(0, CAMPAIGN_BATCH_SIZE);

  // Status auf SENDING setzen wenn noch DRAFT (Tracking-Marker)
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
      if (e.code === "P2002") {
        // Schon gesendet (anderer Aufruf war schneller) — skip
        continue;
      }
      throw err;
    }

    // Mail verschicken
    try {
      const firstName = recipient.firstName ?? "";
      const subject = campaign.subject.split("{{firstName}}").join(firstName);
      const bodyHtml = campaign.bodyHtml.split("{{firstName}}").join(firstName);

      await sendCampaignMail({
        to: recipient.email,
        subject,
        bodyHtml,
      });

      batchSent++;
      await new Promise((r) => setTimeout(r, CAMPAIGN_MAIL_THROTTLE_MS));
    } catch (err) {
      // Mail-Versand failed — Event ist bereits geschrieben. Bewusste Entscheidung:
      // lieber eine Mail nicht raus als doppelt raus.
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

  revalidatePath(`/admin/campaigns/${campaignId}`);
  return {
    ok: true,
    done,
    total,
    sentTotal: newSentCount,
    batchSent,
  };
}

/**
 * Setzt eine SENT-Campaign zurück auf DRAFT, damit sie erneut versendet werden kann.
 *
 * Wichtig: die alten CampaignEvent-Einträge (SENT) bleiben erhalten!
 * Empfänger die schon eine Mail bekommen haben, bekommen beim erneuten
 * Versand KEINE zweite Mail (Schutz durch @@unique-Constraint).
 *
 * Sinnvoll wenn:
 *  - Targeting wurde auf neue Liste/Status geändert → neue Empfänger
 *    bekommen die Mail
 *  - Bestehende Empfänger der ursprünglichen Liste bleiben außen vor
 */
export async function restartCampaign(campaignId: string) {
  await requireAdmin();

  const existing = await db.campaign.findFirst({
    where: { id: campaignId },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new Error("Kampagne nicht gefunden.");
  }
  if (existing.status === "DRAFT") {
    // Schon im DRAFT-Status, nichts zu tun
    revalidatePath(`/admin/campaigns/${campaignId}`);
    return { ok: true, alreadyDraft: true };
  }

  await db.campaign.update({
    where: { id: campaignId },
    data: { status: "DRAFT", sentAt: null },
  });

  revalidatePath(`/admin/campaigns/${campaignId}`);
  revalidatePath("/admin/campaigns");
  return { ok: true };
}

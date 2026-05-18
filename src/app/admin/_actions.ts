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
  locationSchema,
  clubSignupSchema,
} from "@/lib/validation";
import { enrollIntoMatchingFunnels, processFunnels } from "@/lib/funnels";
import type { ContactStatus, FunnelTrigger } from "@prisma/client";

async function requireAdmin() {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  return s;
}

// ─────────────────────────────────────────────────────────────
// CONTACTS
// ─────────────────────────────────────────────────────────────

export async function updateContactStatus(contactId: string, newStatus: ContactStatus) {
  await requireAdmin();
  const previous = await db.contact.findUnique({
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
  await db.contact.update({ where: { id: contactId }, data: { notes } });
  revalidatePath(`/admin/contacts/${contactId}`);
}

export async function updateContactLocation(contactId: string, locationId: string | null) {
  await requireAdmin();
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
  await db.contact.delete({ where: { id: contactId } });
  revalidatePath("/admin/contacts");
  redirect("/admin/contacts");
}

export async function addContactToList(contactId: string, listId: string) {
  await requireAdmin();
  await db.contactList.upsert({
    where: { contactId_listId: { contactId, listId } },
    update: {},
    create: { contactId, listId },
  });
  revalidatePath(`/admin/contacts/${contactId}`);
}

export async function removeContactFromList(contactId: string, listId: string) {
  await requireAdmin();
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
  const loc = await db.location.findUnique({ where: { id: locationId } });
  if (!loc) return;
  await db.location.update({ where: { id: locationId }, data: { active: !loc.active } });
  revalidatePath("/admin/locations");
}

export async function deleteLocation(locationId: string) {
  await requireAdmin();
  await db.location.delete({ where: { id: locationId } });
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

  const rawLocationId = formData.get("locationId") as string | null;

  const parsed = planSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || "",
    priceCents: Number(formData.get("priceEur")) * 100,
    billingInterval: formData.get("billingInterval"),
    highlights,
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
    agb: parsed.agb || null,
    availableOnline: parsed.availableOnline,
    availableOffline: parsed.availableOffline,
    active: parsed.active,
    sortOrder: parsed.sortOrder,
    locationId: parsed.locationId || null,
  };

  if (id) {
    await db.pricingPlan.update({ where: { id }, data });
  } else {
    await db.pricingPlan.create({ data });
  }
  revalidatePath("/admin/plans");
  redirect("/admin/plans");
}

export async function togglePlanActive(planId: string) {
  await requireAdmin();
  const p = await db.pricingPlan.findUnique({ where: { id: planId } });
  if (!p) return;
  await db.pricingPlan.update({ where: { id: planId }, data: { active: !p.active } });
  revalidatePath("/admin/plans");
}

export async function deletePlan(planId: string) {
  await requireAdmin();
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
  await db.list.create({ data: { name, description: description || null } });
  revalidatePath("/admin/lists");
}

export async function deleteList(listId: string) {
  await requireAdmin();
  await db.list.delete({ where: { id: listId } });
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

  const c = await db.campaign.create({
    data: {
      listId: parsed.targetMode === "LIST" ? parsed.listId : null,
      targetStatus: parsed.targetMode === "STATUS" ? parsed.targetStatus : null,
      targetLocationId: parsed.targetLocationId || null,
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
  await db.campaign.delete({ where: { id: campaignId } });
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

  const f = await db.funnel.create({
    data: {
      name: parsed.name,
      trigger: parsed.trigger,
      // Neu angelegte Funnels sind IMMER inaktiv — User muss
      // sie explizit über den Toggle in der Liste scharfschalten.
      // So gehen keine Mails versehentlich raus, bevor alle Schritte
      // fertig konfiguriert sind.
      active: false,
      autoStop: parsed.autoStop,
      locationId: parsed.locationId || null,
      scheduleWeekday: parsed.scheduleWeekday ?? null,
      scheduleWeekInterval: parsed.scheduleWeekInterval,
      scheduleHour: parsed.scheduleHour,
      scheduleMinute: parsed.scheduleMinute,
    },
  });
  revalidatePath("/admin/funnels");
  redirect(`/admin/funnels/${f.id}`);
}

export async function updateFunnel(funnelId: string, formData: FormData) {
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

  await db.funnel.update({
    where: { id: funnelId },
    data: {
      name: parsed.name,
      trigger: parsed.trigger,
      active: parsed.active,
      autoStop: parsed.autoStop,
      locationId: parsed.locationId || null,
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
  const f = await db.funnel.findUnique({ where: { id: funnelId } });
  if (!f) return;
  await db.funnel.update({ where: { id: funnelId }, data: { active: !f.active } });
  revalidatePath("/admin/funnels");
  revalidatePath(`/admin/funnels/${funnelId}`);
}

export async function deleteFunnel(funnelId: string) {
  await requireAdmin();
  await db.funnel.delete({ where: { id: funnelId } });
  revalidatePath("/admin/funnels");
  redirect("/admin/funnels");
}

export async function addFunnelStep(funnelId: string, formData: FormData) {
  await requireAdmin();
  const parsed = funnelStepSchema.parse({
    funnelId,
    delayDays: formData.get("delayDays") || 0,
    delayHours: formData.get("delayHours") || 0,
    subject: formData.get("subject"),
    bodyHtml: formData.get("bodyHtml"),
  });

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
    },
  });
  revalidatePath(`/admin/funnels/${funnelId}`);
}

export async function deleteFunnelStep(stepId: string, funnelId: string) {
  await requireAdmin();
  await db.funnelStep.delete({ where: { id: stepId } });
  revalidatePath(`/admin/funnels/${funnelId}`);
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
      pricingPlanId: parsed.pricingPlanId || null,
      locationId: parsed.locationId || null,
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

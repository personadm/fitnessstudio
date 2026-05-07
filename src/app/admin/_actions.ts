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
// LOCATIONS (Standorte) — neu
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

  // Leere Strings zu null normalisieren
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
  // Kontakte und Tarife behalten ihren Verweis nicht — durch onDelete: SetNull
  // im Schema werden locationId-Felder automatisch genullt.
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
// CAMPAIGNS
// ─────────────────────────────────────────────────────────────

export async function createCampaign(formData: FormData) {
  await requireAdmin();
  const parsed = campaignSchema.parse({
    listId: formData.get("listId"),
    subject: formData.get("subject"),
    bodyHtml: formData.get("bodyHtml"),
  });
  const c = await db.campaign.create({ data: { ...parsed, status: "DRAFT" } });
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
// FUNNELS
// ─────────────────────────────────────────────────────────────

export async function createFunnel(formData: FormData) {
  await requireAdmin();
  const parsed = funnelSchema.parse({
    name: formData.get("name"),
    trigger: formData.get("trigger"),
    active: formData.get("active") === "on",
    autoStop: formData.get("autoStop") === "on",
  });
  const f = await db.funnel.create({ data: parsed });
  revalidatePath("/admin/funnels");
  redirect(`/admin/funnels/${f.id}`);
}

export async function updateFunnel(funnelId: string, formData: FormData) {
  await requireAdmin();
  const parsed = funnelSchema.parse({
    name: formData.get("name"),
    trigger: formData.get("trigger"),
    active: formData.get("active") === "on",
    autoStop: formData.get("autoStop") === "on",
  });
  await db.funnel.update({ where: { id: funnelId }, data: parsed });
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
    delayDays: formData.get("delayDays"),
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

export type { FunnelTrigger };

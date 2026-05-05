"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { planSchema, campaignSchema } from "@/lib/validation";
import type { ContactStatus } from "@prisma/client";

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
  const previous = await db.contact.findUnique({ where: { id: contactId }, select: { status: true } });
  if (!previous) return;

  await db.contact.update({
    where: { id: contactId },
    data: {
      status: newStatus,
      // bei Wechsel auf KUNDE: memberSince setzen (falls noch nicht gesetzt)
      ...(newStatus === "KUNDE" ? { memberSince: { set: new Date() } } : {}),
      // bei Wechsel auf EHEMALIGER: memberUntil setzen
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
  revalidatePath("/admin/contacts");
  revalidatePath(`/admin/contacts/${contactId}`);
}

export async function updateContactNotes(contactId: string, notes: string) {
  await requireAdmin();
  await db.contact.update({ where: { id: contactId }, data: { notes } });
  revalidatePath(`/admin/contacts/${contactId}`);
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
// PRICING PLANS
// ─────────────────────────────────────────────────────────────

export async function savePlan(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id") as string | null;
  const highlights = (formData.get("highlights") as string)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed = planSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || "",
    priceCents: Number(formData.get("priceEur")) * 100,
    billingInterval: formData.get("billingInterval"),
    highlights,
    active: formData.get("active") === "on",
    sortOrder: Number(formData.get("sortOrder") || 0),
  });

  if (id) {
    await db.pricingPlan.update({ where: { id }, data: parsed });
  } else {
    await db.pricingPlan.create({ data: parsed });
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
  // Nur löschen, wenn keine Contacts mehr daran hängen
  const inUse = await db.contact.count({ where: { pricingPlanId: planId } });
  if (inUse > 0) {
    // Statt löschen: deaktivieren
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

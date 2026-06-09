"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getPlatformSession, destroyPlatformSession } from "@/lib/platformAuth";
import { generateActivationCode } from "@/lib/codes";

async function requirePlatform() {
  const s = await getPlatformSession();
  if (!s) redirect("/platform/login");
  return s;
}

/** Erzeugt einen neuen Aktivierungs-Code (UNUSED) mit optionalem Label. */
export async function createCode(formData: FormData) {
  await requirePlatform();
  const label = ((formData.get("label") as string) || "").trim().slice(0, 200) || null;

  // Kollisions-Retry: Code ist @unique. Bei (sehr seltener) Kollision neu würfeln.
  let code = generateActivationCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await db.activationCode.findUnique({ where: { code }, select: { id: true } });
    if (!existing) break;
    code = generateActivationCode();
  }

  await db.activationCode.create({ data: { code, label } });
  revalidatePath("/platform");
}

/** Sperrt einen noch nicht eingelösten Code. Eingelöste bleiben unangetastet. */
export async function revokeCode(formData: FormData) {
  await requirePlatform();
  const id = formData.get("id") as string;
  if (!id) return;
  await db.activationCode.updateMany({
    where: { id, status: "UNUSED" },
    data: { status: "REVOKED" },
  });
  revalidatePath("/platform");
}

/** Reaktiviert einen gesperrten Code wieder auf UNUSED. */
export async function reactivateCode(formData: FormData) {
  await requirePlatform();
  const id = formData.get("id") as string;
  if (!id) return;
  await db.activationCode.updateMany({
    where: { id, status: "REVOKED" },
    data: { status: "UNUSED" },
  });
  revalidatePath("/platform");
}

export async function platformLogout() {
  await destroyPlatformSession();
  redirect("/platform/login");
}

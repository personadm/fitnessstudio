// ═══════════════════════════════════════════════════════════════════════
// HYBRID-MODUS — Server-Action Erweiterungen
// ═══════════════════════════════════════════════════════════════════════
//
// In dein bestehendes `src/app/admin/_actions.ts` einfügen / ersetzen.
//
// → Such die Funktionen `addFunnelStep` und `updateFunnelStep` und
//   ersetze sie durch die Versionen unten.
//
// Beide Funktionen lesen jetzt zusätzlich die drei optionalen Felder
// `scheduleWeekday`, `scheduleHour`, `scheduleMinute` aus dem FormData.
// Wenn `scheduleWeekday` leer/null ist, bleibt der Step im klassischen
// Modus. Sonst wird er hybrid: frühestens nach delayDays + delayHours,
// dann am nächsten Wochentag X um Y Uhr.
//
// ═══════════════════════════════════════════════════════════════════════


// ─────────────────────────────────────────────────────────────────────
// Helper: parsed optional integer aus FormData (gibt null wenn leer/NaN)
// ─────────────────────────────────────────────────────────────────────
function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}


// ─────────────────────────────────────────────────────────────────────
// addFunnelStep — ersetzt deine bestehende Version
// ─────────────────────────────────────────────────────────────────────
export async function addFunnelStep(funnelId: string, formData: FormData) {
  await requireAdmin();

  const subject = String(formData.get("subject") ?? "").trim();
  const bodyHtml = String(formData.get("bodyHtml") ?? "").trim();
  const delayDays = parseInt(String(formData.get("delayDays") ?? "0"), 10);
  const delayHours = parseInt(String(formData.get("delayHours") ?? "0"), 10);

  // NEU: Hybrid-Modus-Felder
  const scheduleWeekday = parseOptionalInt(formData.get("scheduleWeekday"));
  const scheduleHour = parseOptionalInt(formData.get("scheduleHour"));
  const scheduleMinute = parseOptionalInt(formData.get("scheduleMinute"));

  if (!subject || !bodyHtml) {
    throw new Error("Betreff und Inhalt sind Pflicht.");
  }
  if (delayDays < 0 || delayHours < 0 || delayHours > 23) {
    throw new Error("Wartezeit ungültig.");
  }
  if (scheduleWeekday !== null && (scheduleWeekday < 0 || scheduleWeekday > 6)) {
    throw new Error("Wochentag muss zwischen 0 (Sonntag) und 6 (Samstag) liegen.");
  }

  // Nächste orderNum bestimmen
  const last = await db.funnelStep.findFirst({
    where: { funnelId },
    orderBy: { orderNum: "desc" },
    select: { orderNum: true },
  });
  const nextOrderNum = (last?.orderNum ?? 0) + 1;

  await db.funnelStep.create({
    data: {
      funnelId,
      orderNum: nextOrderNum,
      delayDays,
      delayHours,
      subject,
      bodyHtml,
      // NEU
      scheduleWeekday,
      scheduleHour: scheduleWeekday !== null ? (scheduleHour ?? 9) : null,
      scheduleMinute: scheduleWeekday !== null ? (scheduleMinute ?? 0) : null,
    },
  });

  revalidatePath(`/admin/funnels/${funnelId}`);
}


// ─────────────────────────────────────────────────────────────────────
// updateFunnelStep — ersetzt deine bestehende Version
// ─────────────────────────────────────────────────────────────────────
export async function updateFunnelStep(
  stepId: string,
  funnelId: string,
  formData: FormData,
) {
  await requireAdmin();

  const subject = String(formData.get("subject") ?? "").trim();
  const bodyHtml = String(formData.get("bodyHtml") ?? "").trim();
  const delayDays = parseInt(String(formData.get("delayDays") ?? "0"), 10);
  const delayHours = parseInt(String(formData.get("delayHours") ?? "0"), 10);

  // NEU: Hybrid-Modus-Felder
  const scheduleWeekday = parseOptionalInt(formData.get("scheduleWeekday"));
  const scheduleHour = parseOptionalInt(formData.get("scheduleHour"));
  const scheduleMinute = parseOptionalInt(formData.get("scheduleMinute"));

  if (!subject || !bodyHtml) {
    throw new Error("Betreff und Inhalt sind Pflicht.");
  }
  if (delayDays < 0 || delayHours < 0 || delayHours > 23) {
    throw new Error("Wartezeit ungültig.");
  }
  if (scheduleWeekday !== null && (scheduleWeekday < 0 || scheduleWeekday > 6)) {
    throw new Error("Wochentag muss zwischen 0 (Sonntag) und 6 (Samstag) liegen.");
  }

  await db.funnelStep.update({
    where: { id: stepId },
    data: {
      delayDays,
      delayHours,
      subject,
      bodyHtml,
      // NEU
      scheduleWeekday,
      scheduleHour: scheduleWeekday !== null ? (scheduleHour ?? 9) : null,
      scheduleMinute: scheduleWeekday !== null ? (scheduleMinute ?? 0) : null,
    },
  });

  revalidatePath(`/admin/funnels/${funnelId}`);
  redirect(`/admin/funnels/${funnelId}`);
}

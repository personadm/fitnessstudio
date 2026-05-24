// ─────────────────────────────────────────────────────────────
// BULK-ADD ZU LISTEN
// ─────────────────────────────────────────────────────────────
//
// Folgenden Code-Block ans Ende von src/app/admin/_actions.ts anhängen.
// "ContactStatus" wird oben in der Datei vermutlich schon importiert —
// falls nicht, dem bestehenden Prisma-Import hinzufügen:
//
//   import type { ContactStatus } from "@prisma/client";

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

  // Bereits-Mitglieder herausfiltern, sonst zählt skipDuplicates die als "added".
  const existing = await db.contactList.findMany({
    where: { listId, contactId: { in: contactIds } },
    select: { contactId: true },
  });
  const existingIds = new Set(existing.map((e) => e.contactId));
  const newIds = contactIds.filter((id) => !existingIds.has(id));

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
 *
 * Returnt die Anzahl der neu hinzugefügten Kontakte.
 */
export async function bulkAddByStatusToList(
  listId: string,
  status: ContactStatus,
  locationId?: string | null,
) {
  await requireAdmin();

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
 * matched, die NICHT bereits in der Liste sind. Wird für die
 * Vorschau-Anzeige in der UI verwendet.
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

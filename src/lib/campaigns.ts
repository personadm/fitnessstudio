import { db } from "./db";
import type { ContactStatus } from "@prisma/client";

export type CampaignTargeting = {
  listId: string | null;
  targetStatus: ContactStatus | null;
  targetLocationId: string | null;
};

export type Recipient = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: ContactStatus;
  doiConfirmedAt: Date | null;
  locationId: string | null;
};

/**
 * Liefert versandfähige Empfänger einer Campaign basierend auf Targeting:
 * - Wenn listId: Mitglieder dieser Liste
 * - Wenn targetStatus: alle Kontakte mit diesem Status
 * - targetLocationId schränkt zusätzlich nach Standort ein
 *
 * Versandfähig = doiConfirmedAt gesetzt UND Status nicht EHEMALIGER
 * (außer wenn EHEMALIGER explizit als targetStatus gewählt wurde — das ist
 * dann ja gerade der Sinn, z.B. für Win-Back-Newsletter).
 */
export async function getCampaignRecipients(
  targeting: CampaignTargeting,
): Promise<Recipient[]> {
  const select = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    status: true,
    doiConfirmedAt: true,
    locationId: true,
  };

  if (targeting.listId) {
    // Listen-basiert
    const rows = await db.contactList.findMany({
      where: {
        listId: targeting.listId,
        ...(targeting.targetLocationId
          ? { contact: { locationId: targeting.targetLocationId } }
          : {}),
      },
      include: { contact: { select } },
    });
    return rows
      .map((r) => r.contact)
      .filter((c) => c.doiConfirmedAt && c.status !== "EHEMALIGER");
  }

  if (targeting.targetStatus) {
    // Status-basiert (mit optionalem Standort-Filter).
    // status-Filter excludet automatisch alle anderen Status (z.B. EHEMALIGE
    // werden nicht inkludiert, außer targetStatus === "EHEMALIGER").
    const contacts = await db.contact.findMany({
      where: {
        status: targeting.targetStatus,
        ...(targeting.targetLocationId
          ? { locationId: targeting.targetLocationId }
          : {}),
        doiConfirmedAt: { not: null },
      },
      select,
    });
    return contacts;
  }

  return [];
}

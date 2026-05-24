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
 * Liefert Empfänger einer Campaign basierend auf Targeting:
 * - Wenn listId: Mitglieder dieser Liste
 * - Wenn targetStatus: alle Kontakte mit diesem Status
 * - targetLocationId schränkt zusätzlich nach Standort ein
 *
 * Kein DOI-Filter mehr — alle Kontakte im jeweiligen Pool sind versandfähig.
 * Verantwortung für legitime Kontakt-Erfassung liegt beim Admin. Empfänger
 * können sich jederzeit über den Abmeldelink im Footer abmelden.
 *
 * Opt-out-Filter: wer `optedOutAt` gesetzt hat, wird ausgeschlossen.
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
    const rows = await db.contactList.findMany({
      where: {
        listId: targeting.listId,
        ...(targeting.targetLocationId
          ? { contact: { locationId: targeting.targetLocationId } }
          : {}),
      },
      include: { contact: { select } },
    });
    return rows.map((r) => r.contact);
  }

  if (targeting.targetStatus) {
    const contacts = await db.contact.findMany({
      where: {
        status: targeting.targetStatus,
        ...(targeting.targetLocationId
          ? { locationId: targeting.targetLocationId }
          : {}),
      },
      select,
    });
    return contacts;
  }

  return [];
}

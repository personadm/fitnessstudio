import { db } from "./db";

// ─────────────────────────────────────────────────────────────
// Fester Standort für Online-Eintragungen und -Anmeldungen
//
// Der Standort Ahaus (Villa-Fit) schließt zum Jahresende. Deshalb gibt es in
// den öffentlichen Formularen (Gratis-Start-Plan auf "/", Anmeldung auf
// "/anmelden") keine Studioauswahl mehr: Jede neue Eintragung/Anmeldung läuft
// serverseitig fest auf Vital-Fit Ochtrup — unabhängig davon, was ein
// (ggf. noch gecachter alter) Client als locationId mitschickt.
//
// Bestehende Kontakte mit Ahaus bleiben unverändert; der Admin kann Standorte
// weiterhin frei zuordnen.
// ─────────────────────────────────────────────────────────────

/** Ort des Online-Standorts (Location.city in der DB, z. B. "Ochtrup"). */
export const SIGNUP_LOCATION_CITY = "Ochtrup";

export type SignupLocation = { id: string; name: string };

/**
 * Ermittelt den aktiven Standort in Ochtrup (Treffer über Ort ODER Name,
 * damit ein späteres Umbenennen im Admin nicht still bricht).
 * Gibt null zurück, wenn keiner existiert — die Eintragung geht dann ohne
 * Standort durch (wie früher ohne aktive Standorte), es wird aber laut geloggt.
 */
export async function resolveSignupLocation(): Promise<SignupLocation | null> {
  const location = await db.location.findFirst({
    where: {
      active: true,
      OR: [
        { city: { equals: SIGNUP_LOCATION_CITY, mode: "insensitive" } },
        { name: { contains: SIGNUP_LOCATION_CITY, mode: "insensitive" } },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true },
  });

  if (!location) {
    console.error(
      `[signup-location] Kein aktiver Standort "${SIGNUP_LOCATION_CITY}" gefunden — Eintragung ohne Standort gespeichert.`,
    );
  }
  return location;
}

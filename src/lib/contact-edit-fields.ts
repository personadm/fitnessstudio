// Zod-freier Teil der Kontakt-Bearbeitung: Feldliste, Typen, Labels.
// Eigenes Modul, damit Client-Komponenten es importieren können, ohne
// zod & die Server-Validierung ins Browser-Bundle zu ziehen.

export const CONTACT_EDIT_FIELDS = [
  "email",
  "firstName",
  "lastName",
  "gender",
  "phone",
  "birthDate",
  "street",
  "postalCode",
  "city",
  "locationId",
  "pricingPlanId",
  "iban",
  "contractStartDate",
  "memberSince",
  "memberUntil",
] as const;

export type ContactEditField = (typeof CONTACT_EDIT_FIELDS)[number];

/** Formularwerte so, wie sie im Formular stehen (immer Strings). */
export type ContactFormValues = Record<ContactEditField, string>;

/** Name des Hidden-Felds mit den Ausgangswerten des Formulars. */
export const ORIGINAL_VALUES_FIELD = "__original";

/** Deutsche Feldnamen — für Verlauf/Änderungsprotokoll. */
export const CONTACT_EDIT_LABELS: Record<ContactEditField, string> = {
  email: "E-Mail",
  firstName: "Vorname",
  lastName: "Nachname",
  gender: "Geschlecht",
  phone: "Telefon",
  birthDate: "Geburtsdatum",
  street: "Straße",
  postalCode: "PLZ",
  city: "Ort",
  locationId: "Standort",
  pricingPlanId: "Tarif",
  iban: "IBAN",
  contractStartDate: "Vertragsstart",
  memberSince: "Mitglied seit",
  memberUntil: "Mitglied bis",
};

/** Feldnamen aus dem Event-Meta (Json) robust in Labels übersetzen. */
export function describeChangedFields(meta: unknown): string {
  const fields =
    meta && typeof meta === "object" && Array.isArray((meta as { fields?: unknown }).fields)
      ? ((meta as { fields: unknown[] }).fields as unknown[])
      : [];
  return fields
    .map((f) =>
      typeof f === "string" && f in CONTACT_EDIT_LABELS
        ? CONTACT_EDIT_LABELS[f as ContactEditField]
        : null,
    )
    .filter((l): l is string => l !== null)
    .join(", ");
}

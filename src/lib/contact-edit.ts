import { z } from "zod";
import type { Gender, Prisma } from "@prisma/client";

// ─────────────────────────────────────────────────────────────
// Kontakt bearbeiten (Admin) — Validierung + Änderungs-Diff
//
// Bewusst NICHT editierbar: Status (eigener Button mit Funnel-Logik),
// Notizen/Listen (eigene Aktionen), Herkunft, DOI/Consent, Tokens,
// Anmeldezeitpunkt — das sind System-/Nachweisdaten.
//
// Kernprinzip: Es werden NUR Felder geprüft und geschrieben, die der Admin
// im Formular tatsächlich verändert hat (Vergleich mit den Werten, mit denen
// das Formular geöffnet wurde). Dadurch
//  - überschreibt das Speichern keine Änderungen, die in der Zwischenzeit
//    jemand anders gemacht hat (Status-Button, Online-Anmeldung, Import …),
//  - blockieren ungültige Altdaten in unberührten Feldern (z. B. eine nie
//    geprüfte IBAN) nicht das Speichern anderer Felder.
// ─────────────────────────────────────────────────────────────

export {
  CONTACT_EDIT_FIELDS,
  CONTACT_EDIT_LABELS,
  ORIGINAL_VALUES_FIELD,
  describeChangedFields,
  type ContactEditField,
  type ContactFormValues,
} from "./contact-edit-fields";
import {
  CONTACT_EDIT_FIELDS,
  type ContactEditField,
  type ContactFormValues,
} from "./contact-edit-fields";

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** true für ein real existierendes Kalenderdatum im Format YYYY-MM-DD. */
export function isIsoDate(value: string): boolean {
  const m = ISO_DATE_RE.exec(value);
  if (!m) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (year < MIN_YEAR || year > MAX_YEAR) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** Date → "YYYY-MM-DD" (UTC, passend zu @db.Date) für <input type="date">. */
export function toDateInput(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

/** IBAN normalisieren: Leer-/Trennzeichen raus, Großbuchstaben. */
export function normalizeIban(value: string): string {
  return value.replace(/[\s-]+/g, "").toUpperCase();
}

/** Formale IBAN-Prüfung inkl. Prüfziffer (ISO 13616, mod 97). */
export function isValidIban(value: string): boolean {
  const iban = normalizeIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const digits = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const digit of digits) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder === 1;
}

// ─── Validierung (pro Feld) ───────────────────────────────────

const toStr = (v: unknown) => (v == null ? "" : String(v));

const text = (max: number, label: string) =>
  z.preprocess(
    toStr,
    z.string().trim().max(max, `${label} ist zu lang (max. ${max} Zeichen).`),
  );

const isoDate = (label: string) =>
  z.preprocess(
    toStr,
    z
      .string()
      .trim()
      .refine((v) => v === "" || isIsoDate(v), `${label}: bitte ein gültiges Datum angeben.`),
  );

const id = z.preprocess(toStr, z.string().trim().max(64));

export const contactEditSchema = z.object({
  email: z.preprocess(
    (v) => toStr(v).trim().toLowerCase(),
    z
      .string()
      .min(1, "E-Mail-Adresse fehlt.")
      .max(254, "E-Mail-Adresse ist zu lang.")
      .email("Bitte eine gültige E-Mail-Adresse angeben."),
  ),
  firstName: text(80, "Vorname"),
  lastName: text(80, "Nachname"),
  gender: z.preprocess(
    (v) => (v == null || v === "" ? null : v),
    z
      .enum(["MAENNLICH", "WEIBLICH", "DIVERS"], {
        errorMap: () => ({ message: "Ungültige Auswahl beim Geschlecht." }),
      })
      .nullable(),
  ),
  phone: text(40, "Telefon"),
  birthDate: isoDate("Geburtsdatum").refine(
    (v) => v === "" || v <= toDateInput(new Date()),
    "Geburtsdatum darf nicht in der Zukunft liegen.",
  ),
  street: text(120, "Straße"),
  postalCode: text(10, "PLZ"),
  city: text(80, "Ort"),
  locationId: id,
  pricingPlanId: id,
  iban: z.preprocess(
    (v) => normalizeIban(toStr(v)),
    z
      .string()
      .refine((v) => v === "" || isValidIban(v), "IBAN ist ungültig (Format oder Prüfziffer)."),
  ),
  contractStartDate: isoDate("Vertragsstart"),
  memberSince: isoDate("Mitglied seit"),
  memberUntil: isoDate("Mitglied bis"),
});

export type ContactEditInput = z.infer<typeof contactEditSchema>;

// ─── DB-Snapshot ↔ Formularwerte ──────────────────────────────

/** Aktueller DB-Stand der editierbaren Felder (Select-Shape für Prisma). */
export const CONTACT_EDIT_SELECT = {
  email: true,
  firstName: true,
  lastName: true,
  gender: true,
  phone: true,
  birthDate: true,
  street: true,
  postalCode: true,
  city: true,
  locationId: true,
  pricingPlanId: true,
  iban: true,
  contractStartDate: true,
  memberSince: true,
  memberUntil: true,
} as const satisfies Record<ContactEditField, true>;

export type ContactEditSnapshot = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  gender: Gender | null;
  phone: string | null;
  birthDate: Date | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  locationId: string | null;
  pricingPlanId: string | null;
  iban: string | null;
  contractStartDate: Date | null;
  memberSince: Date | null;
  memberUntil: Date | null;
};

const DATE_FIELDS = ["birthDate", "contractStartDate", "memberSince", "memberUntil"] as const;
type DateField = (typeof DATE_FIELDS)[number];
type TextField = Exclude<ContactEditField, DateField | "email" | "gender">;

const isDateField = (f: ContactEditField): f is DateField =>
  (DATE_FIELDS as readonly ContactEditField[]).includes(f);
const isTextField = (f: ContactEditField): f is TextField =>
  !isDateField(f) && f !== "email" && f !== "gender";

/** DB-Stand → Formularwerte (so wird das Formular vorausgefüllt). */
export function toContactFormValues(snapshot: ContactEditSnapshot): ContactFormValues {
  const values = {} as ContactFormValues;
  for (const field of CONTACT_EDIT_FIELDS) {
    const v = snapshot[field];
    values[field] = v instanceof Date ? toDateInput(v) : (v ?? "");
  }
  return values;
}

/** Werte aus FormData lesen (fehlende Felder → ""). */
export function readContactFormValues(formData: FormData): ContactFormValues {
  const values = {} as ContactFormValues;
  for (const field of CONTACT_EDIT_FIELDS) values[field] = toStr(formData.get(field));
  return values;
}

/** Hidden-Feld mit Ausgangswerten parsen; null bei fehlendem/kaputtem Inhalt. */
export function parseOriginalValues(raw: unknown): ContactFormValues | null {
  if (typeof raw !== "string" || raw.length > 20_000) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const values = {} as ContactFormValues;
  for (const field of CONTACT_EDIT_FIELDS) {
    const v = (parsed as Record<string, unknown>)[field];
    if (typeof v !== "string") return null;
    values[field] = v;
  }
  return values;
}

/**
 * Vergleichsform eines Werts: Zeilenumbrüche raus (Browser entfernen sie aus
 * einzeiligen Feldern — sonst gälten importierte Altwerte wie "Anna\nMaria"
 * immer als geändert), trim, E-Mail klein, IBAN ohne Leerzeichen.
 */
function comparable(field: ContactEditField, value: string): string {
  const v = value.replace(/[\r\n]+/g, "").trim();
  if (field === "email") return v.toLowerCase();
  if (field === "iban") return normalizeIban(v);
  return v;
}

/** Felder, die im Formular gegenüber den Ausgangswerten verändert wurden. */
export function findDirtyFields(
  submitted: ContactFormValues,
  original: ContactFormValues,
): ContactEditField[] {
  return CONTACT_EDIT_FIELDS.filter(
    (f) => comparable(f, submitted[f]) !== comparable(f, original[f]),
  );
}

export type DirtyValidation =
  | { ok: true; values: Partial<ContactEditInput> }
  | { ok: false; fieldErrors: Partial<Record<ContactEditField, string>> };

/** Validiert NUR die veränderten Felder. */
export function validateDirtyFields(
  submitted: ContactFormValues,
  dirty: readonly ContactEditField[],
): DirtyValidation {
  const mask = Object.fromEntries(dirty.map((f) => [f, true])) as Partial<
    Record<ContactEditField, true>
  >;
  const result = contactEditSchema.pick(mask).safeParse(submitted);
  if (result.success) return { ok: true, values: result.data as Partial<ContactEditInput> };

  const fieldErrors: Partial<Record<ContactEditField, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as ContactEditField | undefined;
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return { ok: false, fieldErrors };
}

/**
 * Baut das Prisma-Update aus den veränderten Feldern. Ein Feld wird nur
 * geschrieben, wenn sich der neue Wert vom aktuellen DB-Stand unterscheidet
 * (leere Strings und null gelten als gleich — Landing-Leads speichern z. B.
 * den Nachnamen als "").
 */
export function buildContactUpdate(
  current: ContactEditSnapshot,
  values: Partial<ContactEditInput>,
  dirty: readonly ContactEditField[],
): { data: Prisma.ContactUncheckedUpdateInput; changedFields: ContactEditField[] } {
  const data: Prisma.ContactUncheckedUpdateInput = {};
  const changedFields: ContactEditField[] = [];

  for (const field of dirty) {
    const next = values[field] ?? null;
    const prevRaw = current[field];
    const prev =
      prevRaw instanceof Date ? toDateInput(prevRaw) : comparable(field, prevRaw ?? "");
    if ((next ?? "") === prev) continue;

    if (isDateField(field)) {
      data[field] = next ? new Date(`${next}T00:00:00.000Z`) : null;
    } else if (isTextField(field)) {
      data[field] = (next as string) || null;
    } else if (field === "email") {
      data.email = next as string;
    } else {
      data.gender = (next as Gender | null) || null;
    }
    changedFields.push(field);
  }

  return { data, changedFields };
}

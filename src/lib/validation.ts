import { z } from "zod";

// Einheitlicher Versand-Guard für ALLE Mail-Wege (Funnels + Kampagnen).
//
// Resend akzeptiert im `to`-Feld nur eine gültige Einzeladresse
// (email@example.com). Die früher genutzte lose Regex
// /^[^\s@]+@[^\s@]+\.[^\s@]+$/ ließ u.a. Adressen mit Komma oder Semikolon
// durch (z.B. "max,muster@web.de") — Resend liest das als Adressliste, findet
// einen ungültigen Teil und lehnt mit "Invalid `to` field" ab. Zods Parser
// liegt deutlich näher an Resends Erwartung und fängt diese Fälle vorab ab.
const sendableEmailSchema = z.string().trim().email();

export function isSendableEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return sendableEmailSchema.safeParse(email).success;
}

export const leadSchema = z.object({
  email: z.string().trim().toLowerCase().email("Bitte gültige E-Mail-Adresse angeben."),
  firstName: z.string().trim().min(1, "Vorname fehlt.").max(80),
  // Nachname & Geschlecht im neuen Hero-Form nicht mehr abgefragt → optional.
  // Bestehende Leads (z.B. via Admin-Import) können sie weiterhin mitsenden.
  lastName: z.string().trim().max(80).optional().default(""),
  gender: z.enum(["MAENNLICH", "WEIBLICH", "DIVERS"]).optional().nullable(),
  locationId: z.string().trim().optional().nullable(),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Bitte setz noch das Häkchen, dann schicken wir dir dein Angebot." }),
  }),
});
export type LeadInput = z.infer<typeof leadSchema>;

// Normalisiert eine Geburtsdatums-Eingabe auf ISO (YYYY-MM-DD) oder gibt null
// zurück, wenn die Eingabe kein gültiges Datum ist.
//
// Akzeptiert beide Formate:
//   - ISO „YYYY-MM-DD" (nativer <input type="date">-Picker)
//   - Deutsch „TT.MM.JJJJ" (tritt auf, wenn ein In-App-/WebView-Browser
//     type="date" als reines Textfeld rendert und der Nutzer manuell tippt)
export function normalizeBirthDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  let year: number;
  let month: number;
  let day: number;

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const de = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);

  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (de) {
    day = Number(de[1]);
    month = Number(de[2]);
    year = Number(de[3]);
  } else {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Plausibler Geburtsjahr-Bereich — fängt Tippfehler & In-App-Picker-Defaults ab.
  if (year < 1900 || year > 2100) return null;

  // Echtheits-Check (fängt z. B. 31.02. ab) — UTC vermeidet Zeitzonen-Verschiebung.
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

// Pflicht-Textfeld, das null/undefined tolerant zu "" coercet (statt eine
// kryptische „Expected string, received null"-Default-Meldung zu werfen) und
// dann eine verständliche deutsche Meldung liefert.
const requiredText = (message: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim()),
    z.string().min(1, message),
  );

// Optionales Textfeld: null/undefined → "" (immer ein String, nie null).
const optionalText = () =>
  z.preprocess((v) => (v == null ? "" : v), z.string().trim());

export const signupSchema = z
  .object({
    email: z.preprocess(
      (v) => (typeof v === "string" ? v.trim().toLowerCase() : v == null ? "" : v),
      z.string().email("Bitte gib eine gültige E-Mail-Adresse an."),
    ),
    firstName: requiredText("Bitte gib deinen Vornamen an."),
    lastName: requiredText("Bitte gib deinen Nachnamen an."),
    // Im neuen Hero-Form von /anmelden nicht mehr abgefragt — optional.
    gender: z.enum(["MAENNLICH", "WEIBLICH", "DIVERS"]).optional().nullable(),
    phone: optionalText(),
    birthDate: optionalText()
      .refine((v) => v.length > 0, "Bitte gib dein Geburtsdatum an.")
      .transform((v, ctx) => {
        const isoDate = normalizeBirthDate(v);
        if (!isoDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Bitte gib ein gültiges Geburtsdatum ein (z. B. 20.11.1989).",
          });
          return z.NEVER;
        }
        return isoDate;
      }),
    street: requiredText("Bitte gib deine Straße & Hausnummer an."),
    postalCode: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim()),
      z.string().min(4, "Bitte gib eine gültige PLZ an."),
    ),
    city: requiredText("Bitte gib deine Stadt an."),
    // IBAN und Vertragsstart: im neuen UI nicht mehr abgefragt — optional.
    // /api/signup speichert null wenn leer (Prisma erlaubt das).
    iban: optionalText(),
    contractStartDate: optionalText().refine(
      (v) => !v || !Number.isNaN(Date.parse(v)),
      "Ungültiges Vertragsstart-Datum.",
    ),
    pricingPlanId: z.preprocess(
      (v) => (v == null ? "" : v),
      z.string().min(1, "Bitte wähle einen Tarif aus."),
    ),
    locationId: z.string().trim().optional().nullable(),
    ref: z.string().optional().nullable(),
    // Consent: entweder das alte einzelne `consent: true` ODER beide neuen Felder.
    consent: z.boolean().optional(),
    agbConsent: z.boolean().optional(),
    datenschutzConsent: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.consent === true ||
      (data.agbConsent === true && data.datenschutzConsent === true),
    {
      message: "Bitte AGB und Datenschutz akzeptieren.",
      path: ["consent"],
    },
  );
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Passwort fehlt."),
});
export type LoginInput = z.infer<typeof loginSchema>;

// Top-Highlight: bis zu 3 pro Plan, werden auf /anmelden groß angezeigt
export const topHighlightSchema = z.object({
  text: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(120).optional().default(""),
  isGold: z.boolean().default(false),
});
export type TopHighlight = z.infer<typeof topHighlightSchema>;

export const planSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().or(z.literal("")),
  priceCents: z.coerce.number().int().min(0),
  billingInterval: z.enum([
    "MONATLICH",
    "QUARTALSWEISE",
    "HALBJAEHRLICH",
    "JAEHRLICH",
    "EINMALIG",
  ]),
  highlights: z.array(z.string()).default([]),
  topHighlights: z.array(topHighlightSchema).max(3).default([]),
  agb: z.string().optional().or(z.literal("")),
  availableOnline: z.boolean().default(true),
  availableOffline: z.boolean().default(true),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
  locationId: z.string().trim().optional().nullable(),
});
export type PlanInput = z.infer<typeof planSchema>;

export const campaignSchema = z.object({
  // Zielgruppe-Modus: entweder eine Liste ODER ein Status-Filter
  targetMode: z.enum(["LIST", "STATUS"]).default("LIST"),
  // Wenn LIST → listId muss gesetzt sein
  listId: z.string().trim().optional().nullable(),
  // Wenn STATUS → targetStatus muss gesetzt sein
  targetStatus: z
    .enum(["INTERESSENT", "NEUKUNDE", "KUNDE", "EHEMALIGER"])
    .optional()
    .nullable(),
  // Optional: zusätzlicher Standort-Filter
  targetLocationId: z.string().trim().optional().nullable(),
  subject: z.string().trim().min(1, "Betreff fehlt.").max(200),
  bodyHtml: z.string().min(1, "Inhalt fehlt."),
});
export type CampaignInput = z.infer<typeof campaignSchema>;

// ─────────────────────────────────────────────────────────────
// Phase 6 - Funnels
// ─────────────────────────────────────────────────────────────

export const funnelSchema = z.object({
  name: z.string().trim().min(1, "Name fehlt.").max(100),
  trigger: z.enum(["INTERESSENT", "NEUKUNDE", "KUNDE", "EHEMALIGER"], {
    errorMap: () => ({ message: "Bitte Auslöser wählen." }),
  }),
  active: z.boolean().default(true),
  autoStop: z.boolean().default(true),
  locationId: z.string().trim().optional().nullable(),
  // Optional: zeitgesteuerter Versand (z.B. Mittwochs 9:00 alle 2 Wochen)
  scheduleWeekday: z.coerce.number().int().min(0).max(6).optional().nullable(),
  scheduleWeekInterval: z.coerce.number().int().min(1).max(52).default(1),
  scheduleHour: z.coerce.number().int().min(0).max(23).default(9),
  scheduleMinute: z.coerce.number().int().min(0).max(59).default(0),
});
export type FunnelInput = z.infer<typeof funnelSchema>;

export const funnelStepSchema = z.object({
  funnelId: z.string().min(1),
  delayDays: z.coerce.number().int().min(0).max(3650),
  delayHours: z.coerce.number().int().min(0).max(23).default(0),
  subject: z.string().trim().min(1, "Betreff fehlt.").max(200),
  bodyHtml: z.string().min(1, "Inhalt fehlt."),
});
export type FunnelStepInput = z.infer<typeof funnelStepSchema>;

// KI-generierter Funnel (komplett) — wird aus der KI-Vorschau übernommen und
// als Funnel + Steps angelegt. delayDays/Hours kommen direkt aus der KI.
export const aiFunnelSchema = z.object({
  name: z.string().trim().min(1, "Name fehlt.").max(120),
  trigger: z.enum(["INTERESSENT", "NEUKUNDE", "KUNDE", "EHEMALIGER"], {
    errorMap: () => ({ message: "Bitte Auslöser wählen." }),
  }),
  locationId: z.string().trim().optional().nullable(),
  steps: z
    .array(
      z.object({
        delayDays: z.coerce.number().int().min(0).max(3650),
        delayHours: z.coerce.number().int().min(0).max(23).default(0),
        subject: z.string().trim().min(1, "Betreff fehlt.").max(200),
        bodyHtml: z.string().min(1, "Inhalt fehlt."),
      }),
    )
    .min(1, "Mindestens ein Schritt nötig.")
    .max(20),
});
export type AiFunnelInput = z.infer<typeof aiFunnelSchema>;

// ─────────────────────────────────────────────────────────────
// Standort-Verwaltung (Admin)
// ─────────────────────────────────────────────────────────────

export const locationSchema = z.object({
  name: z.string().trim().min(1, "Name fehlt."),
  street: z.string().trim().optional().or(z.literal("")),
  postalCode: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().optional().or(z.literal("")),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});
export type LocationInput = z.infer<typeof locationSchema>;

// ─────────────────────────────────────────────────────────────
// Club-Anmeldung (Admin-internes Formular)
// ─────────────────────────────────────────────────────────────

export const clubSignupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Bitte gültige E-Mail-Adresse angeben."),
  firstName: z.string().trim().min(1, "Vorname fehlt."),
  lastName: z.string().trim().min(1, "Nachname fehlt."),
  gender: z.enum(["MAENNLICH", "WEIBLICH", "DIVERS"], {
    errorMap: () => ({ message: "Bitte Geschlecht angeben." }),
  }),
  phone: z.string().trim().optional().or(z.literal("")),
  birthDate: z.string().trim().optional().or(z.literal("")),
  street: z.string().trim().optional().or(z.literal("")),
  postalCode: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  iban: z.string().trim().optional().or(z.literal("")),
  contractStartDate: z.string().trim().optional().or(z.literal("")),
  pricingPlanId: z.string().trim().optional().or(z.literal("")),
  locationId: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  staff: z.string().trim().min(1, "Mitarbeiter-Name fehlt."),
  signupMode: z.enum(["OFFLINE", "ONLINE"]).default("OFFLINE"),
});
export type ClubSignupInput = z.infer<typeof clubSignupSchema>;

import { z } from "zod";

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

export const signupSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Bitte gültige E-Mail-Adresse angeben."),
    firstName: z.string().trim().min(1, "Vorname fehlt."),
    lastName: z.string().trim().min(1, "Nachname fehlt."),
    // Im neuen Hero-Form von /anmelden nicht mehr abgefragt — optional.
    gender: z.enum(["MAENNLICH", "WEIBLICH", "DIVERS"]).optional().nullable(),
    phone: z.string().trim().optional().or(z.literal("")),
    birthDate: z
      .string()
      .trim()
      .min(1, "Geburtsdatum fehlt.")
      .refine((v) => !Number.isNaN(Date.parse(v)), "Ungültiges Geburtsdatum."),
    street: z.string().trim().min(1, "Straße fehlt."),
    postalCode: z.string().trim().min(4, "PLZ fehlt."),
    city: z.string().trim().min(1, "Stadt fehlt."),
    // IBAN und Vertragsstart: im neuen UI nicht mehr abgefragt — optional.
    // /api/signup speichert null wenn leer (Prisma erlaubt das).
    iban: z.string().trim().optional().or(z.literal("")),
    contractStartDate: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Ungültiges Vertragsstart-Datum."),
    pricingPlanId: z.string().min(1, "Bitte einen Tarif auswählen."),
    locationId: z.string().trim().optional().nullable(),
    ref: z.string().optional(),
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

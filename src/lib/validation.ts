import { z } from "zod";

export const leadSchema = z.object({
  email: z.string().trim().toLowerCase().email("Bitte gültige E-Mail-Adresse angeben."),
  firstName: z.string().trim().min(1, "Vorname fehlt.").max(80),
  lastName: z.string().trim().min(1, "Nachname fehlt.").max(80),
  gender: z.enum(["MAENNLICH", "WEIBLICH", "DIVERS"], {
    errorMap: () => ({ message: "Bitte Geschlecht angeben." }),
  }),
  locationId: z.string().optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Bitte stimme der Datenverarbeitung zu." }),
  }),
});
export type LeadInput = z.infer<typeof leadSchema>;

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Bitte gültige E-Mail-Adresse angeben."),
  firstName: z.string().trim().min(1, "Vorname fehlt."),
  lastName: z.string().trim().min(1, "Nachname fehlt."),
  gender: z.enum(["MAENNLICH", "WEIBLICH", "DIVERS"], {
    errorMap: () => ({ message: "Bitte Geschlecht angeben." }),
  }),
  phone: z.string().trim().optional().or(z.literal("")),
  birthDate: z.string().trim().min(1, "Geburtsdatum fehlt."),
  street: z.string().trim().min(1, "Straße fehlt."),
  postalCode: z.string().trim().min(4, "PLZ fehlt."),
  city: z.string().trim().min(1, "Stadt fehlt."),
  iban: z.string().trim().min(15, "IBAN fehlt.").max(34),
  contractStartDate: z.string().trim().min(1, "Vertragsstart fehlt."),
  pricingPlanId: z.string().min(1, "Bitte einen Tarif auswählen."),
  locationId: z.string().optional(),
  ref: z.string().optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Bitte AGB und Datenschutz akzeptieren." }),
  }),
});
export type SignupInput = z.infer<typeof signupSchema>;

// Club-interne Anmeldung durch Mitarbeiter:in am Laptop.
// Kein DOI, Status direkt NEUKUNDE.
export const clubSignupSchema = z.object({
  staff: z.string().trim().min(1, "Mitarbeitername fehlt.").max(80),
  signupMode: z.enum(["OFFLINE", "ONLINE"], {
    errorMap: () => ({ message: "Bitte angeben: im Club oder online." }),
  }),
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
  pricingPlanId: z.string().optional().or(z.literal("")),
  locationId: z.string().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});
export type ClubSignupInput = z.infer<typeof clubSignupSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Passwort fehlt."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const planSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().or(z.literal("")),
  priceCents: z.coerce.number().int().min(0),
  billingInterval: z.enum(["MONATLICH", "QUARTALSWEISE", "HALBJAEHRLICH", "JAEHRLICH", "EINMALIG"]),
  highlights: z.array(z.string()).default([]),
  agb: z.string().optional().or(z.literal("")),
  availableOnline: z.boolean().default(true),
  availableOffline: z.boolean().default(true),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
  locationId: z.string().optional().nullable(),
});
export type PlanInput = z.infer<typeof planSchema>;

// Campaign: ENTWEDER listId ODER targetStatus muss gesetzt sein.
// targetLocationId optional in beiden Fällen.
export const campaignSchema = z
  .object({
    targetMode: z.enum(["LIST", "STATUS"]),
    listId: z.string().optional().nullable(),
    targetStatus: z
      .enum(["INTERESSENT", "NEUKUNDE", "KUNDE", "EHEMALIGER"])
      .optional()
      .nullable(),
    targetLocationId: z.string().optional().nullable(),
    subject: z.string().trim().min(1, "Betreff fehlt.").max(200),
    bodyHtml: z.string().min(1, "Inhalt fehlt."),
  })
  .refine(
    (v) =>
      (v.targetMode === "LIST" && !!v.listId) ||
      (v.targetMode === "STATUS" && !!v.targetStatus),
    { message: "Bitte Empfänger-Modus mit gültiger Auswahl angeben." },
  );
export type CampaignInput = z.infer<typeof campaignSchema>;

export const funnelSchema = z.object({
  name: z.string().trim().min(1, "Name fehlt.").max(100),
  trigger: z.enum(["INTERESSENT", "NEUKUNDE", "KUNDE", "EHEMALIGER"], {
    errorMap: () => ({ message: "Bitte Auslöser wählen." }),
  }),
  active: z.boolean().default(true),
  autoStop: z.boolean().default(true),
  locationId: z.string().optional().nullable(),
});
export type FunnelInput = z.infer<typeof funnelSchema>;

export const funnelStepSchema = z.object({
  funnelId: z.string().min(1),
  delayDays: z.coerce.number().int().min(0).max(3650),
  subject: z.string().trim().min(1, "Betreff fehlt.").max(200),
  bodyHtml: z.string().min(1, "Inhalt fehlt."),
});
export type FunnelStepInput = z.infer<typeof funnelStepSchema>;

export const locationSchema = z.object({
  name: z.string().trim().min(1, "Name fehlt.").max(80),
  street: z.string().trim().optional().or(z.literal("")),
  postalCode: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ungültige E-Mail.")
    .optional()
    .or(z.literal("")),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});
export type LocationInput = z.infer<typeof locationSchema>;

import { z } from "zod";

export const leadSchema = z.object({
  email: z.string().trim().toLowerCase().email("Bitte gültige E-Mail-Adresse angeben."),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Bitte stimme der Datenverarbeitung zu." }),
  }),
});
export type LeadInput = z.infer<typeof leadSchema>;

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Bitte gültige E-Mail-Adresse angeben."),
  firstName: z.string().trim().min(1, "Vorname fehlt."),
  lastName: z.string().trim().min(1, "Nachname fehlt."),
  phone: z.string().trim().optional().or(z.literal("")),
  birthDate: z.string().trim().min(1, "Geburtsdatum fehlt."),
  street: z.string().trim().min(1, "Straße fehlt."),
  postalCode: z.string().trim().min(4, "PLZ fehlt."),
  city: z.string().trim().min(1, "Stadt fehlt."),
  pricingPlanId: z.string().min(1, "Bitte einen Tarif auswählen."),
  ref: z.string().optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Bitte AGB und Datenschutz akzeptieren." }),
  }),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Passwort fehlt."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const planSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().or(z.literal("")),
  priceCents: z.coerce.number().int().min(0),
  billingInterval: z.enum(["MONATLICH", "QUARTALSWEISE", "HALBJAEHRLICH", "JAEHRLICH"]),
  highlights: z.array(z.string()).default([]),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});
export type PlanInput = z.infer<typeof planSchema>;

export const campaignSchema = z.object({
  listId: z.string().min(1, "Bitte eine Liste wählen."),
  subject: z.string().trim().min(1, "Betreff fehlt.").max(150),
  bodyHtml: z.string().min(1, "Inhalt fehlt."),
});
export type CampaignInput = z.infer<typeof campaignSchema>;

import { z } from "zod";

export const leadSchema = z.object({
  email: z.string().trim().toLowerCase().email("Bitte gültige E-Mail-Adresse angeben."),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Bitte stimme der Datenverarbeitung zu." }),
  }),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  firstName: z.string().trim().min(1, "Vorname fehlt."),
  lastName: z.string().trim().min(1, "Nachname fehlt."),
  phone: z.string().trim().optional(),
  birthDate: z.coerce.date().optional(),
  street: z.string().trim().min(1),
  postalCode: z.string().trim().min(4),
  city: z.string().trim().min(1),
  pricingPlanId: z.string().min(1, "Bitte einen Tarif auswählen."),
  ref: z.string().optional(), // Tracking-Token aus der Preis-Mail
  consent: z.literal(true),
});

export type SignupInput = z.infer<typeof signupSchema>;

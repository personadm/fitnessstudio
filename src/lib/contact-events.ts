// ContactEvent-Typen, die an mehreren Stellen geschrieben UND gelesen werden
// (z. B. Anmelde-Routen schreiben, Live-Liste liest). Ältere Typen stehen noch
// als String-Literale im Code; neue bitte hier ergänzen.
export const CONTACT_EVENT = {
  /** Nur-Newsletter-Kontakt hat den Gratis-Start-Plan angefordert → Interessent. */
  NEWSLETTER_TO_LEAD: "NEWSLETTER_TO_LEAD",
  /** Nur-Newsletter-Kontakt hat sich fürs 6-Wochen-Programm angemeldet → Neukunde. */
  NEWSLETTER_TO_SIGNUP: "NEWSLETTER_TO_SIGNUP",
  /** Statuswechsel (Admin von Hand oder automatisch nach dem Neukunden-Funnel). */
  STATUS_CHANGED: "STATUS_CHANGED",
} as const;

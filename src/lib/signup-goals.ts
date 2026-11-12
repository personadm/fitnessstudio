// ─────────────────────────────────────────────────────────────
// Anmeldung (/anmelden): Ziel-Auswahl + freiwillige Anmerkung
//
// Client-sicher (kein zod/Prisma): wird vom Formular, der API und dem
// Admin-Dashboard gemeinsam genutzt.
//
// DATENSCHUTZ: Ziel und Anmerkung können Gesundheitsangaben enthalten. Sie
// werden NUR an /api/signup geschickt und in der DB gespeichert — niemals an
// Meta-Pixel, Google-Tag, Push-Benachrichtigungen, Event-Protokolle oder Logs.
// ─────────────────────────────────────────────────────────────

export const SIGNUP_GOALS = [
  { id: "WOHLFUEHLFIGUR", label: "Wohlfühlfigur" },
  { id: "SCHMERZFREI", label: "Schmerzfrei" },
  { id: "WIEDER_FIT", label: "Wieder fit werden" },
] as const;

export type SignupGoalId = (typeof SIGNUP_GOALS)[number]["id"];

export const SIGNUP_GOAL_IDS = SIGNUP_GOALS.map((g) => g.id) as [
  SignupGoalId,
  ...SignupGoalId[],
];

/** Maximale Länge der freiwilligen Anmerkung (Zeichen). */
export const SIGNUP_NOTE_MAX = 1000;

const LABEL_BY_ID: Record<string, string> = Object.fromEntries(
  SIGNUP_GOALS.map((g) => [g.id, g.label]),
);

/**
 * Gespeicherte Ziel-IDs → Klartext fürs Dashboard ("Wohlfühlfigur, Schmerzfrei").
 * Reihenfolge wie im Formular; unbekannte Werte werden unverändert angezeigt.
 */
export function formatSignupGoals(ids: readonly string[] | null | undefined): string {
  if (!ids || ids.length === 0) return "";
  const known = SIGNUP_GOALS.filter((g) => ids.includes(g.id)).map((g) => g.label);
  const unknown = ids.filter((id) => !LABEL_BY_ID[id]);
  return [...known, ...unknown].join(", ");
}

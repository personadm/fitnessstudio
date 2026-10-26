/** Ansichten der Team-Seite; Konten und Prüfung nur mit dem Leitungs-Code. */
export type PlanViewMode = "woche" | "liste" | "tag";
export type LeitungViewMode = "konten" | "pruefung";
export type ViewMode = PlanViewMode | LeitungViewMode;

export const PLAN_VIEWS: readonly PlanViewMode[] = ["woche", "liste", "tag"];
export const LEITUNG_VIEWS: readonly LeitungViewMode[] = ["konten", "pruefung"];

export const VIEW_LABELS: Record<ViewMode, string> = {
  woche: "Woche",
  liste: "Liste",
  tag: "Tag",
  konten: "Konten",
  pruefung: "Prüfung",
};

export function isPlanView(view: ViewMode): view is PlanViewMode {
  return (PLAN_VIEWS as readonly string[]).includes(view);
}

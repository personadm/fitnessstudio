import type { EventCategory, ShiftKind } from "./plan";

/** Feste Farbe pro Person; weiße Schrift erreicht auf allen Tönen ≥ 4,5:1. */
const PERSON_COLORS: Record<string, string> = {
  Lou: "#1E5F74",
  Lina: "#7B3FA0",
  Samuel: "#2F6F35",
  Milena: "#6B655C",
  Falk: "#B5400F",
};
const FALLBACK_COLORS = ["#3D4F8C", "#8C3D5A", "#4F6B2A"];

export function personColor(name: string, index = 0): string {
  return PERSON_COLORS[name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

/** Hex → rgba, für getönte Abwesenheits-Balken. */
export function tint(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface KindStyle {
  label: string;
  /** Kurzlabel für schmale Balken */
  short: string;
  /** true = Arbeit auf der Fläche, false = angerechnete Abwesenheit/Termin außer Haus */
  isFloor: boolean;
}

export const KIND_STYLES: Record<ShiftKind, KindStyle> = {
  Studio: { label: "Studio", short: "", isFloor: true },
  Urlaub: { label: "Urlaub", short: "Urlaub", isFloor: false },
  Schule: { label: "Schule", short: "Schule", isFloor: false },
  Ahaus: { label: "Ahaus (extern)", short: "Ahaus", isFloor: false },
  "Five-Schulung": { label: "Five-Schulung", short: "Schulung", isFloor: false },
};

interface CategoryStyle {
  label: string;
  short: string;
  color: string;
}

export const EVENT_STYLES: Record<EventCategory, CategoryStyle> = {
  kurs: { label: "Kurs", short: "Kurs", color: "#1A1815" },
  meeting: { label: "Teammeeting", short: "Meeting", color: "#1A1815" },
  stash: { label: "STASH", short: "STASH", color: "#1A1815" },
  hinweis: { label: "Hinweis", short: "Wunsch", color: "#8A857E" },
};

export const WARNING_COLOR = "#C42B1C";
export const POSITIVE_COLOR = "#2F6F35";

const euroFormat = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const signedHoursFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2, signDisplay: "exceptZero" });

/** Cent-Betrag → „4.745,67 €“ (Geld intern immer in Cent). */
export function formatEuroCents(cents: number): string {
  return euroFormat.format(cents / 100);
}

/** „+16,99 h“, „−20,5 h“, „0 h“ — mit echtem Minuszeichen. */
export function formatSignedHours(hours: number): string {
  return `${signedHoursFormat.format(hours).replace("-", "−")} h`;
}

export function balanceColor(hours: number | null): string | undefined {
  if (hours === null || hours === 0) return undefined;
  return hours < 0 ? WARNING_COLOR : POSITIVE_COLOR;
}

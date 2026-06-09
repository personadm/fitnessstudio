// Kuratierte Farb-Paletten zur Auswahl im Onboarding. Jede Palette liefert
// eine Primär- und eine Akzentfarbe; die Landingpage rendert darauf eine
// neutrale Basis (helle Fläche, dunkler Text).

export type Palette = {
  key: string;
  name: string;
  primary: string; // Markenfarbe (Buttons, Akzente, Flächen)
  accent: string; // Sekundär-Akzent (Highlights)
  onPrimary: string; // Textfarbe auf primary (Kontrast)
};

export const PALETTES: Palette[] = [
  { key: "petrol", name: "Petrol & Lime", primary: "#0F6E56", accent: "#7CAE2D", onPrimary: "#FFFFFF" },
  { key: "midnight", name: "Midnight Luxury", primary: "#1B1F3B", accent: "#C9A227", onPrimary: "#FFFFFF" },
  { key: "coral", name: "Warm Coral", primary: "#E0524D", accent: "#F2B705", onPrimary: "#FFFFFF" },
  { key: "ocean", name: "Ocean Blue", primary: "#0B6E99", accent: "#34D1BF", onPrimary: "#FFFFFF" },
  { key: "forest", name: "Deep Forest", primary: "#2D4A3E", accent: "#A3C585", onPrimary: "#FFFFFF" },
  { key: "violet", name: "Electric Violet", primary: "#5B2A86", accent: "#FF6F91", onPrimary: "#FFFFFF" },
  { key: "graphite", name: "Graphite & Acid", primary: "#222222", accent: "#C6F24E", onPrimary: "#FFFFFF" },
  { key: "sunset", name: "Sunset", primary: "#C8553D", accent: "#F2A541", onPrimary: "#FFFFFF" },
];

export const DEFAULT_PALETTE = PALETTES[0];

export function getPalette(key: string | null | undefined): Palette {
  return PALETTES.find((p) => p.key === key) ?? DEFAULT_PALETTE;
}

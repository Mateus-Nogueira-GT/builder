export interface Palette {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
}

export const PALETTES: Palette[] = [
  { name: "Esmeralda", primary: "#10b981", secondary: "#18181b", accent: "#34d399" },
  { name: "Fogo", primary: "#ef4444", secondary: "#18181b", accent: "#f87171" },
  { name: "Oceano", primary: "#3b82f6", secondary: "#1e293b", accent: "#60a5fa" },
  { name: "Ouro", primary: "#eab308", secondary: "#18181b", accent: "#facc15" },
  { name: "Roxo", primary: "#8b5cf6", secondary: "#1e1b4b", accent: "#a78bfa" },
  { name: "Sunset", primary: "#f97316", secondary: "#1c1917", accent: "#fb923c" },
  { name: "Floresta", primary: "#22c55e", secondary: "#14532d", accent: "#4ade80" },
  { name: "Neutro", primary: "#a1a1aa", secondary: "#18181b", accent: "#d4d4d8" },
];

export interface BannerColorSuggestion {
  bgColor: string;
  textColor: string;
  ctaColor: string;
}

export function generateBannerSuggestions(palette: Palette): BannerColorSuggestion[] {
  return [
    { bgColor: palette.primary, textColor: "#ffffff", ctaColor: palette.accent },
    { bgColor: palette.secondary, textColor: "#ffffff", ctaColor: palette.primary },
    { bgColor: "#111111", textColor: palette.primary, ctaColor: palette.accent },
    { bgColor: palette.primary, textColor: palette.secondary, ctaColor: "#ffffff" },
    { bgColor: palette.accent, textColor: palette.secondary, ctaColor: palette.primary },
  ];
}

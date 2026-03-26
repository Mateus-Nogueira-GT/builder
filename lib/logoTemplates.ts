export type LogoVariant = "shirt" | "shield" | "bold" | "script";

function truncateName(name: string, maxLen = 20): string {
  return name.length > maxLen ? name.slice(0, maxLen - 1) + "…" : name;
}

export function generateShirtLogo(storeName: string, primaryColor: string, accentColor: string): string {
  const name = truncateName(storeName);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80">
  <path d="M70 8 L60 8 L50 18 L50 40 L55 40 L55 20 L65 12 L75 12 L85 12 L95 12 L105 20 L105 40 L110 40 L110 18 L100 8 L90 8 L85 14 L75 14 Z" fill="none" stroke="${primaryColor}" stroke-width="2"/>
  <line x1="60" y1="55" x2="140" y2="55" stroke="${accentColor}" stroke-width="2"/>
  <text x="100" y="72" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${primaryColor}">${name}</text>
</svg>`;
}

export function generateShieldLogo(storeName: string, primaryColor: string, accentColor: string): string {
  const name = truncateName(storeName, 14);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80">
  <path d="M75 5 L125 5 L130 10 L130 45 L100 70 L70 45 L70 10 Z" fill="none" stroke="${primaryColor}" stroke-width="2.5"/>
  <path d="M78 9 L122 9 L126 13 L126 43 L100 65 L74 43 L74 13 Z" fill="none" stroke="${accentColor}" stroke-width="1" opacity="0.5"/>
  <text x="100" y="38" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="${primaryColor}">${name}</text>
  <text x="100" y="52" text-anchor="middle" font-family="system-ui, sans-serif" font-size="7" fill="${accentColor}">STORE</text>
</svg>`;
}

export function generateBoldLogo(storeName: string, primaryColor: string, accentColor: string): string {
  const name = truncateName(storeName.toUpperCase(), 16);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80">
  <text x="100" y="45" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" font-weight="900" fill="${primaryColor}">${name}</text>
  <rect x="40" y="55" width="120" height="3" rx="1.5" fill="${accentColor}"/>
</svg>`;
}

export function generateScriptLogo(storeName: string, primaryColor: string, accentColor: string): string {
  const name = truncateName(storeName);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80">
  <text x="100" y="45" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="20" font-style="italic" font-weight="700" fill="${primaryColor}">${name}</text>
  <path d="M55 55 Q100 65 145 55" fill="none" stroke="${accentColor}" stroke-width="1.5" opacity="0.7"/>
</svg>`;
}

export function generateLogo(variant: LogoVariant, storeName: string, primaryColor: string, accentColor: string): string {
  switch (variant) {
    case "shirt": return generateShirtLogo(storeName, primaryColor, accentColor);
    case "shield": return generateShieldLogo(storeName, primaryColor, accentColor);
    case "bold": return generateBoldLogo(storeName, primaryColor, accentColor);
    case "script": return generateScriptLogo(storeName, primaryColor, accentColor);
  }
}

export const LOGO_VARIANTS: { variant: LogoVariant; label: string }[] = [
  { variant: "shirt", label: "Camisa" },
  { variant: "shield", label: "Escudo" },
  { variant: "bold", label: "Tipografia Bold" },
  { variant: "script", label: "Tipografia Script" },
];

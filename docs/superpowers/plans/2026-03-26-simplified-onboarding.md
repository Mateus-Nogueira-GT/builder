# Simplified Onboarding (4-Step Visual Flow) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current multi-step onboarding with a streamlined 4-step visual wizard (name+palette → layout → banner colors → logo) that saves all config to Supabase.

**Architecture:** 2 new lib modules (`palettes.ts`, `logoTemplates.ts`) provide data/logic. 4 new components handle each step's UI. The onboarding page is rewritten as a 4-step wizard. The `create-site` API route is extended to save the new fields.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Lucide icons, Supabase, existing UI components (`Button`, `Input`, `Card`, `StepIndicator`).

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/palettes.ts` | Create | 8 palette definitions + banner suggestion generator |
| `lib/logoTemplates.ts` | Create | 4 SVG logo template functions |
| `components/PaletteSelector.tsx` | Create | Palette grid + custom pickers + live preview |
| `components/LayoutSelector.tsx` | Create | 2 layout mockup cards |
| `components/BannerColorPicker.tsx` | Create | 3 color pickers + suggestions + live banner preview |
| `components/LogoSelector.tsx` | Create | 4 SVG logos in 2x2 grid |
| `app/onboarding/page.tsx` | Rewrite | 4-step wizard composing all components |
| `app/api/wix/create-site/route.ts` | Modify | Accept new config fields |

---

### Task 1: Create Palettes Module

**Files:**
- Create: `lib/palettes.ts`

- [ ] **Step 1: Create lib/palettes.ts**

```typescript
// lib/palettes.ts

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
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -10`

- [ ] **Step 3: Commit**

```bash
git add lib/palettes.ts
git commit -m "feat: add palettes module with 8 pre-defined palettes and banner suggestions"
```

---

### Task 2: Create Logo Templates Module

**Files:**
- Create: `lib/logoTemplates.ts`

- [ ] **Step 1: Create lib/logoTemplates.ts**

```typescript
// lib/logoTemplates.ts

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
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -10`

- [ ] **Step 3: Commit**

```bash
git add lib/logoTemplates.ts
git commit -m "feat: add logo templates module with 4 SVG variants"
```

---

### Task 3: Create PaletteSelector Component

**Files:**
- Create: `components/PaletteSelector.tsx`

- [ ] **Step 1: Create components/PaletteSelector.tsx**

```tsx
// components/PaletteSelector.tsx
"use client";

import { useState } from "react";
import { PALETTES, type Palette } from "@/lib/palettes";
import { cn } from "@/lib/utils";
import { Check, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaletteSelectorProps {
  storeName: string;
  selectedPalette: Palette;
  onSelect: (palette: Palette) => void;
}

export function PaletteSelector({ storeName, selectedPalette, onSelect }: PaletteSelectorProps) {
  const [customMode, setCustomMode] = useState(false);
  const [customPalette, setCustomPalette] = useState<Palette>({ ...selectedPalette, name: "Personalizada" });

  const handleCustomChange = (field: keyof Omit<Palette, "name">, value: string) => {
    const updated = { ...customPalette, [field]: value };
    setCustomPalette(updated);
    onSelect(updated);
  };

  return (
    <div className="space-y-4">
      {/* Palette Grid */}
      <div className="grid grid-cols-4 gap-3">
        {PALETTES.map((palette) => {
          const isSelected = !customMode && selectedPalette.name === palette.name;
          return (
            <button
              key={palette.name}
              type="button"
              onClick={() => { setCustomMode(false); onSelect(palette); }}
              className={cn(
                "relative rounded-lg border-2 p-3 transition-all text-left",
                isSelected
                  ? "border-emerald-500 ring-2 ring-emerald-500/30"
                  : "border-zinc-800 hover:border-zinc-600"
              )}
            >
              {isSelected && (
                <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                  <Check className="h-3 w-3 text-black" />
                </div>
              )}
              <div className="flex gap-1 mb-2">
                <div className="h-6 flex-1 rounded-sm" style={{ backgroundColor: palette.primary }} />
                <div className="h-6 flex-1 rounded-sm" style={{ backgroundColor: palette.secondary }} />
                <div className="h-6 flex-1 rounded-sm" style={{ backgroundColor: palette.accent }} />
              </div>
              <p className="text-xs font-medium text-zinc-400">{palette.name}</p>
            </button>
          );
        })}
      </div>

      {/* Custom Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setCustomMode(!customMode);
          if (!customMode) {
            setCustomPalette({ ...selectedPalette, name: "Personalizada" });
            onSelect({ ...selectedPalette, name: "Personalizada" });
          }
        }}
        className={cn(
          "border-zinc-700 text-zinc-300",
          customMode && "border-emerald-500 text-emerald-400"
        )}
      >
        <Sliders className="mr-2 h-4 w-4" /> Personalizar cores
      </Button>

      {/* Custom Pickers */}
      {customMode && (
        <div className="grid grid-cols-3 gap-4 rounded-lg border border-zinc-800 p-4">
          {(["primary", "secondary", "accent"] as const).map((field) => (
            <div key={field} className="space-y-1">
              <label className="text-xs font-medium text-zinc-400 capitalize">{field === "primary" ? "Primária" : field === "secondary" ? "Secundária" : "Accent"}</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={customPalette[field]}
                  onChange={(e) => handleCustomChange(field, e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-zinc-700 bg-zinc-800"
                />
                <span className="flex items-center text-xs text-zinc-500">{customPalette[field]}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Preview */}
      <div className="rounded-lg border border-zinc-800 p-4 space-y-2">
        <p className="text-xs text-zinc-500 mb-2">Preview</p>
        <div className="rounded-md px-3 py-1.5 text-center text-xs font-medium text-black" style={{ backgroundColor: selectedPalette.primary }}>
          {storeName || "Sua Loja"} — Frete grátis acima de R$199
        </div>
        <div className="flex gap-2">
          <div className="flex-1 rounded-md p-3" style={{ backgroundColor: selectedPalette.secondary }}>
            <div className="h-2 w-16 rounded bg-white/20" />
          </div>
          <button className="rounded-md px-4 py-2 text-xs font-bold text-black" style={{ backgroundColor: selectedPalette.accent }}>
            Ver Ofertas
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -10`

- [ ] **Step 3: Commit**

```bash
git add components/PaletteSelector.tsx
git commit -m "feat: add PaletteSelector with 8 palettes, custom pickers, and live preview"
```

---

### Task 4: Create LayoutSelector Component

**Files:**
- Create: `components/LayoutSelector.tsx`

- [ ] **Step 1: Create components/LayoutSelector.tsx**

```tsx
// components/LayoutSelector.tsx
"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type LayoutType = "classic" | "modern";

interface LayoutSelectorProps {
  selected: LayoutType;
  onSelect: (layout: LayoutType) => void;
  primaryColor: string;
}

function ClassicMockup({ primaryColor }: { primaryColor: string }) {
  return (
    <div className="rounded-md border border-zinc-700 overflow-hidden text-[8px]">
      <div className="py-1 text-center text-black font-bold" style={{ backgroundColor: primaryColor }}>TOPBAR</div>
      <div className="h-14 bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-zinc-500">Hero Banner</div>
      <div className="flex justify-center gap-2 py-1.5 bg-zinc-900">
        <div className="h-1 w-8 rounded bg-zinc-700" />
        <div className="h-1 w-8 rounded bg-zinc-700" />
        <div className="h-1 w-8 rounded bg-zinc-700" />
      </div>
      <div className="grid grid-cols-4 gap-1 p-1.5">
        {[1,2,3,4].map(i => <div key={i} className="h-6 rounded bg-zinc-800" />)}
      </div>
      <div className="mx-1.5 mb-1.5 h-8 rounded bg-zinc-800 flex items-center justify-center">
        <div className="text-zinc-500">Promo</div>
      </div>
    </div>
  );
}

function ModernMockup({ primaryColor }: { primaryColor: string }) {
  return (
    <div className="rounded-md border border-zinc-700 overflow-hidden text-[8px]">
      <div className="relative h-24 bg-gradient-to-b from-zinc-700 to-zinc-900 flex flex-col items-center justify-center">
        <div className="text-zinc-400 font-bold text-[10px]">HERO</div>
        <div className="text-zinc-600 text-[7px]">fullscreen + overlay</div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3/4 rounded-lg border border-zinc-600 bg-zinc-800 p-1.5 text-center shadow-lg">
          <div className="text-zinc-400">Promo Card</div>
        </div>
      </div>
      <div className="pt-6 pb-2 px-2">
        <div className="flex gap-1.5 overflow-hidden">
          {[1,2,3].map(i => <div key={i} className="h-8 w-14 shrink-0 rounded-lg bg-zinc-800" />)}
        </div>
      </div>
      <div className="flex justify-center gap-3 py-1.5">
        {[1,2,3].map(i => <div key={i} className="h-3 w-3 rounded-full" style={{ backgroundColor: primaryColor, opacity: 0.5 }} />)}
      </div>
    </div>
  );
}

export function LayoutSelector({ selected, onSelect, primaryColor }: LayoutSelectorProps) {
  const layouts: { type: LayoutType; label: string; description: string; Mockup: typeof ClassicMockup }[] = [
    { type: "classic", label: "Clássico", description: "Hero grande, grid de categorias, banner promo", Mockup: ClassicMockup },
    { type: "modern", label: "Moderno", description: "Hero fullscreen, carrossel, card flutuante", Mockup: ModernMockup },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {layouts.map(({ type, label, description, Mockup }) => {
        const isSelected = selected === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            className={cn(
              "relative rounded-xl border-2 p-4 text-left transition-all",
              isSelected
                ? "border-emerald-500 ring-2 ring-emerald-500/30 bg-zinc-900/50"
                : "border-zinc-800 hover:border-zinc-600 bg-zinc-900/30"
            )}
          >
            {isSelected && (
              <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
                <Check className="h-3.5 w-3.5 text-black" />
              </div>
            )}
            <Mockup primaryColor={primaryColor} />
            <div className="mt-3">
              <p className="text-sm font-bold text-white">{label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -10`

- [ ] **Step 3: Commit**

```bash
git add components/LayoutSelector.tsx
git commit -m "feat: add LayoutSelector with classic and modern layout mockups"
```

---

### Task 5: Create BannerColorPicker Component

**Files:**
- Create: `components/BannerColorPicker.tsx`

- [ ] **Step 1: Create components/BannerColorPicker.tsx**

```tsx
// components/BannerColorPicker.tsx
"use client";

import { type Palette, generateBannerSuggestions, type BannerColorSuggestion } from "@/lib/palettes";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface BannerColors {
  bgColor: string;
  textColor: string;
  ctaColor: string;
}

interface BannerColorPickerProps {
  palette: Palette;
  colors: BannerColors;
  onChange: (colors: BannerColors) => void;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-zinc-700 bg-zinc-800"
        />
        <span className="text-xs text-zinc-500 font-mono">{value}</span>
      </div>
    </div>
  );
}

export function BannerColorPicker({ palette, colors, onChange }: BannerColorPickerProps) {
  const suggestions = generateBannerSuggestions(palette);

  const isSuggestionSelected = (s: BannerColorSuggestion) =>
    s.bgColor === colors.bgColor && s.textColor === colors.textColor && s.ctaColor === colors.ctaColor;

  return (
    <div className="space-y-5">
      {/* Quick Suggestions */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-400">Sugestões rápidas</p>
        <div className="flex gap-2">
          {suggestions.map((s, i) => {
            const selected = isSuggestionSelected(s);
            return (
              <button
                key={i}
                type="button"
                onClick={() => onChange({ bgColor: s.bgColor, textColor: s.textColor, ctaColor: s.ctaColor })}
                className={cn(
                  "relative flex-1 rounded-lg border-2 p-2 transition-all",
                  selected ? "border-emerald-500" : "border-zinc-800 hover:border-zinc-600"
                )}
              >
                {selected && (
                  <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                    <Check className="h-2.5 w-2.5 text-black" />
                  </div>
                )}
                <div className="h-8 rounded" style={{ backgroundColor: s.bgColor }}>
                  <div className="flex h-full items-center justify-center gap-1">
                    <span className="text-[7px] font-bold" style={{ color: s.textColor }}>Texto</span>
                    <span className="rounded px-1 text-[6px] font-bold text-black" style={{ backgroundColor: s.ctaColor }}>CTA</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Pickers */}
      <div className="grid grid-cols-3 gap-4">
        <ColorField label="Cor de fundo" value={colors.bgColor} onChange={(v) => onChange({ ...colors, bgColor: v })} />
        <ColorField label="Cor do texto" value={colors.textColor} onChange={(v) => onChange({ ...colors, textColor: v })} />
        <ColorField label="Cor do botão CTA" value={colors.ctaColor} onChange={(v) => onChange({ ...colors, ctaColor: v })} />
      </div>

      {/* Live Preview */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-400">Preview do banner</p>
        <div className="rounded-xl p-6 text-center" style={{ backgroundColor: colors.bgColor }}>
          <h3 className="text-lg font-bold" style={{ color: colors.textColor }}>Promoção Especial</h3>
          <p className="text-sm mt-1" style={{ color: colors.textColor, opacity: 0.7 }}>Aproveite as ofertas</p>
          <button className="mt-3 rounded-lg px-5 py-2 text-sm font-bold text-black" style={{ backgroundColor: colors.ctaColor }}>
            Ver Ofertas
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -10`

- [ ] **Step 3: Commit**

```bash
git add components/BannerColorPicker.tsx
git commit -m "feat: add BannerColorPicker with suggestions and live preview"
```

---

### Task 6: Create LogoSelector Component

**Files:**
- Create: `components/LogoSelector.tsx`

- [ ] **Step 1: Create components/LogoSelector.tsx**

```tsx
// components/LogoSelector.tsx
"use client";

import { generateLogo, LOGO_VARIANTS, type LogoVariant } from "@/lib/logoTemplates";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface LogoSelectorProps {
  storeName: string;
  primaryColor: string;
  accentColor: string;
  selected: LogoVariant | null;
  onSelect: (variant: LogoVariant, svg: string) => void;
}

export function LogoSelector({ storeName, primaryColor, accentColor, selected, onSelect }: LogoSelectorProps) {
  const name = storeName || "Sua Loja";

  return (
    <div className="grid grid-cols-2 gap-4">
      {LOGO_VARIANTS.map(({ variant, label }) => {
        const svg = generateLogo(variant, name, primaryColor, accentColor);
        const isSelected = selected === variant;

        return (
          <button
            key={variant}
            type="button"
            onClick={() => onSelect(variant, svg)}
            className={cn(
              "relative rounded-xl border-2 p-4 text-left transition-all",
              isSelected
                ? "border-emerald-500 ring-2 ring-emerald-500/30"
                : "border-zinc-800 hover:border-zinc-600"
            )}
          >
            {isSelected && (
              <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
                <Check className="h-3.5 w-3.5 text-black" />
              </div>
            )}
            {/* Dark background */}
            <div className="rounded-lg bg-zinc-900 p-4 flex items-center justify-center">
              <div className="w-40 h-16" dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
            {/* Light background */}
            <div className="rounded-lg bg-zinc-100 p-4 mt-2 flex items-center justify-center">
              <div className="w-40 h-16" dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
            <p className="text-xs font-medium text-zinc-400 mt-2 text-center">{label}</p>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -10`

- [ ] **Step 3: Commit**

```bash
git add components/LogoSelector.tsx
git commit -m "feat: add LogoSelector with 4 SVG variants on dark and light backgrounds"
```

---

### Task 7: Rewrite Onboarding Page

**Files:**
- Modify: `app/onboarding/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite app/onboarding/page.tsx**

Replace the entire file with:

```tsx
// app/onboarding/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StepIndicator } from "@/components/StepIndicator";
import { PaletteSelector } from "@/components/PaletteSelector";
import { LayoutSelector } from "@/components/LayoutSelector";
import { BannerColorPicker } from "@/components/BannerColorPicker";
import { LogoSelector } from "@/components/LogoSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession, setSession } from "@/lib/session";
import { PALETTES, type Palette } from "@/lib/palettes";
import type { LogoVariant } from "@/lib/logoTemplates";
import { Shirt, ArrowRight, ArrowLeft, Loader2, Store, Palette as PaletteIcon, ImageIcon, Sparkles } from "lucide-react";

const FLOW_STEPS = [
  { label: "Nome & Cores" },
  { label: "Layout" },
  { label: "Banners" },
  { label: "Logo" },
];

interface OnboardingState {
  storeName: string;
  palette: Palette;
  layoutType: "classic" | "modern";
  bannerBgColor: string;
  bannerTextColor: string;
  bannerCtaColor: string;
  logoVariant: LogoVariant | null;
  logoSvg: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState<OnboardingState>(() => {
    const session = getSession();
    const ob = session.onboarding;
    const defaultPalette = PALETTES[0];
    return {
      storeName: ob?.storeName || "",
      palette: PALETTES.find(p => p.primary === ob?.primaryColor) || defaultPalette,
      layoutType: "classic",
      bannerBgColor: defaultPalette.primary,
      bannerTextColor: "#ffffff",
      bannerCtaColor: defaultPalette.accent,
      logoVariant: null,
      logoSvg: "",
    };
  });

  const update = (partial: Partial<OnboardingState>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  };

  // Persist to session on change
  useEffect(() => {
    setSession({
      onboarding: {
        connectionMethod: "api_key",
        apiKey: "",
        siteId: "",
        storeName: form.storeName,
        siteUrl: "",
        email: "",
        whatsapp: "",
        instagram: "",
        city: "",
        state: "",
        focus: "todos",
        featuredTeams: [],
        activePromotion: "Compre 2 Leve 3",
        primaryColor: form.palette.primary,
        secondaryColor: form.palette.secondary,
        heroBannerColor: "",
        heroBannerId: "",
        heroBannerDesktopUrl: "",
        heroBannerMobileUrl: "",
        heroBannerThumbnailUrl: "",
        siteName: form.storeName,
        instanceId: "",
      },
    });
  }, [form]);

  const handleFinish = async () => {
    if (!form.storeName || !form.logoVariant) return;

    setCreating(true);
    try {
      const res = await fetch("/api/wix/create-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: form.storeName,
          primaryColor: form.palette.primary,
          secondaryColor: form.palette.secondary,
          accentColor: form.palette.accent,
          layoutType: form.layoutType,
          bannerBgColor: form.bannerBgColor,
          bannerTextColor: form.bannerTextColor,
          bannerCtaColor: form.bannerCtaColor,
          logoVariant: form.logoVariant,
          logoSvg: form.logoSvg,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao criar site");
        return;
      }

      setSession({
        onboarding: {
          ...getSession().onboarding!,
          siteId: data.siteId,
          siteUrl: data.siteUrl,
          siteName: form.storeName,
          instanceId: data.metaSiteId,
          apiKey: "",
        },
        storeId: data.storeId,
      });

      toast.success("Loja criada com sucesso!");
      router.push("/generate");
    } catch {
      toast.error("Erro ao criar site");
    } finally {
      setCreating(false);
    }
  };

  const canProceed = [
    form.storeName.length > 0,
    true, // layout always has a default
    true, // banner colors always have defaults
    form.logoVariant !== null,
  ];

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
            <Shirt className="h-6 w-6 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold">Kit Store Builder</h1>
        </div>

        <StepIndicator steps={FLOW_STEPS} currentStep={step} />

        {/* Step 1: Name + Palette */}
        {step === 0 && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Store className="h-5 w-5 text-emerald-500" />
                Nome & Paleta de Cores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Nome da Loja *</label>
                <Input
                  value={form.storeName}
                  onChange={(e) => update({ storeName: e.target.value })}
                  placeholder="Ex: Camisa10 Store"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <PaletteSelector
                storeName={form.storeName}
                selectedPalette={form.palette}
                onSelect={(p) => update({
                  palette: p,
                  bannerBgColor: p.primary,
                  bannerTextColor: "#ffffff",
                  bannerCtaColor: p.accent,
                })}
              />
              <div className="flex justify-end">
                <Button onClick={() => setStep(1)} disabled={!canProceed[0]} className="bg-emerald-500 text-black font-bold">
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Layout */}
        {step === 1 && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <PaletteIcon className="h-5 w-5 text-emerald-500" />
                Escolha o Layout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <LayoutSelector
                selected={form.layoutType}
                onSelect={(l) => update({ layoutType: l })}
                primaryColor={form.palette.primary}
              />
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(0)} className="border-zinc-700 text-zinc-300">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button onClick={() => setStep(2)} className="bg-emerald-500 text-black font-bold">
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Banner Colors */}
        {step === 2 && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <ImageIcon className="h-5 w-5 text-emerald-500" />
                Cores dos Banners
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <BannerColorPicker
                palette={form.palette}
                colors={{
                  bgColor: form.bannerBgColor,
                  textColor: form.bannerTextColor,
                  ctaColor: form.bannerCtaColor,
                }}
                onChange={(c) => update({
                  bannerBgColor: c.bgColor,
                  bannerTextColor: c.textColor,
                  bannerCtaColor: c.ctaColor,
                })}
              />
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="border-zinc-700 text-zinc-300">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button onClick={() => setStep(3)} className="bg-emerald-500 text-black font-bold">
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Logo */}
        {step === 3 && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                Escolha seu Logo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <LogoSelector
                storeName={form.storeName}
                primaryColor={form.palette.primary}
                accentColor={form.palette.accent}
                selected={form.logoVariant}
                onSelect={(variant, svg) => update({ logoVariant: variant, logoSvg: svg })}
              />
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)} className="border-zinc-700 text-zinc-300">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={!canProceed[3] || creating}
                  className="bg-emerald-500 text-black font-bold"
                >
                  {creating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando loja...</>
                  ) : (
                    <>Finalizar <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -10`

- [ ] **Step 3: Commit**

```bash
git add app/onboarding/page.tsx
git commit -m "feat: rewrite onboarding as 4-step visual wizard (name, layout, banners, logo)"
```

---

### Task 8: Extend create-site API Route

**Files:**
- Modify: `app/api/wix/create-site/route.ts`

- [ ] **Step 1: Update the create-site route to accept and save new fields**

In `app/api/wix/create-site/route.ts`, change the destructuring at line 21 to include new fields:

Replace:
```typescript
    const { storeName, email, whatsapp, instagram, city, state, focus,
      activePromotion, primaryColor, secondaryColor } = body;
```

With:
```typescript
    const { storeName, email, whatsapp, instagram, city, state, focus,
      activePromotion, primaryColor, secondaryColor,
      accentColor, layoutType, bannerBgColor, bannerTextColor, bannerCtaColor,
      logoVariant, logoSvg } = body;
```

Then update the Supabase insert at line 123 to include the new fields. Replace the `.insert({...})` block:

Replace:
```typescript
    const { data: store, error: dbError } = await supabase
      .from("stores")
      .insert({
        owner_id: token.id,
        name: storeName,
        wix_api_key: WIX_API_KEY,
        wix_site_id: metaSiteId,
        wix_site_url: siteUrl,
        wix_instance_id: metaSiteId,
        owner_email: email || null,
        whatsapp: whatsapp || null,
        instagram: instagram || null,
        city: city || null,
        state: state || null,
        focus: focus || "todos",
        active_promotion: activePromotion || null,
        primary_color: primaryColor || "#10b981",
        secondary_color: secondaryColor || "#18181b",
        connection_method: "auto",
      })
      .select("*")
      .single();
```

With:
```typescript
    const { data: store, error: dbError } = await supabase
      .from("stores")
      .insert({
        owner_id: token.id,
        name: storeName,
        wix_api_key: WIX_API_KEY,
        wix_site_id: metaSiteId,
        wix_site_url: siteUrl,
        wix_instance_id: metaSiteId,
        owner_email: email || null,
        whatsapp: whatsapp || null,
        instagram: instagram || null,
        city: city || null,
        state: state || null,
        focus: focus || "todos",
        active_promotion: activePromotion || null,
        primary_color: primaryColor || "#10b981",
        secondary_color: secondaryColor || "#18181b",
        accent_color: accentColor || null,
        layout_type: layoutType || "classic",
        banner_bg_color: bannerBgColor || null,
        banner_text_color: bannerTextColor || null,
        banner_cta_color: bannerCtaColor || null,
        logo_variant: logoVariant || null,
        logo_svg: logoSvg || null,
        connection_method: "auto",
      })
      .select("*")
      .single();
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -10`

- [ ] **Step 3: Commit**

```bash
git add app/api/wix/create-site/route.ts
git commit -m "feat: extend create-site API to accept layout, banner colors, and logo config"
```

---

### Task 9: Add Supabase Columns + Type Check + Smoke Test

- [ ] **Step 1: Add new columns to stores table in Supabase**

Run the following SQL in Supabase SQL Editor:

```sql
ALTER TABLE stores ADD COLUMN IF NOT EXISTS accent_color text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS layout_type text DEFAULT 'classic';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS banner_bg_color text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS banner_text_color text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS banner_cta_color text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS logo_variant text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS logo_svg text;
```

- [ ] **Step 2: Run final type check**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -20`
Expected: No application errors

- [ ] **Step 3: Verify in browser at `/onboarding`**

Checklist:
1. Step 1 shows name input + 8 palette cards + live preview
2. Selecting a palette highlights it with emerald border + check
3. "Personalizar" opens 3 color pickers
4. Step 2 shows 2 layout mockup cards side-by-side
5. Selecting a layout highlights it
6. Step 3 shows 5 banner color suggestions + 3 pickers + live banner preview
7. Clicking a suggestion fills all 3 pickers
8. Step 4 shows 4 logo variants in 2x2 grid (dark + light bg each)
9. Logos use the store name and colors from Step 1
10. "Finalizar" creates the store and redirects

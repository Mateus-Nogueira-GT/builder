# Simplified Onboarding (4-Step Visual Flow) — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Scope:** Replace the current multi-step onboarding with a streamlined 4-step visual wizard focused on quick visual choices. Save all config as a single object in Supabase.

## Overview

The current onboarding has 4 sub-steps (store-info → branding → hero-banner → activate-cms) with many form fields and a complex Wix integration flow. The new onboarding simplifies this to 4 visual steps:

1. Store name + color palette selection
2. Layout choice (classic vs modern)
3. Banner color scheme
4. Logo selection (4 SVG variations)

After completion, all choices are saved to Supabase as a unified store configuration, then the user is redirected to the Wix site creation flow.

## Step 1: Store Name + Color Palette

### Fields
- **Store name** (text input, required)

### Palette Selector
8 pre-defined palettes, each containing 3 colors (primary, secondary, accent):

| Name | Primary | Secondary | Accent |
|------|---------|-----------|--------|
| Esmeralda | #10b981 | #18181b | #34d399 |
| Fogo | #ef4444 | #18181b | #f87171 |
| Oceano | #3b82f6 | #1e293b | #60a5fa |
| Ouro | #eab308 | #18181b | #facc15 |
| Roxo | #8b5cf6 | #1e1b4b | #a78bfa |
| Sunset | #f97316 | #1c1917 | #fb923c |
| Floresta | #22c55e | #14532d | #4ade80 |
| Neutro | #a1a1aa | #18181b | #d4d4d8 |

Each palette rendered as a clickable card showing the 3 colors as horizontal bars with the palette name below.

### Custom Option
A "Personalizar" button at the end of the palette grid. When clicked, shows 3 color picker inputs (primary, secondary, accent) initialized with the currently selected palette's values.

### Live Preview
A mini-bar below the palette grid showing: a colored topbar strip (primary), a small card (secondary bg), and a button (accent) — so the user sees how the colors work together.

### Validation
- Store name must be non-empty to proceed

## Step 2: Layout Selection (2 Options)

### Layout Classic
- Large hero banner at the top (full-width, aspect 21:9)
- 4-column category grid below
- Promotional banner with overlay text
- Trust bar (3 items horizontal)
- No testimonials

### Layout Modern
- Fullscreen hero with text overlay and gradient
- Horizontal scrollable category cards
- Floating promotional card (rounded, shadowed) overlapping hero bottom
- Minimal trust bar (icons only, no text, centered)
- No testimonials

### UI
Two cards side-by-side (or stacked on mobile), each containing:
- A mockup wireframe of the layout (built with HTML/CSS inside the card — not images)
- Layout name ("Clássico" / "Moderno") and a 1-line description
- Selected state: emerald border + check badge in top-right corner
- Clicking a card selects that layout

### Data
- `layout_type: "classic" | "modern"`

## Step 3: Banner Color Scheme

### Color Pickers
3 color inputs:
- **Cor de fundo** (banner background color)
- **Cor do texto** (banner text color)
- **Cor do botão CTA** (call-to-action button color)

Each rendered as a labeled color picker (native `<input type="color">`) with hex display.

### Quick Suggestions
5 pre-generated combinations derived from the palette chosen in Step 1. Each suggestion is a small clickable card showing the 3 colors as a mini-banner preview. Clicking a suggestion fills all 3 pickers.

Suggestion generation logic (in `lib/palettes.ts`):
- Suggestion 1: primary as bg, white text, accent as CTA
- Suggestion 2: secondary as bg, white text, primary as CTA
- Suggestion 3: dark (#111) as bg, primary text, accent as CTA
- Suggestion 4: primary as bg, secondary text, white as CTA
- Suggestion 5: accent as bg, secondary text, primary as CTA

### Live Preview
A rendered mini-banner below the pickers:
- Rectangle with the background color
- Title text "Promoção Especial" in the text color
- Subtitle "Aproveite as ofertas" in text color at 70% opacity
- A small button "Ver Ofertas" with the CTA color

### Data
- `banner_bg_color: string`
- `banner_text_color: string`
- `banner_cta_color: string`

## Step 4: Logo Selection (4 SVG Variations)

### Generation
4 logo templates defined in `lib/logoTemplates.ts`. Each is a function that takes `(storeName: string, primaryColor: string, accentColor: string)` and returns an SVG string.

**Variant 1 — "Shirt" (Camisa)**
- Simple shirt/jersey icon outline in primary color
- Store name below in a clean sans-serif (bold)
- Accent color for a small underline or accent stroke

**Variant 2 — "Shield" (Escudo)**
- Shield/crest shape outline in primary color
- Store name inside the shield in compact font
- Accent color for the shield border or inner accent

**Variant 3 — "Bold Typography"**
- No icon — just the store name in large bold uppercase letters
- Primary color for the text
- Accent color for a horizontal line below

**Variant 4 — "Script Typography"**
- No icon — store name in a cursive/script style
- Primary color for the text
- Accent color for a small decorative swash

### SVG Specs
- ViewBox: 200x80 (horizontal logo format)
- All text rendered as `<text>` elements with web-safe fonts (system fonts)
- Pure SVG — no external dependencies, no `<image>` tags
- Colors injected via function parameters

### UI
2x2 grid of cards. Each card shows:
- The SVG logo on a dark background (zinc-900)
- The same SVG on a light background (zinc-100) below it — so user sees both contexts
- Variant label below ("Camisa", "Escudo", "Tipografia Bold", "Tipografia Script")
- Selected state: emerald border + check badge

### Data
- `logo_variant: "shirt" | "shield" | "bold" | "script"`
- `logo_svg: string` (the full SVG string of the chosen logo)

## Navigation & Step Indicator

### Step Indicator
Replace the current 6-step `FLOW_STEPS` with a 4-step indicator:
1. "Nome & Cores"
2. "Layout"
3. "Banners"
4. "Logo"

Uses the existing `StepIndicator` component with `currentStep` mapped to 0-3.

### Navigation Buttons
- Each step has "Voltar" (except step 1) and "Próximo" buttons
- Step 4 has "Voltar" and "Finalizar" (creates the store)
- "Próximo" disabled until required selection is made
- "Finalizar" triggers the save + Wix site creation flow

## Save Flow (Finalizar)

When user clicks "Finalizar" on Step 4:

1. Build the store config object from all form state
2. POST to `/api/wix/create-site` with all config data (existing endpoint, extended payload)
3. On success: save config to session, redirect to `/generate` for automatic content generation
4. On error: show toast, stay on step 4

### Extended Payload for create-site
The existing `/api/wix/create-site` endpoint already accepts store metadata. Extend it to also accept:
- `layoutType`
- `bannerBgColor`, `bannerTextColor`, `bannerCtaColor`
- `logoVariant`, `logoSvg`

These new fields are saved to the `stores` table alongside existing fields.

### Stores Table Changes
Add columns to `stores` table:
- `layout_type` (text, nullable, default "classic")
- `banner_bg_color` (text, nullable)
- `banner_text_color` (text, nullable)
- `banner_cta_color` (text, nullable)
- `logo_variant` (text, nullable)
- `logo_svg` (text, nullable)
- `accent_color` (text, nullable)

## Pages Removed from Flow

The following pages are **removed from the main navigation flow** but NOT deleted:
- `/hero-image` — replaced by Step 3 (banner colors)
- The direct link from onboarding → `/generate` is preserved, but `/generate` is no longer a required manual step in the onboarding wizard

The `FLOW_STEPS` constant in other pages that reference the old steps will need updating to reflect the new flow.

## File Changes

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/palettes.ts` | Create | Pre-defined palettes + banner color suggestion generator |
| `lib/logoTemplates.ts` | Create | 4 SVG logo template functions |
| `components/PaletteSelector.tsx` | Create | Palette grid + custom color pickers + live preview |
| `components/LayoutSelector.tsx` | Create | 2 layout cards with HTML mockups |
| `components/BannerColorPicker.tsx` | Create | 3 color pickers + suggestions + live mini-banner preview |
| `components/LogoSelector.tsx` | Create | 4 SVG logo cards in 2x2 grid |
| `app/onboarding/page.tsx` | Rewrite | New 4-step wizard composing the above components |
| `app/api/wix/create-site/route.ts` | Modify | Accept new config fields in payload |

## Edge Cases

- **Long store names in logos**: Truncate at 20 characters in SVG, add ellipsis. Full name stored in config.
- **Custom colors that look bad together**: No validation — user has freedom. The live previews help them see issues before proceeding.
- **Returning to onboarding**: If session already has onboarding data, pre-populate all steps from session (existing pattern preserved).
- **No palette selected**: Default to "Esmeralda" palette on first load.
- **Browser without color picker support**: Falls back to text hex input (native HTML behavior).

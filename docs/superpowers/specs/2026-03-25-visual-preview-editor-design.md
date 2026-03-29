# Visual Preview Editor — Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Scope:** Replace the static `/preview` page with an interactive visual editor

## Overview

Transform the current read-only preview page (`app/preview/page.tsx`) into a full visual editor where users can adjust text content and colors before publishing. The editor uses a split-pane layout: live preview on the left, editing panel on the right, and a toolbar on top.

## Architecture

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Toolbar: [Desktop|Mobile]  [🎨 Primária] [🎨 Sec.]  [Publicar →] │
├──────────────────────────────────┬──────────────────────┤
│                                  │  ✏️ Editar Conteúdo  │
│                                  │                      │
│         Live Preview             │  ▼ 📢 Topbar         │
│         (scrollable)             │    [input field]     │
│                                  │  ▶ 💬 WhatsApp       │
│                                  │  ▶ 🛡️ Trust Bar      │
│                                  │  ▼ 🏷️ Promo Banner   │
│                                  │    [title]           │
│                                  │    [subtitle]        │
│                                  │    [cta label]       │
│                                  │    [cta link]        │
│                                  │  ▶ 📁 Categorias     │
│                                  │                      │
├──────────────────────────────────┴──────────────────────┤
│  ← Voltar                                               │
└─────────────────────────────────────────────────────────┘
```

### Components

**1. Toolbar (`PreviewToolbar`)**
- Device toggle: Desktop / Mobile buttons (segmented control style)
- Color pickers: Primary color + Secondary color (native `<input type="color">`)
- Publish button: triggers existing `handlePublish` flow
- Back button: navigates to `/hero-image`
- Fixed at the top, does not scroll

**2. Live Preview (`PreviewCanvas`)**
- Renders a simulated store preview using current content + colors
- Scrollable vertically, fills available horizontal space
- Sections rendered (top to bottom):
  - **Topbar**: promotional text bar with primary color background
  - **Hero Banner**: `heroBannerDesktopUrl` image from onboarding
  - **Trust Bar**: 3 items with icons
  - **Promo Banner**: image overlay with title, subtitle, CTA button
  - **Categories**: 4-column grid with category names
- In mobile mode: preview container constrains to `max-width: 375px`, centered horizontally with a subtle border/shadow to simulate a device viewport
- All text and colors update in real-time as the user edits in the panel

**3. Edit Panel (`PreviewEditPanel`)**
- Fixed-width right panel (~320px) with vertical scroll
- Contains accordion sections, each collapsible:

| Section | Fields | Field Types |
|---------|--------|-------------|
| Topbar | Promotional text | text input |
| WhatsApp | Greeting message | text input |
| Trust Bar | 3× (icon key + text) | text inputs |
| Promo Banner | Title, subtitle, CTA label, CTA link | text inputs |
| Categories | 4× category name | text inputs |

- First section starts expanded, rest collapsed
- Clicking a section header toggles expand/collapse
- All field changes call a unified `updateField` handler that updates both local state and sessionStorage

### Removed Sections

The following sections from the current preview are **removed** from both the preview canvas and the edit panel:
- Testimonials (depoimentos)
- Footer

These sections remain in `StoreContent` type and sessionStorage — they are simply not rendered or editable in the preview editor. The existing data from `/generate` is preserved and still sent to `/api/inject` on publish.

## Data Flow

```
sessionStorage (existing)
    ↓ load on mount
┌─────────────┐
│  Component   │──── content: StoreContent (state)
│  State       │──── onboarding: OnboardingData (state)
│              │──── images: SessionImages (state)
│              │──── viewMode: "desktop" | "mobile" (state)
└──────┬──────┘
       │ on edit
       ↓
setSession({ content, onboarding })  ← persists to sessionStorage
       │
       ↓ on publish
POST /api/inject  ← existing flow, unchanged
```

- Content edits update React state and persist to sessionStorage via `setSession()`
- Color edits update `onboarding.primaryColor` / `onboarding.secondaryColor` in state and sessionStorage
- The publish flow is identical to the current implementation — no API changes needed
- `viewMode` is local UI state only, not persisted

## Responsive Behavior

### Desktop/Mobile Toggle
- **Desktop mode**: Preview renders at full available width within its container
- **Mobile mode**: Preview container sets `max-width: 375px`, centered with `margin: 0 auto`, with a subtle `border` and `rounded-xl` to visually frame it as a mobile viewport
- The toggle only affects the preview container width — the edit panel remains unchanged
- No content swapping between modes (same banner, same layout — just narrower)

### Page Responsiveness
- On screens < 768px, the edit panel collapses to a bottom sheet or the layout stacks vertically (panel below preview)
- This is a secondary concern — the primary target is desktop usage during the builder flow

## File Changes

### Modified Files
- `app/preview/page.tsx` — Complete rewrite as the editor layout (Toolbar + PreviewCanvas + EditPanel)

### New Files
- `components/PreviewToolbar.tsx` — Toolbar with device toggle, color pickers, publish button
- `components/PreviewCanvas.tsx` — Live preview renderer (extracted from current preview page)
- `components/PreviewEditPanel.tsx` — Right-side accordion panel with edit fields
- `components/AccordionSection.tsx` — Reusable collapsible section component

### Unchanged Files
- `lib/session.ts` — No changes needed
- `lib/schemas.ts` — No changes needed (StoreContent, OnboardingData types remain the same)
- `app/api/inject/route.ts` — No changes needed (payload structure unchanged)
- `components/ContentBlock.tsx` — Not reused (the edit panel has its own field rendering)

## Interaction Details

### Accordion Behavior
- Only one section can be expanded at a time (single-expand accordion)
- Clicking an expanded section collapses it
- Clicking a collapsed section expands it and collapses the previously open one
- Smooth height transition animation (~200ms ease)

### Color Picker
- Uses native `<input type="color">` styled as a circular swatch
- On change, updates `onboarding.primaryColor` or `onboarding.secondaryColor`
- Preview reflects the new color immediately (topbar background, CTA button background)

### Publish Flow
- Identical to current: POST to `/api/inject`, redirect to `/publishing?jobId=...`
- The button lives in the toolbar instead of the bottom nav

## Visual Style

- Follows existing project design: dark theme (zinc-950 background, zinc-900/800 cards)
- Accent color: emerald-500 (#10b981)
- Font sizes consistent with existing pages
- Edit panel inputs: `bg-zinc-800 border-zinc-700 text-white` (matching ContentBlock.tsx style)
- Toolbar: `bg-zinc-900 border-b border-zinc-800`

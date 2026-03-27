# Store Generation Pipeline — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Scope:** Build the pipeline that maps onboarding choices to Wix templates, generates default content, injects everything via Wix API, publishes, and shows progress on the existing `/publishing` page.

## Overview

After the simplified 4-step onboarding, the pipeline:
1. Creates a Wix site using the template mapped to the chosen layout (classic or modern)
2. Generates pre-defined content locally based on store name, colors, and layout
3. Injects all content + branding into Wix CMS collections
4. Publishes the site
5. Shows real-time progress via SSE on the existing `/publishing` page

No AI API calls. No manual content editing step. The flow goes straight from onboarding → site creation → injection → publishing.

## 1. Template Mapping

### Module: `lib/templateMap.ts`

```typescript
const TEMPLATE_MAP: Record<string, string> = {
  classic: "9b6ae83a-02a6-4c47-8816-bade636b412e",
  modern: "9b6ae83a-02a6-4c47-8816-bade636b412e",  // placeholder — update when second template is created
};
```

- Both layouts currently point to the same template ID (the existing eCommerce template)
- When the modern template is created in Wix, only this map needs updating
- The `create-site` API route reads `layoutType` from the request body and looks up the template ID

### Fallback
If `layoutType` is not in the map, defaults to the classic template.

## 2. Default Content Generation

### Module: `lib/defaultContent.ts`

Exports `generateDefaultContent(config)` where config contains:
- `storeName: string`
- `primaryColor: string`
- `secondaryColor: string`
- `accentColor: string`
- `layoutType: "classic" | "modern"`
- `bannerBgColor: string`
- `bannerTextColor: string`
- `bannerCtaColor: string`
- `logoSvg: string`
- `logoVariant: string`

Returns a full `StoreContent` object with pre-defined text personalized with the store name.

### Content by Section

**Topbar:**
`"🔥 Frete grátis acima de R$199 | {storeName}"`

**WhatsApp Greeting:**
`"Olá! Vi o site da {storeName} e quero saber mais sobre as camisas!"`

**Trust Bar (3 items):**
1. `{ icon: "shield", text: "Qualidade garantida" }`
2. `{ icon: "truck", text: "Entrega para todo Brasil" }`
3. `{ icon: "creditcard", text: "Parcele em até 12x" }`

**Promo Banner:**
```
{
  title: "Novidades Toda Semana",
  subtitle: "As melhores camisas de futebol na {storeName}",
  ctaLabel: "Ver Coleção",
  ctaLink: "/colecao"
}
```

**Categories (4 items):**
Classic layout:
```
["Brasileirão", "Seleções", "Europa", "Retrô"]
```
Modern layout:
```
["Mais Vendidos", "Novidades", "Promoção"]
```
(Modern uses 3 categories since they display as horizontal scroll cards)

**Footer:**
```
{
  tagline: "{storeName} — Vista a camisa do seu time.",
  aboutText: "A {storeName} é referência em camisas de futebol. Trabalhamos com as melhores réplicas do mercado, garantindo qualidade e satisfação."
}
```

**Testimonials:** Empty array — testimonials are removed from both layouts.

## 3. Updated CMS Collections

### StoreConfig Collection — New Fields

Add the following fields to the `StoreConfig` collection schema:

| Field | Type | Description |
|-------|------|-------------|
| `layoutType` | TEXT | "classic" or "modern" |
| `accentColor` | TEXT | Accent color hex |
| `bannerBgColor` | TEXT | Banner background color |
| `bannerTextColor` | TEXT | Banner text color |
| `bannerCtaColor` | TEXT | Banner CTA button color |
| `logoSvg` | TEXT | Full SVG string of the logo |
| `logoVariant` | TEXT | "shirt", "shield", "bold", or "script" |

These are added to the `ensureCollection` call for `StoreConfig` in the inject route.

### Banners Collection — Updated Data

Instead of injecting image URLs (heroBannerDesktopUrl, heroBannerMobileUrl), the banner entry now uses the banner color scheme:
- `bgColor`: banner background color
- `textColor`: banner text color
- `ctaColor`: banner CTA color
- Existing fields (`title`, `subtext`, `ctaLabel`, `ctaLink`) remain and use promo banner content

### Testimonials Collection — Skipped

The inject pipeline skips the testimonials collection entirely. No clear, no insert. The `REQUIRED_COLLECTIONS` array in the inject route removes the testimonials entry.

## 4. Pipeline Modifications

### `app/api/wix/create-site/route.ts`

- Import `TEMPLATE_MAP` from `lib/templateMap.ts`
- Use `TEMPLATE_MAP[layoutType]` instead of hardcoded template ID
- Fallback to classic template if `layoutType` is not recognized

### `app/api/inject/route.ts` — `processProvisionRun()`

Updated injection sequence:

1. **Preflight** — same as before
2. **Ensure collections** — same, but:
   - `StoreConfig` gets 7 new fields (layoutType, accentColor, bannerBgColor, bannerTextColor, bannerCtaColor, logoSvg, logoVariant)
   - `Banners` gets 3 new fields (bgColor, textColor, ctaColor)
   - Skip `Testimonials` collection creation
3. **Inject StoreConfig** — includes all new branding fields
4. **Inject Banners** — uses banner color scheme instead of image URLs
5. **Inject TrustBar** — same as before
6. **Inject Categories** — same as before
7. **Inject PromoBanner** — same as before
8. **Skip Testimonials** — removed
9. **Publish** — same as before

### `config/collections.ts`

No structural changes needed. The testimonials key stays in the config (it's just not used in the inject pipeline anymore).

## 5. Onboarding handleFinish — Updated Flow

The `handleFinish` function in `app/onboarding/page.tsx` changes to:

```
1. POST /api/wix/create-site → get { storeId, siteId, metaSiteId }
2. generateDefaultContent(config) → get StoreContent
3. POST /api/inject → get { jobId }
4. router.push(/publishing?jobId=X)
```

The key change is that after creating the site, the onboarding page now also generates content and triggers injection — all before redirecting. The user goes straight from "Finalizar" to seeing the publishing progress.

### Session Update

Before redirecting to `/publishing`, update session with:
- `onboarding` data (siteId, siteUrl, instanceId, apiKey from store)
- `storeId`
- `content` (the generated default content)

## 6. Publishing Page

No changes needed. The existing `/publishing` page with `InjectLog` component handles everything:
- SSE streaming from `/api/inject/[jobId]`
- Real-time log display
- Success/error states
- "Ir para o Dashboard" button on completion

The only cosmetic update: change `FLOW_STEPS` to match the new 4-step flow labels.

## File Changes

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/templateMap.ts` | Create | Layout → Wix template ID mapping |
| `lib/defaultContent.ts` | Create | Pre-defined content generator (no AI) |
| `app/api/wix/create-site/route.ts` | Modify | Use templateMap for template selection |
| `app/api/inject/route.ts` | Modify | Add branding fields, remove testimonials, update injection |
| `app/onboarding/page.tsx` | Modify | handleFinish generates content + calls inject + redirects to publishing |
| `app/publishing/page.tsx` | Modify | Update FLOW_STEPS labels to match new 4-step flow |

## Edge Cases

- **Template ID not found**: Falls back to classic template. Logged as warning.
- **create-site fails**: Toast error, stays on step 4. No injection attempted.
- **inject fails**: Publishing page shows error logs via SSE. User can retry from dashboard.
- **Empty store name**: Validated in onboarding — can't reach handleFinish without it.
- **Logo SVG too long for CMS TEXT field**: SVGs are ~500-800 chars. Wix TEXT fields support up to 50KB. No issue.

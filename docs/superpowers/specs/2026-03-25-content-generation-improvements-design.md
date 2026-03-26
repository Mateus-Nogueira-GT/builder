# Content Generation Improvements — Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Scope:** Add partial block regeneration (local variations) and content version history (Supabase) to the `/generate` page

## Overview

Two features for the content generation step:
1. **Partial regeneration** — each content block gets a "regenerate" button that produces variations locally (no API call) using templates and the store's onboarding data.
2. **Version history** — before each regeneration, a full snapshot of `StoreContent` is saved to Supabase. Users can browse and restore previous versions.

## 1. Partial Regeneration (Local Variations)

### Architecture

A new module `lib/contentVariations.ts` exports a function per block type. Each function takes the current `StoreContent` and `OnboardingData`, and returns a new version of that block's data using templates, shuffling, and randomization — no API call.

### Variation Strategies

**Topbar** (`generateTopbarVariation`):
- Bank of ~8 templates using `storeName`, `activePromotion`, `city`:
  - `"🔥 {activePromotion} | Frete grátis acima de R$199"`
  - `"⚽ {storeName} — Novidades toda semana!"`
  - `"🚚 Entrega expressa para {city} e região"`
  - `"💥 {activePromotion} | Parcele em até 12x"`
  - `"🏆 A melhor loja de camisas de {city}"`
  - `"⭐ {storeName} — Qualidade e preço justo"`
  - `"🎯 {activePromotion} | Só essa semana!"`
  - `"🔝 Vista a camisa do seu time | {storeName}"`
- Picks a random template different from the current value.

**WhatsApp Greeting** (`generateWhatsappVariation`):
- Bank of ~6 templates using `storeName`, `activePromotion`:
  - `"Olá! Vi o site da {storeName} e quero saber mais sobre as camisas!"`
  - `"Oi! Gostaria de aproveitar a promoção {activePromotion}!"`
  - `"Olá! Vocês têm a camisa do meu time? Quero encomendar!"`
  - `"Oi {storeName}! Quais são as novidades?"`
  - `"Olá! Quero comprar uma camisa, podem me ajudar?"`
  - `"Oi! Vi que vocês têm {activePromotion}, como funciona?"`

**Trust Bar** (`generateTrustBarVariation`):
- Bank of ~12 trust items (icon + text), grouped into sets of 3:
  - `[{shield, "Qualidade garantida"}, {truck, "Frete grátis acima de R$199"}, {creditcard, "12x sem juros"}]`
  - `[{shield, "100% seguro"}, {truck, "Entrega expressa"}, {creditcard, "Parcele no cartão"}]`
  - `[{shield, "Satisfação garantida"}, {truck, "Entrega para todo Brasil"}, {creditcard, "Pague como quiser"}]`
  - `[{shield, "Troca garantida"}, {truck, "Frete grátis para {city}"}, {creditcard, "Todos os cartões"}]`
- Picks a random set different from current.

**Promo Banner** (`generatePromoBannerVariation`):
- Bank of ~6 variations using `activePromotion`:
  - `{title: "{activePromotion}", subtitle: "Aproveite por tempo limitado", ctaLabel: "Ver Ofertas", ctaLink: "/colecao"}`
  - `{title: "Mega Promoção", subtitle: "{activePromotion} em camisas selecionadas", ctaLabel: "Comprar Agora", ctaLink: "/promocao"}`
  - `{title: "Só Hoje!", subtitle: "{activePromotion} | Não perca!", ctaLabel: "Aproveitar", ctaLink: "/ofertas"}`
  - `{title: "Oferta Imperdível", subtitle: "{activePromotion}", ctaLabel: "Conferir", ctaLink: "/colecao"}`
  - `{title: "Liquidação", subtitle: "Camisas a partir de R$89", ctaLabel: "Ver Tudo", ctaLink: "/liquidacao"}`
  - `{title: "Black Friday Antecipada", subtitle: "{activePromotion} em todo site", ctaLabel: "Garantir", ctaLink: "/black-friday"}`

**Categories** (`generateCategoriesVariation`):
- Bank by `focus`:
  - `brasileirao`: ["Brasileirão Série A", "Brasileirão Série B", "Copa do Brasil", "Estaduais"] / ["Flamengo", "Corinthians", "Palmeiras", "São Paulo"] / ["Times do Sul", "Times do Nordeste", "Times de SP", "Times do RJ"]
  - `copa`: ["Seleção Brasileira", "Argentina", "Alemanha", "França"] / ["Europa", "América do Sul", "África", "Ásia"]
  - `retro`: ["Anos 70", "Anos 80", "Anos 90", "Anos 2000"] / ["Retrô Brasil", "Retrô Europa", "Retrô Clássicos", "Retrô Edição Especial"]
  - `todos`: ["Brasileirão", "Seleções", "Europa", "Retrô"] / ["Mais Vendidos", "Novidades", "Promoção", "Infantil"]
- Picks a random set for the given focus, different from current.

**Testimonials** (`generateTestimonialsVariation`):
- Bank of ~12 testimonials (name, city, rating 4-5, text). Picks 4 random ones different from current set.
- Names: Brazilian common names (João, Maria, Carlos, Ana, Pedro, Julia, etc.)
- Cities: mix of Brazilian capitals
- Texts: ~12 varied positive review templates about football jerseys

**Footer** (`generateFooterVariation`):
- Bank of ~6 taglines and ~6 about texts using `storeName`, `city`:
  - Taglines: `"{storeName} — Vista a camisa do seu time"`, `"Paixão pelo futebol, qualidade na camisa"`, etc.
  - About texts: `"A {storeName} é referência em camisas de futebol em {city}..."`, etc.
- Picks random tagline + about text different from current.

### Variation Function Signature

```typescript
type BlockName = "topbar" | "whatsapp" | "trustBar" | "promoBanner" | "categories" | "testimonials" | "footer";

function generateVariation(
  blockName: BlockName,
  currentContent: StoreContent,
  onboarding: OnboardingData
): Partial<StoreContent>;
```

Returns only the changed fields (e.g., `{ topbar: "new text" }`) which gets merged into the existing content.

## 2. Version History (Supabase)

### Database

**New table: `content_versions`**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `store_id` | uuid | FK → stores(id), NOT NULL |
| `content` | jsonb | NOT NULL — full StoreContent snapshot |
| `trigger` | text | NOT NULL — "full_regeneration" or "block_regeneration" |
| `block_name` | text | nullable — which block was regenerated, null if full |
| `created_at` | timestamptz | default now() |

Index on `(store_id, created_at DESC)` for fast listing.

### API Routes

**`POST /api/content-versions`**
- Body: `{ storeId: string, content: StoreContent, trigger: string, blockName?: string }`
- Inserts a new row into `content_versions`
- After inserting, deletes excess versions if count > 20 per store (keeps newest 20)
- Returns: `{ id, created_at }`

**`GET /api/content-versions?storeId=X`**
- Returns array of versions ordered by `created_at DESC`
- Fields: `id`, `trigger`, `block_name`, `created_at` (NOT the full content — it's heavy)
- Max 20 results

**`GET /api/content-versions/[id]`**
- Returns full version including `content` jsonb
- Used when user clicks to restore a specific version

### Save Triggers

A snapshot is saved **before** applying the new variation/regeneration:
1. User clicks "regenerar" on a block → save current content as version with `trigger: "block_regeneration"`, `block_name: "topbar"` → then apply variation
2. User clicks "Regenerar tudo" → save current content as version with `trigger: "full_regeneration"` → then call OpenAI API

### Restore Flow

1. User clicks "Histórico" button → fetches version list from API
2. User clicks a version → fetches full content from API
3. Content is restored to state and sessionStorage via `setSession({ content })`
4. Toast: "Versão restaurada"

## 3. UI Changes

### ContentBlock Component

Add an optional `onRegenerate` callback prop:

```typescript
interface ContentBlockProps {
  title: string;
  isComplete: boolean;
  fields: FieldDef[];
  onFieldChange: (key: string, value: string) => void;
  onRegenerate?: () => void;        // NEW
  isRegenerating?: boolean;          // NEW
}
```

When `onRegenerate` is provided, render a small `RotateCcw` icon button next to the title, between the completion indicator and the title text. When clicked, calls `onRegenerate`. Shows a brief spin animation while `isRegenerating` is true.

### VersionHistory Component

New `components/VersionHistory.tsx`:
- Receives `storeId`, `onRestore: (content: StoreContent) => void`
- Renders as a dropdown/popover triggered by a "Histórico" button
- Lists versions with:
  - Relative timestamp ("há 5 min", "há 1 hora")
  - Trigger label: "Regeneração completa" or "Regeneração: {blockName}"
- Clicking a version fetches full content and calls `onRestore`
- Empty state: "Nenhuma versão anterior"

### Generate Page Changes

- Each `ContentBlock` gets `onRegenerate` wired to `generateVariation()` + version save
- "Histórico" button added to the header area, next to "Regenerar tudo"
- `regeneratingBlock` state tracks which block is currently regenerating (for spinner)
- New helper `saveVersionAndRegenerate(blockName)` that:
  1. POSTs current content to `/api/content-versions`
  2. Calls `generateVariation(blockName, content, onboarding)`
  3. Merges result into state + sessionStorage

## File Changes

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/contentVariations.ts` | Create | All variation generation logic per block |
| `app/api/content-versions/route.ts` | Create | GET list / POST new version |
| `app/api/content-versions/[id]/route.ts` | Create | GET single version with full content |
| `components/ContentBlock.tsx` | Modify | Add regenerate button (onRegenerate prop) |
| `components/VersionHistory.tsx` | Create | Dropdown listing versions with restore |
| `app/generate/page.tsx` | Modify | Wire up partial regeneration + history |

## Edge Cases

- **No storeId yet**: If the user hasn't created a store yet (storeId is null in session), version saving is skipped silently. The feature degrades gracefully — regeneration still works, just no history.
- **API errors on version save**: Non-blocking. If the POST fails, log a warning but proceed with the regeneration. Don't block the user from using the app because history save failed.
- **Restore with missing fields**: If a restored version is missing fields that were added later to `StoreContent`, merge with defaults from `generateFallbackContent`.
- **Concurrent regeneration**: Disable all regenerate buttons while any regeneration is in progress (using `regeneratingBlock` state).

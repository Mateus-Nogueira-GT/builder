# Product Injection Pipeline — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Scope:** Pull products from external Supabase catalog (TORCEDOR category), inject 100 during publishing (prioritized by focus), continue injecting 200 every 1min in background until all ~3,050 products are synced.

## Overview

Products live in a separate Supabase project (`xygzdgqlztucmhpkolvx`). The `products_group` table filters by `group_name = "TORCEDOR"` to get `catalog_product_id`s. The `catalog_products` table has the full product data (name, description, images, variants/price, SKU, categories).

The pipeline:
1. Adds a "Focus" field to onboarding Step 1
2. During publishing, fetches 100 products prioritized by focus and injects them via Wix Stores API
3. After publishing completes, starts a background sync job that injects 200 products every 1 minute until all are done

## 1. Onboarding — Add Focus Field

### OnboardingState Change

Add to the `OnboardingState` interface:
```typescript
focus: "brasileirao" | "copa" | "retro" | "todos";
```
Default value: `"todos"`.

### UI Change (Step 1)

Add a `<Select>` below the store name input in Step 1:
- Label: "Foco da Loja"
- Options:
  - `brasileirao` → "Brasileirão"
  - `copa` → "Copa do Mundo"
  - `retro` → "Retrô"
  - `todos` → "Todos os estilos"

### Session Sync

The `focus` value is included in the session's `onboarding.focus` field (already defined in `OnboardingData` type).

### handleFinish

Pass `focus` in the payload to `/api/inject` so the inject pipeline knows which products to prioritize.

## 2. External Catalog Client

### Module: `lib/externalCatalog.ts`

Creates a second Supabase client pointing to project `xygzdgqlztucmhpkolvx`.

**Environment variables to add to `.env.local`:**
```
EXTERNAL_SUPABASE_URL=https://xygzdgqlztucmhpkolvx.supabase.co
EXTERNAL_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5Z3pkZ3FsenR1Y21ocGtvbHZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg2MzEwMCwiZXhwIjoyMDg1NDM5MTAwfQ._IpO27SbiOmJZrh9YOph6NSi_lwgv0ZNeycZJ28r-DQ
```

### Functions

**`fetchTorcedorProductIds(): Promise<string[]>`**
- Queries `products_group` where `group_name = "TORCEDOR"`
- Returns array of `catalog_product_id` strings
- Paginated internally (1000 per page) to get all ~3,050 IDs

**`fetchProducts(ids: string[], limit: number, offset: number): Promise<CatalogProduct[]>`**
- Queries `catalog_products` where `id` is in the provided IDs array
- Returns `limit` products starting at `offset`
- Ordered by `created_at DESC`

**`fetchProductsByFocus(focus: string, limit: number): Promise<CatalogProduct[]>`**
- Queries `catalog_products` joined with `products_group` (TORCEDOR)
- Filters by `category_cache` content:
  - `brasileirao` → category_cache contains "Brasileirão"
  - `copa` → category_cache contains "Seleção" or "Seleções"
  - `retro` → category_cache contains "Retrô"
  - `todos` → no filter, just return most recent
- Returns `limit` products ordered by `created_at DESC`

### CatalogProduct Type
```typescript
interface CatalogProduct {
  id: string;
  sku: string;
  name: { pt: string };
  description: { pt: string };
  images: Array<{ src: string; position: number }>;
  variants: Array<{ price: string; sku: string; stock: number | null }>;
  category_cache: string[];
  is_published: boolean;
}
```

## 3. Product Mapper

### Module: `lib/productMapper.ts`

Transforms `CatalogProduct` → Wix product format.

**`mapToWixProduct(product: CatalogProduct): WixProduct`**

Mapping:
- `name` → `product.name.pt`
- `description` → `product.description.pt` (HTML, Wix accepts rich text)
- `productType` → `"physical"`
- `priceData.price` → `parseFloat(product.variants[0]?.price || "0")`
- `priceData.currency` → `"BRL"`
- `sku` → `product.sku`
- `media.items[0].image.url` → `product.images[0]?.src` (first image)
- `media.items[1+]` → additional images
- `visible` → `product.is_published`

### WixProduct Type
```typescript
interface WixProduct {
  name: string;
  description: string;
  productType: "physical";
  priceData: { price: number; currency: string };
  sku: string;
  media: { items: Array<{ image: { url: string } }> };
  visible: boolean;
}
```

## 4. Wix Stores API Integration

### Addition to `lib/wix.ts`

**`createProduct(apiKey: string, siteId: string, product: WixProduct): Promise<void>`**
- POST to `https://www.wixapis.com/stores/v1/products`
- Body: `{ product }`
- Uses existing `wixFetch` helper with retry

**`createProducts(apiKey: string, siteId: string, products: WixProduct[]): Promise<{ created: number; failed: number }>`**
- Iterates over products, calls `createProduct` for each
- Catches individual failures without stopping the batch
- Returns count of created and failed
- Includes a 200ms delay between products to respect rate limits

## 5. Batch Initial (During Publishing)

### Modification to `app/api/inject/route.ts` — `processProvisionRun()`

After injecting CMS content and before publishing, add a new step:

```
Step: "products"
1. Read focus from payload.onboarding.focus
2. Call fetchProductsByFocus(focus, 100) to get prioritized products
3. Map each to WixProduct via mapToWixProduct
4. Call createProducts(apiKey, siteId, mappedProducts)
5. Log: "Injetando 100 produtos iniciais... X criados, Y falhas"
6. After publish, trigger background sync
```

### Triggering Background Sync

After successful publishing, the inject route calls:
```
POST /api/products/sync
Body: { storeId, siteId, apiKey, focus, totalIds: [...all TORCEDOR IDs], initialOffset: 100 }
```

This is a fire-and-forget call — the inject route doesn't wait for it.

## 6. Background Sync

### API Route: `app/api/products/sync/route.ts` (POST)

Creates a sync job in the builder project's Supabase:
- Inserts into `product_sync_jobs` table:
  - `store_id`, `site_id`, `api_key`
  - `total_product_ids` (jsonb array of all TORCEDOR catalog_product_ids)
  - `current_offset` (starts at 100 — the initial batch already done)
  - `batch_size` (200)
  - `status` ("running")
  - `created_at`
- Immediately calls `/api/products/sync/process` to start the first background batch

### API Route: `app/api/products/sync/process/route.ts` (POST)

Processes one batch:
1. Reads the oldest `product_sync_jobs` with `status = "running"`
2. Gets the slice of IDs: `total_product_ids[current_offset .. current_offset + batch_size]`
3. Fetches those products from external catalog
4. Maps and injects via Wix API
5. Updates `current_offset += batch_size`
6. If `current_offset >= total_product_ids.length`, set `status = "completed"`
7. If status is still "running", schedules next batch by calling itself with a 60-second delay via `setTimeout` + `fetch`

### Self-scheduling

The process route uses a pattern where after completing a batch, it calls itself after a 60s delay:
```typescript
// Fire and forget — schedule next batch in 60s
setTimeout(() => {
  fetch(`${process.env.NEXTAUTH_URL}/api/products/sync/process`, {
    method: "POST",
  }).catch(() => {});
}, 60000);
```

This avoids needing an external cron service. The chain continues until all products are synced.

### Product Sync Jobs Table (Builder Supabase)

New table in the builder project's Supabase (`qgyehlnydiknypzwpyyq`):

```sql
CREATE TABLE IF NOT EXISTS product_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  site_id text NOT NULL,
  api_key text NOT NULL,
  total_product_ids jsonb NOT NULL,
  current_offset integer DEFAULT 0,
  batch_size integer DEFAULT 200,
  status text DEFAULT 'running',
  products_created integer DEFAULT 0,
  products_failed integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Note:** This table needs to be created in the builder project's Supabase. Since we can't run SQL directly, the code will handle the case where the table doesn't exist gracefully (log warning, skip sync).

## 7. Focus → Category Mapping

For filtering products by focus in the initial batch:

| Focus | `category_cache` filter |
|-------|------------------------|
| `brasileirao` | Contains "Brasileirão" |
| `copa` | Contains "Seleção" or "Seleções" |
| `retro` | Contains "Retrô" |
| `todos` | No filter — most recent by `created_at DESC` |

The filter uses Supabase's `cs` (contains) operator on the `category_cache` array field.

## File Changes

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/externalCatalog.ts` | Create | External Supabase client + product queries |
| `lib/productMapper.ts` | Create | CatalogProduct → WixProduct transformation |
| `lib/wix.ts` | Modify | Add createProduct/createProducts functions |
| `app/api/inject/route.ts` | Modify | Add product injection step before publishing |
| `app/api/products/sync/route.ts` | Create | Start background sync job |
| `app/api/products/sync/process/route.ts` | Create | Process one batch of 200 products |
| `app/onboarding/page.tsx` | Modify | Add Focus select to Step 1 |
| `.env.local` | Modify | Add EXTERNAL_SUPABASE_URL and EXTERNAL_SUPABASE_KEY |

## Edge Cases

- **External Supabase unreachable**: Log warning, skip product injection. Store is published without products. User can retry via dashboard later.
- **Wix rate limiting**: The 200ms delay between products and 1min between batches should keep us under limits. If a product fails, it's skipped and counted in `products_failed`.
- **Server restart during background sync**: The sync job stays in "running" status. A future improvement could add a cleanup mechanism, but for now the job can be manually restarted.
- **Duplicate products**: Wix Products API creates new products each time. The sync should only run once per store. The job's `store_id` + `status` prevents duplicates.
- **Products without images**: Map with empty media array. Wix allows products without images.
- **Products with price "0.00"**: Still injected — the store owner can update prices later.

# Product Injection Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pull TORCEDOR products from an external Supabase catalog, inject 100 during publishing (prioritized by store focus), and continue syncing 200 every 1 min in background until all ~3,050 products are in the Wix store.

**Architecture:** An external catalog client queries the second Supabase project. A mapper transforms catalog products into Wix format. The inject route adds a product injection step before publishing. After publish, a self-scheduling background sync processes remaining products in batches. The onboarding gains a "Focus" field to prioritize the initial batch.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase JS client (two instances), Wix REST API (Stores v1), existing inject/provisioning pipeline.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/externalCatalog.ts` | Create | External Supabase client + product queries |
| `lib/productMapper.ts` | Create | CatalogProduct → WixProduct transformation |
| `lib/wix.ts` | Modify | Add createProduct/createProducts functions |
| `app/api/inject/route.ts` | Modify | Add product injection step + trigger background sync |
| `app/api/products/sync/route.ts` | Create | Start background sync job |
| `app/api/products/sync/process/route.ts` | Create | Process one batch of 200 products |
| `app/onboarding/page.tsx` | Modify | Add Focus select to Step 1 |
| `.env.local` | Modify | Add external Supabase credentials |

---

### Task 1: Add Environment Variables

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Add external Supabase credentials to .env.local**

Append these lines to the end of `.env.local`:

```
# External Catalog (Supabase project with products)
EXTERNAL_SUPABASE_URL=https://xygzdgqlztucmhpkolvx.supabase.co
EXTERNAL_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5Z3pkZ3FsenR1Y21ocGtvbHZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg2MzEwMCwiZXhwIjoyMDg1NDM5MTAwfQ._IpO27SbiOmJZrh9YOph6NSi_lwgv0ZNeycZJ28r-DQ
```

- [ ] **Step 2: Commit** (no commit — .env.local is gitignored)

---

### Task 2: Create External Catalog Client

**Files:**
- Create: `lib/externalCatalog.ts`

- [ ] **Step 1: Create lib/externalCatalog.ts**

```typescript
// lib/externalCatalog.ts
import { createClient } from "@supabase/supabase-js";

const externalSupabase = createClient(
  process.env.EXTERNAL_SUPABASE_URL!,
  process.env.EXTERNAL_SUPABASE_KEY!
);

export interface CatalogProduct {
  id: string;
  sku: string;
  name: { pt: string };
  description: { pt: string };
  images: Array<{ src: string; position: number }>;
  variants: Array<{ price: string; sku: string; stock: number | null }>;
  category_cache: string[];
  is_published: boolean;
}

const FOCUS_CATEGORY_MAP: Record<string, string[]> = {
  brasileirao: ["Brasileirão"],
  copa: ["Seleção", "Seleções"],
  retro: ["Retrô"],
  todos: [],
};

export async function fetchTorcedorProductIds(): Promise<string[]> {
  const allIds: string[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await externalSupabase
      .from("products_group")
      .select("catalog_product_id")
      .eq("group_name", "TORCEDOR")
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("fetchTorcedorProductIds error:", error.message);
      break;
    }

    if (!data || data.length === 0) break;

    allIds.push(...data.map((row) => row.catalog_product_id));
    offset += pageSize;

    if (data.length < pageSize) break;
  }

  return allIds;
}

export async function fetchProducts(
  ids: string[],
  limit: number,
  offset: number
): Promise<CatalogProduct[]> {
  const slicedIds = ids.slice(offset, offset + limit);
  if (slicedIds.length === 0) return [];

  const { data, error } = await externalSupabase
    .from("catalog_products")
    .select("id, sku, name, description, images, variants, category_cache, is_published")
    .in("id", slicedIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchProducts error:", error.message);
    return [];
  }

  return (data as CatalogProduct[]) || [];
}

export async function fetchProductsByFocus(
  focus: string,
  limit: number
): Promise<CatalogProduct[]> {
  // First get all TORCEDOR IDs
  const torcedorIds = await fetchTorcedorProductIds();
  if (torcedorIds.length === 0) return [];

  const categoryFilters = FOCUS_CATEGORY_MAP[focus] || [];

  if (categoryFilters.length === 0) {
    // "todos" — just get the most recent products
    return fetchProducts(torcedorIds, limit, 0);
  }

  // Fetch products and filter by category_cache in batches
  const results: CatalogProduct[] = [];
  let offset = 0;
  const batchSize = 500;

  while (results.length < limit && offset < torcedorIds.length) {
    const batch = await fetchProducts(torcedorIds, batchSize, offset);
    if (batch.length === 0) break;

    for (const product of batch) {
      if (results.length >= limit) break;
      const matches = categoryFilters.some((filter) =>
        product.category_cache.some((cat) => cat.includes(filter))
      );
      if (matches) {
        results.push(product);
      }
    }

    offset += batchSize;
  }

  // If not enough focused products, fill with any TORCEDOR products
  if (results.length < limit) {
    const existingIds = new Set(results.map((p) => p.id));
    const filler = await fetchProducts(torcedorIds, limit - results.length, 0);
    for (const product of filler) {
      if (results.length >= limit) break;
      if (!existingIds.has(product.id)) {
        results.push(product);
      }
    }
  }

  return results;
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -10`

- [ ] **Step 3: Commit**

```bash
git add lib/externalCatalog.ts
git commit -m "feat: add external catalog client for fetching TORCEDOR products"
```

---

### Task 3: Create Product Mapper

**Files:**
- Create: `lib/productMapper.ts`

- [ ] **Step 1: Create lib/productMapper.ts**

```typescript
// lib/productMapper.ts
import type { CatalogProduct } from "./externalCatalog";

export interface WixProduct {
  name: string;
  description: string;
  productType: "physical";
  priceData: { price: number; currency: string };
  sku: string;
  media: { items: Array<{ image: { url: string } }> };
  visible: boolean;
}

export function mapToWixProduct(product: CatalogProduct): WixProduct {
  const images = (product.images || [])
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((img) => ({ image: { url: img.src } }));

  const price = parseFloat(product.variants?.[0]?.price || "0");

  return {
    name: product.name?.pt || "Produto sem nome",
    description: product.description?.pt || "",
    productType: "physical",
    priceData: { price, currency: "BRL" },
    sku: product.sku || "",
    media: { items: images },
    visible: product.is_published ?? true,
  };
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -10`

- [ ] **Step 3: Commit**

```bash
git add lib/productMapper.ts
git commit -m "feat: add product mapper for CatalogProduct to WixProduct transformation"
```

---

### Task 4: Add createProduct/createProducts to Wix Client

**Files:**
- Modify: `lib/wix.ts`

- [ ] **Step 1: Add Wix Stores API constant and product functions**

First READ the file, then append the following at the END of the file (before the last line or after the `publishSite` function):

Find the end of the file (after the `publishSite` function closing brace). Append:

```typescript

/* ──────────────────── Product Management ─────────────── */

const WIX_STORES_API = "https://www.wixapis.com/stores/v1";

/**
 * Creates a single product in the Wix store.
 */
export async function createProduct(
  apiKey: string,
  siteId: string,
  product: {
    name: string;
    description: string;
    productType: string;
    priceData: { price: number; currency: string };
    sku: string;
    media: { items: Array<{ image: { url: string } }> };
    visible: boolean;
  }
): Promise<void> {
  await withRetry(async () => {
    await wixFetch(`${WIX_STORES_API}/products`, {
      apiKey,
      siteId,
      method: "POST",
      body: { product },
    });
  }, 2);
}

/**
 * Creates multiple products with rate limiting.
 * Returns count of created and failed products.
 */
export async function createProducts(
  apiKey: string,
  siteId: string,
  products: Array<{
    name: string;
    description: string;
    productType: string;
    priceData: { price: number; currency: string };
    sku: string;
    media: { items: Array<{ image: { url: string } }> };
    visible: boolean;
  }>
): Promise<{ created: number; failed: number }> {
  let created = 0;
  let failed = 0;

  for (const product of products) {
    try {
      await createProduct(apiKey, siteId, product);
      created++;
    } catch (err) {
      console.error(`Failed to create product "${product.name}":`, err instanceof Error ? err.message : err);
      failed++;
    }
    // 200ms delay between products to respect rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  return { created, failed };
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -10`

- [ ] **Step 3: Commit**

```bash
git add lib/wix.ts
git commit -m "feat: add createProduct and createProducts to Wix client for Stores API"
```

---

### Task 5: Add Focus Field to Onboarding

**Files:**
- Modify: `app/onboarding/page.tsx`

- [ ] **Step 1: Add focus to OnboardingState**

First READ the file. Find:
```typescript
interface OnboardingState {
  storeName: string;
  palette: Palette;
  layoutType: "classic" | "modern";
```
Replace with:
```typescript
interface OnboardingState {
  storeName: string;
  focus: "brasileirao" | "copa" | "retro" | "todos";
  palette: Palette;
  layoutType: "classic" | "modern";
```

- [ ] **Step 2: Add focus default in useState initializer**

Find:
```typescript
      storeName: ob?.storeName || "",
      palette: PALETTES.find(p => p.primary === ob?.primaryColor) || defaultPalette,
```
Replace with:
```typescript
      storeName: ob?.storeName || "",
      focus: (ob?.focus as "brasileirao" | "copa" | "retro" | "todos") || "todos",
      palette: PALETTES.find(p => p.primary === ob?.primaryColor) || defaultPalette,
```

- [ ] **Step 3: Add focus to session sync useEffect**

Find in the session sync useEffect:
```typescript
        focus: "todos",
```
Replace with:
```typescript
        focus: form.focus,
```

- [ ] **Step 4: Add focus to handleFinish payload**

Find in handleFinish:
```typescript
          storeName: form.storeName,
          primaryColor: form.palette.primary,
```
Replace with:
```typescript
          storeName: form.storeName,
          focus: form.focus,
          primaryColor: form.palette.primary,
```

- [ ] **Step 5: Add focus to updatedOnboarding in handleFinish**

Find:
```typescript
        accentColor: form.palette.accent,
        layoutType: form.layoutType,
```
Replace with:
```typescript
        focus: form.focus,
        accentColor: form.palette.accent,
        layoutType: form.layoutType,
```

- [ ] **Step 6: Add Select UI in Step 1**

Add the `Select` import. Find:
```typescript
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
```
Replace with:
```typescript
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
```

Then find in Step 1's CardContent (after the store name input div, before PaletteSelector):
```typescript
              <PaletteSelector
```
Add BEFORE it:
```typescript
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Foco da Loja</label>
                <Select value={form.focus} onValueChange={(v) => update({ focus: v as OnboardingState["focus"] })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brasileirao">Brasileirão</SelectItem>
                    <SelectItem value="copa">Copa do Mundo</SelectItem>
                    <SelectItem value="retro">Retrô</SelectItem>
                    <SelectItem value="todos">Todos os estilos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <PaletteSelector
```

- [ ] **Step 7: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -10`

- [ ] **Step 8: Commit**

```bash
git add app/onboarding/page.tsx
git commit -m "feat: add Focus select field to onboarding Step 1"
```

---

### Task 6: Add Product Injection Step to Inject Route

**Files:**
- Modify: `app/api/inject/route.ts`

- [ ] **Step 1: Add imports at the top**

First READ the file. Find:
```typescript
import { COLLECTIONS } from '@/config/collections';
```
Replace with:
```typescript
import { COLLECTIONS } from '@/config/collections';
import { fetchTorcedorProductIds, fetchProductsByFocus, fetchProducts } from '@/lib/externalCatalog';
import { mapToWixProduct } from '@/lib/productMapper';
import { createProducts } from '@/lib/wix';
```

Note: `createProducts` is already available from `@/lib/wix` but needs to be added to the import. Since the file already imports from `@/lib/wix`, find:
```typescript
import { publishSite, runTemplatePreflight, ensureCollection, clearCollection, upsertItem, bulkUpsertItems } from '@/lib/wix';
```
Replace with:
```typescript
import { publishSite, runTemplatePreflight, ensureCollection, clearCollection, upsertItem, bulkUpsertItems, createProducts } from '@/lib/wix';
import { fetchTorcedorProductIds, fetchProductsByFocus, fetchProducts } from '@/lib/externalCatalog';
import { mapToWixProduct } from '@/lib/productMapper';
```

- [ ] **Step 2: Add product injection step before publish**

Find in `processProvisionRun`, the line that starts the publish step (the one with `'Aplicando branding final do template.'`):
```typescript
    await appendProvisionLog(runId, createLog('Aplicando branding final do template.', 'success', 'branding'), {
        status: 'running',
        currentStep: 'publish',
    });
```
ADD BEFORE it (between the images step and the branding step):
```typescript

    // ── Product Injection ──
    await appendProvisionLog(runId, createLog('Injetando produtos iniciais...', 'running', 'products'), {
        status: 'running',
        currentStep: 'products',
    });

    try {
        const focus = (onboarding.focus as string) || 'todos';
        const initialProducts = await fetchProductsByFocus(focus, 100);
        if (initialProducts.length > 0) {
            const wixProducts = initialProducts.map(mapToWixProduct);
            const result = await createProducts(apiKey, siteId, wixProducts);
            await appendProvisionLog(
                runId,
                createLog(`Produtos iniciais: ${result.created} criados, ${result.failed} falhas.`, result.failed > 0 ? 'warning' : 'success', 'products'),
                { status: 'running', currentStep: 'branding' }
            );
        } else {
            await appendProvisionLog(runId, createLog('Nenhum produto encontrado no catálogo.', 'warning', 'products'), {
                status: 'running',
                currentStep: 'branding',
            });
        }
    } catch (err) {
        await appendProvisionLog(
            runId,
            createLog(`Erro ao injetar produtos: ${err instanceof Error ? err.message : 'Erro desconhecido'}`, 'warning', 'products'),
            { status: 'running', currentStep: 'branding' }
        );
    }

```

- [ ] **Step 3: Trigger background sync after publish**

Find the block where the store is updated after publish (near the end of `processProvisionRun`):
```typescript
    if (storeId) {
        await supabase
            .from('stores')
            .update({ template_ready: true, wix_site_url: siteUrl || null })
            .eq('id', storeId);
    }
```
ADD AFTER it:
```typescript

    // Trigger background product sync
    try {
        const allProductIds = await fetchTorcedorProductIds();
        if (allProductIds.length > 100) {
            fetch(`${process.env.NEXTAUTH_URL}/api/products/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId: storeId || '',
                    siteId,
                    apiKey,
                    totalProductIds: allProductIds,
                    initialOffset: 100,
                }),
            }).catch((err) => {
                console.warn('Failed to trigger background sync:', err);
            });
        }
    } catch (err) {
        console.warn('Failed to fetch product IDs for background sync:', err);
    }

```

- [ ] **Step 4: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -10`

- [ ] **Step 5: Commit**

```bash
git add app/api/inject/route.ts
git commit -m "feat: add product injection step and background sync trigger to inject pipeline"
```

---

### Task 7: Create Background Sync Routes

**Files:**
- Create: `app/api/products/sync/route.ts`
- Create: `app/api/products/sync/process/route.ts`

- [ ] **Step 1: Create app/api/products/sync/route.ts**

```typescript
// app/api/products/sync/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, siteId, apiKey, totalProductIds, initialOffset } = body;

    if (!siteId || !apiKey || !totalProductIds) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Insert sync job
    const { data, error } = await supabase
      .from("product_sync_jobs")
      .insert({
        store_id: storeId || "unknown",
        site_id: siteId,
        api_key: apiKey,
        total_product_ids: totalProductIds,
        current_offset: initialOffset || 100,
        batch_size: 200,
        status: "running",
        products_created: 0,
        products_failed: 0,
      })
      .select("id")
      .single();

    if (error) {
      console.warn("Failed to create sync job (table may not exist):", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Immediately trigger first batch
    fetch(`${process.env.NEXTAUTH_URL}/api/products/sync/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: data.id }),
    }).catch((err) => {
      console.warn("Failed to trigger first batch:", err);
    });

    return NextResponse.json({ jobId: data.id, status: "started" });
  } catch (err) {
    console.error("Sync route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao iniciar sync" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create app/api/products/sync/process/route.ts**

```typescript
// app/api/products/sync/process/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fetchProducts } from "@/lib/externalCatalog";
import { mapToWixProduct } from "@/lib/productMapper";
import { createProducts } from "@/lib/wix";

export async function POST(request: Request) {
  try {
    let jobId: string | undefined;

    try {
      const body = await request.json();
      jobId = body.jobId;
    } catch {
      // No body — find oldest running job
    }

    // Find the job to process
    let job;
    if (jobId) {
      const { data, error } = await supabase
        .from("product_sync_jobs")
        .select("*")
        .eq("id", jobId)
        .eq("status", "running")
        .single();

      if (error || !data) {
        return NextResponse.json({ status: "no_job_found" });
      }
      job = data;
    } else {
      const { data, error } = await supabase
        .from("product_sync_jobs")
        .select("*")
        .eq("status", "running")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (error || !data) {
        return NextResponse.json({ status: "no_running_jobs" });
      }
      job = data;
    }

    const totalIds = job.total_product_ids as string[];
    const currentOffset = job.current_offset as number;
    const batchSize = job.batch_size as number;

    if (currentOffset >= totalIds.length) {
      await supabase
        .from("product_sync_jobs")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", job.id);

      return NextResponse.json({ status: "completed", jobId: job.id });
    }

    // Fetch and inject batch
    const batchIds = totalIds.slice(currentOffset, currentOffset + batchSize);
    const products = await fetchProducts(totalIds, batchSize, currentOffset);
    const wixProducts = products.map(mapToWixProduct);
    const result = await createProducts(job.api_key, job.site_id, wixProducts);

    // Update job progress
    const newOffset = currentOffset + batchSize;
    const isComplete = newOffset >= totalIds.length;

    await supabase
      .from("product_sync_jobs")
      .update({
        current_offset: newOffset,
        products_created: (job.products_created || 0) + result.created,
        products_failed: (job.products_failed || 0) + result.failed,
        status: isComplete ? "completed" : "running",
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    // Schedule next batch if not complete
    if (!isComplete) {
      setTimeout(() => {
        fetch(`${process.env.NEXTAUTH_URL}/api/products/sync/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: job.id }),
        }).catch(() => {});
      }, 60000);
    }

    return NextResponse.json({
      status: isComplete ? "completed" : "processing",
      jobId: job.id,
      batch: { offset: currentOffset, created: result.created, failed: result.failed },
      progress: `${Math.min(newOffset, totalIds.length)}/${totalIds.length}`,
    });
  } catch (err) {
    console.error("Sync process error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro no processamento" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -10`

- [ ] **Step 4: Commit**

```bash
git add app/api/products/sync/route.ts app/api/products/sync/process/route.ts
git commit -m "feat: add background product sync routes with self-scheduling batches"
```

---

### Task 8: Type Check and Smoke Test

- [ ] **Step 1: Run final type check**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -20`
Expected: No application errors

- [ ] **Step 2: Verify in browser**

Checklist:
1. `/onboarding` Step 1 shows "Foco da Loja" select with 4 options
2. Complete all 4 steps and click "Finalizar"
3. Publishing page shows product injection step in logs: "Injetando produtos iniciais..."
4. After publish completes, background sync starts (check server logs)
5. Products appear in the Wix store dashboard

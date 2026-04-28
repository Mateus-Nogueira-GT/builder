/**
 * Size Migration — atualiza produtos existentes em lojas Wix com o seletor "Tamanho".
 *
 * Esta lib é a versão server-side do script add-sizes.mjs, adaptada para rodar
 * em batches pequenos dentro de jobs assíncronos (size_update_jobs).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildSizeProductOptions } from "./sizes";

let _externalClient: SupabaseClient | null = null;

function getExternalSupabase(): SupabaseClient {
  if (!_externalClient) {
    const url = process.env.EXTERNAL_SUPABASE_URL;
    const key = process.env.EXTERNAL_SUPABASE_KEY;
    if (!url || !key) {
      throw new Error("EXTERNAL_SUPABASE_URL e EXTERNAL_SUPABASE_KEY são obrigatórios");
    }
    _externalClient = createClient(url, key);
  }
  return _externalClient;
}

interface WixProduct {
  id: string;
  sku?: string;
  name?: string;
  productOptions?: unknown[];
}

async function tryQuery(
  url: string,
  apiKey: string,
  siteId: string,
  body: Record<string, unknown>
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; status: number; text: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "wix-site-id": siteId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, status: res.status, text };
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, status: res.status, text };
  }
}

export async function queryWixProductsCount(
  apiKey: string,
  siteId: string
): Promise<number> {
  // Tenta V1 primeiro
  const v1 = await tryQuery(
    "https://www.wixapis.com/stores/v1/products/query",
    apiKey,
    siteId,
    { query: { paging: { limit: 1, offset: 0 } } }
  );
  if (v1.ok) {
    return (v1.data.totalResults as number) || 0;
  }
  console.warn(`[sizeMigration] V1 count falhou status=${v1.status}: ${v1.text.slice(0, 200)} — tentando V3`);

  // Fallback V3
  const v3 = await tryQuery(
    "https://www.wixapis.com/stores/v3/products/search",
    apiKey,
    siteId,
    { search: { cursorPaging: { limit: 1 } } }
  );
  if (v3.ok) {
    const meta = v3.data.metadata as Record<string, unknown> | undefined;
    return ((meta?.total as number) ?? (v3.data.total as number)) || 0;
  }
  throw new Error(`Wix query falhou em V1 e V3 | V1: ${v1.status} ${v1.text.slice(0, 150)} | V3: ${v3.status} ${v3.text.slice(0, 150)}`);
}

export async function queryWixProducts(
  apiKey: string,
  siteId: string,
  offset: number,
  limit: number
): Promise<WixProduct[]> {
  const res = await fetch("https://www.wixapis.com/stores/v1/products/query", {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "wix-site-id": siteId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: { paging: { limit, offset } } }),
  });
  if (!res.ok) {
    throw new Error(`Wix query failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.products || [];
}

export async function fetchSizesBySkus(
  skus: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (skus.length === 0) return map;

  const { data, error } = await getExternalSupabase()
    .from("catalog_products")
    .select("sku, sizes")
    .in("sku", skus);

  if (error) throw new Error(`Supabase error: ${error.message}`);

  for (const row of data || []) {
    if (Array.isArray(row.sizes) && row.sizes.length > 0) {
      map.set(row.sku, row.sizes);
    }
  }
  return map;
}

async function patchProductOptions(
  apiKey: string,
  siteId: string,
  productId: string,
  sizes: string[]
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(
    `https://www.wixapis.com/stores/v1/products/${productId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: apiKey,
        "wix-site-id": siteId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product: {
          productOptions: buildSizeProductOptions(sizes),
          manageVariants: true,
        },
      }),
    }
  );
  if (!res.ok) {
    const errBody = await res.text();
    return { ok: false, error: `${res.status} ${errBody.slice(0, 200)}` };
  }
  return { ok: true };
}

export interface BatchResult {
  updated: number;
  skipped: number;
  missing: number;
  failed: number;
}

/**
 * Processa um batch de produtos: query do Wix → busca tamanhos → PATCH.
 * Inclui delay de 250ms entre PATCHes para respeitar rate limit do Wix.
 */
export async function processSizeBatch(
  apiKey: string,
  siteId: string,
  offset: number,
  batchSize: number
): Promise<BatchResult> {
  const products = await queryWixProducts(apiKey, siteId, offset, batchSize);
  const skus = products.map((p) => p.sku).filter((s): s is string => Boolean(s));
  const sizesBySku = await fetchSizesBySkus(skus);

  let updated = 0;
  let skipped = 0;
  let missing = 0;
  let failed = 0;

  for (const p of products) {
    const hasOptions =
      Array.isArray(p.productOptions) && p.productOptions.length > 0;
    if (hasOptions) {
      skipped++;
      continue;
    }

    const sizes = p.sku ? sizesBySku.get(p.sku) : null;
    if (!sizes) {
      missing++;
      continue;
    }

    const result = await patchProductOptions(apiKey, siteId, p.id, sizes);
    if (result.ok) {
      updated++;
    } else {
      failed++;
      console.error(`[sizeMigration] PATCH falhou ${p.id} (sku=${p.sku}): ${result.error}`);
    }

    // Rate limiting — 250ms entre PATCHes
    await new Promise((r) => setTimeout(r, 250));
  }

  return { updated, skipped, missing, failed };
}

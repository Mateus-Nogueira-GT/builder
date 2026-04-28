import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getExternalSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.EXTERNAL_SUPABASE_URL;
    const key = process.env.EXTERNAL_SUPABASE_KEY;
    if (!url || !key) {
      throw new Error("EXTERNAL_SUPABASE_URL and EXTERNAL_SUPABASE_KEY must be set");
    }
    _client = createClient(url, key);
  }
  return _client;
}

export interface CatalogProduct {
  id: string;
  sku: string;
  name: { pt: string };
  description: { pt: string };
  images: Array<{ src: string; position: number }>;
  variants: Array<{ price: string; sku: string; stock: number | null }>;
  category_cache: string[];
  is_published: boolean;
  sizes: string[] | null;
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
    const { data, error } = await getExternalSupabase()
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

  const { data, error } = await getExternalSupabase()
    .from("catalog_products")
    .select("id, sku, name, description, images, variants, category_cache, is_published, sizes")
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
  const torcedorIds = await fetchTorcedorProductIds();
  if (torcedorIds.length === 0) return [];

  const categoryFilters = FOCUS_CATEGORY_MAP[focus] || [];

  if (categoryFilters.length === 0) {
    return fetchProducts(torcedorIds, limit, 0);
  }

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

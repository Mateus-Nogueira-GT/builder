/**
 * Size Migration — atualiza produtos existentes em lojas Wix com o seletor "Tamanho".
 *
 * Aplica o conjunto padrão de tamanhos adultos em todos os produtos que ainda
 * não possuem productOptions. Não depende de lookup no catálogo externo —
 * isso permite cobrir lojas cujos produtos vieram de fontes diferentes.
 */

import { buildSizeProductOptions } from "./sizes";
import { supabase } from "./supabase";

const DEFAULT_SIZES = ["P", "M", "G", "GG", "G1", "G2"];
const SIZE_JOB_BATCH_SIZE = 30;

interface WixProduct {
  id: string;
  name?: string;
  sku?: string;
  productOptions?: unknown[];
  variants?: Array<{ sku?: string }>;
}

function extractProductSku(p: WixProduct): string | null {
  if (p.sku) return p.sku;
  const variantSku = p.variants?.[0]?.sku;
  return variantSku ?? null;
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

async function patchProductOptionsV3(
  apiKey: string,
  siteId: string,
  productId: string,
  sizes: string[]
): Promise<{ ok: boolean; status: number; error?: string }> {
  const res = await fetch(
    `https://www.wixapis.com/stores/v3/products/${productId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: apiKey,
        "wix-site-id": siteId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product: {
          options: [
            {
              name: "Tamanho",
              optionRenderType: "TEXT_CHOICES",
              choicesSettings: {
                choices: sizes.map((value) => ({
                  name: value,
                  key: value,
                })),
              },
            },
          ],
        },
      }),
    }
  );
  if (!res.ok) {
    const errBody = await res.text();
    return { ok: false, status: res.status, error: `${res.status} ${errBody.slice(0, 200)}` };
  }
  return { ok: true, status: res.status };
}

async function patchProductOptionsV1(
  apiKey: string,
  siteId: string,
  productId: string,
  sizes: string[]
): Promise<{ ok: boolean; status: number; error?: string }> {
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
    return { ok: false, status: res.status, error: `${res.status} ${errBody.slice(0, 200)}` };
  }
  return { ok: true, status: res.status };
}

/**
 * Tenta V3 primeiro (sites criados via marketplace redemption são V3).
 * Se V3 retornar 404/400 indicando que o produto não existe no V3 catalog,
 * cai pro V1.
 */
export async function patchProductOptions(
  apiKey: string,
  siteId: string,
  productId: string,
  sizes: string[]
): Promise<{ ok: boolean; error?: string }> {
  const v3 = await patchProductOptionsV3(apiKey, siteId, productId, sizes);
  if (v3.ok) return { ok: true };

  // V3 falhou — tenta V1 como fallback (sites antigos)
  const v1 = await patchProductOptionsV1(apiKey, siteId, productId, sizes);
  if (v1.ok) return { ok: true };

  return {
    ok: false,
    error: `V3:${v3.status} | V1:${v1.status} | ${v1.error}`,
  };
}

export interface BatchResult {
  updated: number;
  skipped: number;
  missing: number;
  failed: number;
}

/**
 * Processa um batch de produtos: query do Wix → PATCH com DEFAULT_SIZES.
 * Aplica P/M/G/GG/G1/G2 em produtos sem productOptions.
 * Quando `allowedSkus` é fornecido (e não vazio), só processa produtos cujo
 * SKU está na lista — os demais contam como `missing`.
 * Inclui delay de 250ms entre PATCHes para respeitar rate limit do Wix.
 */
export async function processSizeBatch(
  apiKey: string,
  siteId: string,
  offset: number,
  batchSize: number,
  allowedSkus?: Set<string>
): Promise<BatchResult> {
  const products = await queryWixProducts(apiKey, siteId, offset, batchSize);

  let updated = 0;
  let skipped = 0;
  let missing = 0;
  let failed = 0;
  const filterActive = !!(allowedSkus && allowedSkus.size > 0);

  for (const p of products) {
    if (filterActive) {
      const sku = extractProductSku(p);
      if (!sku || !allowedSkus!.has(sku)) {
        missing++;
        continue;
      }
    }

    const hasOptions =
      Array.isArray(p.productOptions) && p.productOptions.length > 0;
    if (hasOptions) {
      skipped++;
      continue;
    }

    const result = await patchProductOptions(apiKey, siteId, p.id, DEFAULT_SIZES);
    if (result.ok) {
      updated++;
    } else {
      failed++;
      console.error(`[sizeMigration] PATCH falhou ${p.id}: ${result.error}`);
    }

    // Rate limiting — 250ms entre PATCHes
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(
    `[sizeMigration] Batch offset=${offset} | total=${products.length} | atualizados=${updated} | pulados=${skipped} | foraDaLista=${missing} | falhas=${failed}`
  );

  return { updated, skipped, missing, failed };
}

export interface KickoffResult {
  jobId: string;
  totalProducts: number;
  alreadyRunning: boolean;
}

/**
 * Cria (ou retorna o existente) job de size_update_jobs e dispara o primeiro
 * batch em fire-and-forget. Usado tanto pelo endpoint manual `/start` (clientes
 * antigos) quanto pelo provisionamento automatico de novas lojas em
 * `/api/inject`.
 *
 * Idempotente: se ja existe job rodando pra essa loja, devolve o existente
 * em vez de criar duplicata.
 */
export async function kickoffSizeUpdateJob(params: {
  storeId: string;
  siteId: string;
  ownerEmail: string | null;
  authHeader: string;
  baseUrl: string;
}): Promise<KickoffResult> {
  const { storeId, siteId, ownerEmail, authHeader, baseUrl } = params;

  const { data: existing } = await supabase
    .from("size_update_jobs")
    .select("id, total_products")
    .eq("store_id", storeId)
    .eq("status", "running")
    .maybeSingle();

  if (existing) {
    return {
      jobId: existing.id,
      totalProducts: existing.total_products as number,
      alreadyRunning: true,
    };
  }

  const totalProducts = await queryWixProductsCount(authHeader, siteId);

  const { data: job, error: jobErr } = await supabase
    .from("size_update_jobs")
    .insert({
      store_id: storeId,
      site_id: siteId,
      owner_email: ownerEmail,
      status: "running",
      total_products: totalProducts,
      current_offset: 0,
      batch_size: SIZE_JOB_BATCH_SIZE,
    })
    .select("id")
    .single();

  if (jobErr || !job) {
    throw new Error(`Falha ao criar size_update_job: ${jobErr?.message ?? "unknown"}`);
  }

  // Fire-and-forget — /process se auto-restarta se Vercel matar a funcao
  fetch(`${baseUrl}/api/atualizar-tamanhos/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId: job.id }),
  }).catch((err) => console.warn("[kickoffSizeUpdateJob] dispatch falhou:", err));

  return { jobId: job.id, totalProducts, alreadyRunning: false };
}

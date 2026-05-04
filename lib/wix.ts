/**
 * Wix REST API Client
 *
 * Comunicação com a API do Wix para gerenciar collections CMS e publicar sites.
 * Usa a Wix Data API v2 com autenticação via API Key.
 *
 * Docs: https://dev.wix.com/docs/rest
 */

import type { WixCollectionField, PreflightResult, PreflightCheck } from "./schemas";
import { getOAuthToken } from "./wixOAuth";
import { patchProductOptions } from "./sizeMigration";

const WIX_API_BASE = "https://www.wixapis.com/wix-data/v2";
const WIX_SITE_PROPERTIES_API = "https://www.wixapis.com/site-properties/v4";
const WIX_PUBLISH_API = "https://www.wixapis.com/site/v1";

/* ─────────────────────── Helpers HTTP ──────────────────── */

interface WixRequestOptions {
  apiKey: string;
  siteId: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

async function wixFetch(
  url: string,
  options: WixRequestOptions
): Promise<Response> {
  const { apiKey, siteId, method = "GET", body } = options;

  const headers: Record<string, string> = {
    Authorization: apiKey,
    "wix-site-id": siteId,
    "Content-Type": "application/json",
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(
      `Wix API ${method} ${url} retornou ${res.status}: ${errorBody}`
    );
  }

  return res;
}

/* ───────────────── Retry com backoff exponencial ──────── */

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/* ───────────── OAuth Auth Resolution ────────────── */

/**
 * Resolves the Authorization header for a site.
 * Uses OAuth token if instanceId is provided, otherwise falls back to apiKey.
 */
export async function resolveAuthHeader(
  apiKey: string,
  instanceId?: string | null
): Promise<string> {
  // If we have an instanceId, prefer OAuth
  if (instanceId) {
    try {
      return await getOAuthToken(instanceId);
    } catch (err) {
      console.warn("OAuth token failed, falling back to apiKey:", err instanceof Error ? err.message : err);
    }
  }
  // Fallback to direct apiKey
  return apiKey;
}

/* ─────────────────── Collection Management ────────────── */

/**
 * Verifica se uma collection existe no site Wix.
 */
async function getCollection(
  apiKey: string,
  siteId: string,
  collectionId: string
): Promise<Record<string, unknown> | null> {
  try {
    const res = await wixFetch(
      `${WIX_API_BASE}/collections/${collectionId}`,
      { apiKey, siteId }
    );
    const data = await res.json();
    return data.collection ?? null;
  } catch {
    return null;
  }
}

/**
 * Garante que uma collection existe com os campos necessários.
 * Cria a collection se não existir; atualiza campos se faltar algum.
 */
export async function ensureCollection(
  apiKey: string,
  siteId: string,
  collectionId: string,
  displayName: string,
  fields: WixCollectionField[]
): Promise<void> {
  await withRetry(async () => {
    const existing = await getCollection(apiKey, siteId, collectionId);

    if (!existing) {
      // Cria a collection com os campos
      await wixFetch(`${WIX_API_BASE}/collections`, {
        apiKey,
        siteId,
        method: "POST",
        body: {
          collection: {
            id: collectionId,
            displayName,
            fields: fields.map((f) => ({
              key: f.key,
              displayName: f.key,
              type: mapFieldType(f.type),
            })),
          },
        },
      });
    }
    // Se existir, assumimos que os campos já estão corretos
    // (em produção, poderia comparar e adicionar campos faltantes)
  });
}

function mapFieldType(
  type: WixCollectionField["type"]
): string {
  const mapping: Record<string, string> = {
    TEXT: "TEXT",
    RICH_TEXT: "RICH_TEXT",
    NUMBER: "NUMBER",
    URL: "URL",
    IMAGE: "IMAGE",
    BOOLEAN: "BOOLEAN",
  };
  return mapping[type] || "TEXT";
}

/* ──────────────────── Data Item Operations ─────────────── */

/**
 * Remove todos os items de uma collection.
 */
export async function clearCollection(
  apiKey: string,
  siteId: string,
  collectionId: string
): Promise<void> {
  await withRetry(async () => {
    // Busca todos os itens
    const res = await wixFetch(
      `${WIX_API_BASE}/items/query`,
      {
        apiKey,
        siteId,
        method: "POST",
        body: {
          dataCollectionId: collectionId,
          query: { paging: { limit: 50 } },
        },
      }
    );

    const data = await res.json();
    const items = data.dataItems ?? [];

    if (items.length === 0) return;

    const itemIds = items.map((item: Record<string, unknown>) => item._id as string);

    // Remove em batch
    await wixFetch(`${WIX_API_BASE}/bulk/items/remove`, {
      apiKey,
      siteId,
      method: "POST",
      body: {
        dataCollectionId: collectionId,
        dataItemIds: itemIds,
      },
    });
  });
}

/**
 * Insere ou atualiza um único item na collection.
 */
export async function upsertItem(
  apiKey: string,
  siteId: string,
  collectionId: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return withRetry(async () => {
    const res = await wixFetch(`${WIX_API_BASE}/items`, {
      apiKey,
      siteId,
      method: "POST",
      body: {
        dataCollectionId: collectionId,
        dataItem: {
          data,
        },
      },
    });

    const result = await res.json();
    return result.dataItem ?? {};
  });
}

/**
 * Insere múltiplos items de uma vez na collection.
 */
export async function bulkUpsertItems(
  apiKey: string,
  siteId: string,
  collectionId: string,
  items: Record<string, unknown>[]
): Promise<void> {
  if (items.length === 0) return;

  await withRetry(async () => {
    await wixFetch(`${WIX_API_BASE}/bulk/items/insert`, {
      apiKey,
      siteId,
      method: "POST",
      body: {
        dataCollectionId: collectionId,
        dataItems: items.map((data) => ({ data })),
      },
    });
  });
}

/* ──────────────────── Template Preflight ───────────────── */

/**
 * Verifica se o site Wix está pronto para receber a injeção de conteúdo.
 * Checa se as collections necessárias existem.
 */
export async function runTemplatePreflight(
  apiKey: string,
  siteId: string,
  requiredCollections: Array<{ id: string; label: string }>
): Promise<PreflightResult> {
  const checks: PreflightCheck[] = [];
  let ok = true;
  let siteUrl: string | undefined;

  // Testa conexão buscando info do site
  try {
    const siteRes = await wixFetch(
      `${WIX_SITE_PROPERTIES_API}/properties`,
      { apiKey, siteId }
    );
    const siteData = await siteRes.json();
    siteUrl = siteData.properties?.siteUrl;

    checks.push({
      label: "Conexão com o Wix",
      status: "success",
      details: `Conectado: ${siteUrl ?? siteId}`,
    });
  } catch (err) {
    checks.push({
      label: "Conexão com o Wix",
      status: "error",
      details: `Falha na conexão: ${err instanceof Error ? err.message : "Erro desconhecido"}`,
    });
    ok = false;
    return { ok, checks, siteUrl };
  }

  // Verifica cada collection
  for (const col of requiredCollections) {
    try {
      const existing = await getCollection(apiKey, siteId, col.id);
      if (existing) {
        checks.push({
          label: col.label,
          status: "success",
          details: `Collection "${col.id}" encontrada.`,
        });
      } else {
        checks.push({
          label: col.label,
          status: "warning",
          details: `Collection "${col.id}" não encontrada — será criada automaticamente.`,
        });
      }
    } catch {
      checks.push({
        label: col.label,
        status: "warning",
        details: `Não foi possível verificar "${col.id}" — tentaremos criar.`,
      });
    }
  }

  return { ok, checks, siteUrl };
}

/* ──────────────────── CMS Activation ──────────────────── */

/**
 * Attempts to enable CMS on a Wix site by installing the Wix Data app.
 * Tries multiple approaches: install app, then verify CMS is active.
 * Returns true if CMS is active after attempts.
 *
 * @param apiKey - Site-scoped auth token (OAuth or API key) for site-level checks
 * @param siteId - The site's metaSiteId
 * @param accountId - The Wix account ID
 * @param adminApiKey - Account-level admin key for app installation (falls back to apiKey)
 */
export async function enableCms(
  apiKey: string,
  siteId: string,
  accountId: string,
  adminApiKey?: string
): Promise<boolean> {
  const accountKey = adminApiKey || apiKey;

  // First check if CMS is already active (site-level, uses OAuth token)
  if (await isCmsActive(apiKey, siteId)) {
    return true;
  }

  // Try to install the Wix Data / CMS app to enable it
  // These are ACCOUNT-level operations — must use admin key
  const cmsAppIds = [
    "cloudsite-data", // Wix Data internal app ID
    "1380b703-ce81-ff05-f115-39571d94dfcd", // Wix Code (Velo)
  ];

  for (const appId of cmsAppIds) {
    try {
      await fetch(
        "https://www.wixapis.com/apps/v1/bulk-install",
        {
          method: "POST",
          headers: {
            Authorization: accountKey,
            "wix-account-id": accountId,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            metaSiteIds: [siteId],
            appId,
          }),
        }
      );
    } catch {
      // Silently continue — some app IDs may not work
    }
  }

  // Also try enabling via the site-level endpoint (uses admin key for install permission)
  try {
    await fetch(
      `https://www.wixapis.com/apps-installer-service/v1/app-instance/install`,
      {
        method: "POST",
        headers: {
          Authorization: accountKey,
          "wix-site-id": siteId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appId: "1380b703-ce81-ff05-f115-39571d94dfcd",
        }),
      }
    );
  } catch {
    // Continue
  }

  // Wait and check with retries (site-level, uses OAuth token)
  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise((r) => setTimeout(r, 5000)); // wait 5s between checks
    if (await isCmsActive(apiKey, siteId)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if the CMS/Data API is active on a site.
 */
export async function isCmsActive(
  apiKey: string,
  siteId: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${WIX_API_BASE}/collections`,
      {
        method: "GET",
        headers: {
          Authorization: apiKey,
          "wix-site-id": siteId,
          "Content-Type": "application/json",
        },
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/* ──────────────────── Site Publishing ─────────────────── */

/**
 * Publica o site Wix. Retorna true se sucesso, false se falhar.
 */
export async function publishSite(
  apiKey: string,
  siteId: string
): Promise<boolean> {
  try {
    await withRetry(async () => {
      await wixFetch(`${WIX_PUBLISH_API}/publish`, {
        apiKey,
        siteId,
        method: "POST",
        body: {},
      });
    }, 2);
    return true;
  } catch (err) {
    console.error("publishSite error:", err);
    return false;
  }
}

/* ──────────────────── Product Management ─────────────── */

const WIX_STORES_API = "https://www.wixapis.com/stores/v1";

type WixProductInput = {
  name: string;
  description: string;
  productType: string;
  priceData: { price: number; currency: string };
  sku: string;
  media: { items: Array<{ image: { url: string } }> };
  visible: boolean;
  productOptions?: Array<{
    optionType: string;
    name: string;
    choices: Array<{ value: string; description: string }>;
  }>;
  manageVariants?: boolean;
};

/**
 * Creates a single product in the Wix store. Returns the new product ID.
 */
export async function createProduct(
  apiKey: string,
  siteId: string,
  product: WixProductInput
): Promise<string | null> {
  return withRetry(async () => {
    const response = await wixFetch(`${WIX_STORES_API}/products`, {
      apiKey,
      siteId,
      method: "POST",
      body: { product },
    });
    const data = (await response.json().catch(() => null)) as
      | { product?: { id?: string } }
      | null;
    return data?.product?.id ?? null;
  }, 2);
}

/**
 * Creates multiple products with rate limiting. After each create,
 * if the product had productOptions, applies them via V3 PATCH (with V1
 * fallback) — V1 OAuth tokens silently drop options on POST, so we
 * re-apply explicitly.
 */
export async function createProducts(
  apiKey: string,
  siteId: string,
  products: Array<WixProductInput>
): Promise<{ created: number; failed: number; optionsApplied: number; optionsFailed: number }> {
  let created = 0;
  let failed = 0;
  let optionsApplied = 0;
  let optionsFailed = 0;

  for (const product of products) {
    let productId: string | null = null;
    try {
      productId = await createProduct(apiKey, siteId, product);
      created++;
    } catch (err) {
      console.error(`Failed to create product "${product.name}":`, err instanceof Error ? err.message : err);
      failed++;
    }

    const sizes = product.productOptions?.[0]?.choices?.map((c) => c.value) ?? [];
    if (productId && sizes.length > 0) {
      const result = await patchProductOptions(apiKey, siteId, productId, sizes);
      if (result.ok) {
        optionsApplied++;
      } else {
        optionsFailed++;
        console.warn(
          `[createProducts] PATCH options falhou sku=${product.sku} id=${productId}: ${result.error}`
        );
      }
      // small delay between PATCH and next create to respect rate limits
      await new Promise((r) => setTimeout(r, 250));
    }

    // 200ms delay between products to respect rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  return { created, failed, optionsApplied, optionsFailed };
}

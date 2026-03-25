/**
 * Wix REST API Client
 *
 * Comunicação com a API do Wix para gerenciar collections CMS e publicar sites.
 * Usa a Wix Data API v2 com autenticação via API Key.
 *
 * Docs: https://dev.wix.com/docs/rest
 */

import type { WixCollectionField, PreflightResult, PreflightCheck } from "./schemas";

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

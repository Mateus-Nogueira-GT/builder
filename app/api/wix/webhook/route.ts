import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getOAuthToken, fetchSiteIdFromInstance } from "@/lib/wixOAuth";
import { kickoffSizeUpdateJob } from "@/lib/sizeMigration";
import { resolveAuthHeader } from "@/lib/wix";
import { getPublicBaseUrl } from "@/lib/url";

const WIX_ADMIN_API_KEY = process.env.WIX_ADMIN_API_KEY ?? "";

const CORS_HEADERS = {
  "Cross-Origin-Opener-Policy": "unsafe-none",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function ok(data: Record<string, unknown> = {}) {
  return NextResponse.json({ received: true, ...data }, { headers: CORS_HEADERS });
}

/** OPTIONS — CORS preflight */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET — Wix redirects here after app installation (installer redirect).
 * Also used by Wix to verify the URL is reachable.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const instanceId = searchParams.get("instanceId");

  console.log("[Wix Webhook GET] instanceId:", instanceId, "params:", searchParams.toString());

  // If no instanceId, this is a verification ping — just return 200
  if (!instanceId) {
    return ok();
  }

  // Process the installation redirect
  try {
    const accessToken = await getOAuthToken(instanceId);
    const store = await updatePendingStore(instanceId, accessToken);
    if (store) {
      await tryKickoffSizeJob(request, instanceId, accessToken, store);
    }
  } catch (err) {
    console.error("[Wix Webhook GET] Error processing:", err);
  }

  // Return a page that auto-closes (user should go back to original tab)
  return new NextResponse(
    `<!DOCTYPE html>
<html><head><title>Kit Store Builder</title>
<style>body{background:#09090b;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.box{text-align:center;max-width:400px}.ok{color:#10b981;font-size:2rem;margin-bottom:1rem}</style></head>
<body><div class="box"><div class="ok">✓</div><p>App conectado! Pode fechar esta aba.</p></div>
<script>setTimeout(()=>window.close(),2000)</script></body></html>`,
    { headers: { "Content-Type": "text/html", ...CORS_HEADERS } }
  );
}

/**
 * POST — Wix webhook events (AppInstalled, etc.)
 */
export async function POST(request: Request) {
  try {
    const body = await request.text();
    console.log("[Wix Webhook POST] Raw body:", body.slice(0, 500));

    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(body);
    } catch {
      // Wix may send JWT-encoded webhooks
      const parts = body.split(".");
      if (parts.length === 3) {
        try {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
          data = typeof payload.data === "string" ? JSON.parse(payload.data) : payload;
          if (payload.instanceId) data.instanceId = payload.instanceId;
        } catch (jwtErr) {
          console.error("[Wix Webhook POST] JWT decode failed:", jwtErr);
          return ok();
        }
      } else {
        console.warn("[Wix Webhook POST] Unrecognized body format");
        return ok();
      }
    }

    // Extract instanceId from various possible locations
    const instanceId =
      (data.instanceId as string) ??
      (data.instance_id as string) ??
      ((data.data as Record<string, unknown>)?.instanceId as string) ??
      ((data.payload as Record<string, unknown>)?.instanceId as string) ??
      null;

    console.log("[Wix Webhook POST] instanceId:", instanceId, "eventType:", data.eventType || "unknown");

    if (!instanceId) {
      return ok({ note: "no instanceId" });
    }

    // Get access token and update store
    try {
      const accessToken = await getOAuthToken(instanceId);
      const store = await updatePendingStore(instanceId, accessToken);
      if (store) {
        await tryKickoffSizeJob(request, instanceId, accessToken, store);
      }
    } catch (err) {
      console.error("[Wix Webhook POST] Failed to process:", err);
    }

    return ok({ instanceId });
  } catch (err) {
    console.error("[Wix Webhook POST] Unhandled error:", err);
    return ok();
  }
}

interface StoreRow {
  id: string;
  wix_site_id: string | null;
  owner_email: string | null;
}

/**
 * Resolve siteId via Wix Apps API se ainda 'pending', salva no DB,
 * e dispara size_update_job fire-and-forget. Recebe a store ja resolvida
 * pra evitar race entre INSERT e SELECT no pooler do Supabase.
 */
async function tryKickoffSizeJob(
  request: Request,
  instanceId: string,
  accessToken: string,
  store: StoreRow
): Promise<void> {
  try {
    let siteId = store.wix_site_id;
    if (!siteId || siteId === "pending") {
      const fetched = await fetchSiteIdFromInstance(instanceId);
      if (!fetched) {
        console.warn(`[Wix Webhook] tryKickoffSizeJob: siteId nao resolveu pra instance=${instanceId}`);
        return;
      }
      siteId = fetched;
      await supabase.from("stores").update({ wix_site_id: siteId }).eq("id", store.id);
    }

    const baseUrl = getPublicBaseUrl(request);
    // Tenta primeiro com OAuth (resolveAuthHeader prefere OAuth quando ha
    // instanceId). Se queryWixProductsCount der 403 (scopes insuficientes
    // — comum em instalacoes novas que nao foram autorizadas com os scopes
    // novos), faz retry com WIX_ADMIN_API_KEY puro.
    const oauthHeader = await resolveAuthHeader(WIX_ADMIN_API_KEY, instanceId);
    const tryKickoff = async (header: string) =>
      kickoffSizeUpdateJob({
        storeId: store.id,
        siteId,
        ownerEmail: store.owner_email ?? null,
        authHeader: header,
        baseUrl,
      });

    try {
      const r = await tryKickoff(oauthHeader);
      console.log(
        `[Wix Webhook] kickoff size job ${r.jobId} total=${r.totalProducts} alreadyRunning=${r.alreadyRunning}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const is403 = msg.includes("403") || msg.toLowerCase().includes("permission");
      if (is403 && WIX_ADMIN_API_KEY && oauthHeader !== WIX_ADMIN_API_KEY) {
        console.warn(
          "[Wix Webhook] OAuth scope insuficiente (403). Retry com WIX_ADMIN_API_KEY..."
        );
        try {
          const r = await tryKickoff(WIX_ADMIN_API_KEY);
          console.log(
            `[Wix Webhook] kickoff size job ${r.jobId} total=${r.totalProducts} (via admin key)`
          );
        } catch (err2) {
          console.warn(
            "[Wix Webhook] kickoff falhou tambem com admin key:",
            err2 instanceof Error ? err2.message : err2
          );
        }
      } else {
        console.warn("[Wix Webhook] kickoffSizeUpdateJob falhou:", msg);
      }
    }
  } catch (err) {
    console.warn("[Wix Webhook] tryKickoffSizeJob exception:", err instanceof Error ? err.message : err);
  }
}

/**
 * Atualiza a store pendente OU insere uma nova com o instanceId. Em ambos
 * os casos, retorna a row resultante (id, wix_site_id, owner_email) usando
 * .select().single() — assim o caller nao precisa fazer um SELECT separado
 * (que estava falhando por race do pooler).
 */
async function updatePendingStore(
  instanceId: string,
  accessToken: string
): Promise<StoreRow | null> {
  const { data: pendingStore } = await supabase
    .from("stores")
    .select("id")
    .eq("wix_site_id", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingStore) {
    const { data, error } = await supabase
      .from("stores")
      .update({ wix_instance_id: instanceId, wix_api_key: accessToken })
      .eq("id", pendingStore.id)
      .select("id, wix_site_id, owner_email")
      .single();
    if (error || !data) {
      console.error(`[Wix Webhook] Falha ao atualizar store ${pendingStore.id}:`, error?.message);
      return null;
    }
    console.log(`[Wix Webhook] Updated store ${data.id} with instanceId=${instanceId}`);
    return data as StoreRow;
  }

  const { data, error } = await supabase
    .from("stores")
    .insert({
      name: "Nova Loja",
      wix_instance_id: instanceId,
      wix_api_key: accessToken,
      wix_site_id: "pending",
    })
    .select("id, wix_site_id, owner_email")
    .single();
  if (error || !data) {
    console.error(`[Wix Webhook] Falha ao criar store pra instance=${instanceId}:`, error?.message);
    return null;
  }
  console.log(`[Wix Webhook] Created new store ${data.id} with instanceId=${instanceId}`);
  return data as StoreRow;
}

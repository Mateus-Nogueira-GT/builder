import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getOAuthToken } from "@/lib/wixOAuth";

/**
 * Wix OAuth Callback
 *
 * After the user installs the app via the Wix installer, Wix redirects
 * here with `instanceId` (and optionally `code` / `state`).
 *
 * We use client_credentials + instance_id to get an access token,
 * then update the pending store in Supabase so the polling on the
 * original tab detects the connection.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const instanceId = searchParams.get("instanceId");

  console.log("[OAuth Callback] instanceId:", instanceId);

  if (!instanceId) {
    return new NextResponse(closePage("Erro: instanceId não recebido."), {
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    // Get access token using client_credentials (new OAuth flow)
    const accessToken = await getOAuthToken(instanceId);

    // Find the most recent pending store and update it
    const { data: pendingStore } = await supabase
      .from("stores")
      .select("id")
      .eq("wix_site_id", "pending")
      .eq("connection_method", "oauth")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (pendingStore) {
      await supabase
        .from("stores")
        .update({
          wix_instance_id: instanceId,
          wix_api_key: accessToken,
        })
        .eq("id", pendingStore.id);

      console.log(`[OAuth Callback] Updated store ${pendingStore.id} with instanceId=${instanceId}`);
    } else {
      console.warn("[OAuth Callback] No pending store found, webhook will handle it");
    }

    // Close this tab — the original tab is polling and will detect the connection
    return new NextResponse(closePage("App conectado com sucesso! Pode fechar esta aba."), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error("[OAuth Callback] Error:", err);
    return new NextResponse(closePage("Erro ao conectar. Volte para a aba anterior e tente novamente."), {
      headers: { "Content-Type": "text/html" },
    });
  }
}

function closePage(message: string): string {
  return `<!DOCTYPE html>
<html><head><title>Kit Store Builder</title>
<style>body{background:#09090b;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.box{text-align:center;max-width:400px}.ok{color:#10b981;font-size:2rem;margin-bottom:1rem}</style></head>
<body><div class="box"><div class="ok">✓</div><p>${message}</p></div>
<script>setTimeout(()=>window.close(),2000)</script></body></html>`;
}

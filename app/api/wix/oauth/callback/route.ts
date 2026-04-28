import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getOAuthToken, fetchSiteIdFromInstance } from "@/lib/wixOAuth";

/**
 * Wix OAuth Callback — external install flow
 *
 * Wix redirects here with `instanceId` após o usuário instalar o app.
 * O `state` (userId|storeId) é nosso — embutimos no postInstallationUrl,
 * então não dependemos do Wix devolver.
 *
 * Aceita também `next` (URL para redirecionar após sucesso). Se omitido,
 * vai para /onboarding/success.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const instanceId = searchParams.get("instanceId");
  const state = searchParams.get("state") ?? "";
  const next = searchParams.get("next") ?? "";

  // Sanitiza next: aceita apenas paths internos (começando com /), não URLs externas
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "";
  const successPath = safeNext || "/onboarding/success";
  const failurePath = safeNext || "/onboarding/install-template";

  console.log("[OAuth Callback] instanceId:", instanceId, "| state:", state, "| next:", safeNext);

  if (!instanceId) {
    return NextResponse.redirect(
      new URL(`${failurePath}?error=no_instance`, request.url)
    );
  }

  // Parse state: "userId|storeId"
  const [, storeId] = state.split("|");

  if (!storeId) {
    console.warn("[OAuth Callback] state inválido, não foi possível identificar a store:", state);
    return NextResponse.redirect(
      new URL(`${failurePath}?error=invalid_state`, request.url)
    );
  }

  try {
    // Troca instanceId por access token
    const accessToken = await getOAuthToken(instanceId);

    // Busca o siteId real do Wix (necessário para chamar APIs como Stores)
    const siteId = await fetchSiteIdFromInstance(instanceId);
    console.log(`[OAuth Callback] siteId recuperado: ${siteId}`);

    const updatePayload: Record<string, string> = {
      wix_instance_id: instanceId,
      wix_api_key: accessToken,
    };
    if (siteId) {
      updatePayload.wix_site_id = siteId;
    }

    const { error } = await supabase
      .from("stores")
      .update(updatePayload)
      .eq("id", storeId);

    if (error) {
      console.error(`[OAuth Callback] Falha ao atualizar store ${storeId}:`, error.message, error.details);
      // Falha visível pro usuário em vez de redirecionar como sucesso
      return NextResponse.redirect(
        new URL(`${failurePath}?error=db_update_failed`, request.url)
      );
    }

    console.log(`[OAuth Callback] Store ${storeId} atualizada com instanceId=${instanceId} siteId=${siteId}`);
    return NextResponse.redirect(new URL(successPath, request.url));
  } catch (err) {
    console.error("[OAuth Callback] Error:", err);
    return NextResponse.redirect(
      new URL(`${failurePath}?error=connect_failed`, request.url)
    );
  }
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getOAuthToken } from "@/lib/wixOAuth";

/**
 * Wix OAuth Callback — external install flow
 *
 * Wix redirects here with `instanceId` after the user installs the app.
 * The `state` param (userId|storeId) is ours — we embedded it in the
 * postInstallationUrl, so we don't depend on Wix echoing it back.
 *
 * We exchange instanceId for an access token and update the exact store.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const instanceId = searchParams.get("instanceId");
  const state = searchParams.get("state") ?? "";

  console.log("[OAuth Callback] instanceId:", instanceId, "| state:", state);

  if (!instanceId) {
    return NextResponse.redirect(
      new URL("/onboarding/install-template?error=no_instance", request.url)
    );
  }

  // Parse state: "userId|storeId"
  const [, storeId] = state.split("|");

  if (!storeId) {
    console.warn("[OAuth Callback] state inválido, não foi possível identificar a store:", state);
    return NextResponse.redirect(
      new URL("/onboarding/install-template?error=invalid_state", request.url)
    );
  }

  try {
    // Exchange instanceId for an access token
    const accessToken = await getOAuthToken(instanceId);

    // Update the specific store — no guessing, no race conditions
    const { error } = await supabase
      .from("stores")
      .update({
        wix_instance_id: instanceId,
        wix_api_key: accessToken,
      })
      .eq("id", storeId);

    if (error) {
      console.error(`[OAuth Callback] Falha ao atualizar store ${storeId}:`, error.message);
    } else {
      console.log(`[OAuth Callback] Store ${storeId} atualizada com instanceId=${instanceId}`);
    }

    return NextResponse.redirect(new URL("/onboarding/success", request.url));
  } catch (err) {
    console.error("[OAuth Callback] Error:", err);
    return NextResponse.redirect(
      new URL("/onboarding/install-template?error=connect_failed", request.url)
    );
  }
}

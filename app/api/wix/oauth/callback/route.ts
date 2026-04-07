import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Wix OAuth — Step 2: Handle callback, exchange code for tokens
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const instanceId = searchParams.get("instanceId");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/onboarding?error=oauth_failed", request.url));
  }

  let stateData: { userId: string; storeName: string; templateSiteId: string };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64").toString());
  } catch {
    return NextResponse.redirect(new URL("/onboarding?error=invalid_state", request.url));
  }

  const appId = process.env.WIX_OAUTH_APP_ID!;
  const appSecret = process.env.WIX_OAUTH_APP_SECRET!;

  try {
    // Exchange authorization code for access token
    const tokenRes = await fetch("https://www.wixapis.com/oauth/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: appId,
        client_secret: appSecret,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => "");
      console.error("Wix OAuth token error:", tokenRes.status, errText);
      return NextResponse.redirect(new URL("/onboarding?error=token_failed", request.url));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    if (!accessToken) {
      return NextResponse.redirect(new URL("/onboarding?error=no_token", request.url));
    }

    // Save tokens to Supabase as a pending store
    const { data: store } = await supabase.from("stores").insert({
      owner_id: stateData.userId,
      name: stateData.storeName || "Nova Loja",
      wix_api_key: accessToken,
      wix_refresh_token: refreshToken || "",
      wix_site_id: "pending",
      wix_site_url: "",
      wix_instance_id: instanceId || "",
      primary_color: "#10b981",
      secondary_color: "#18181b",
      connection_method: "oauth",
      template_ready: false,
    }).select("id").single();

    // Redirect back to onboarding with success + store ID
    const params = new URLSearchParams({
      wix_connected: "true",
      storeName: stateData.storeName,
      templateSiteId: stateData.templateSiteId,
      pendingStoreId: store?.id || "",
    });

    return NextResponse.redirect(new URL(`/onboarding?${params.toString()}`, request.url));
  } catch (err) {
    console.error("Wix OAuth callback error:", err);
    return NextResponse.redirect(new URL("/onboarding?error=oauth_error", request.url));
  }
}

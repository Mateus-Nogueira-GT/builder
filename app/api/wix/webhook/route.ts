import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getOAuthToken } from "@/lib/wixOAuth";

/**
 * Wix Webhook Handler
 * Receives OAUTH_CREATED event when a user installs the app.
 * Extracts instanceId, gets an access token, and saves to Supabase.
 */
export async function POST(request: Request) {
  try {
    const body = await request.text();
    console.log("[Wix Webhook] Raw body:", body);

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(body);
    } catch {
      // Wix sends JWT-encoded webhooks
      const parts = body.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], "base64").toString()
        );
        data = typeof payload.data === "string" ? JSON.parse(payload.data) : payload;
        // Also check top-level JWT fields
        if (payload.instanceId) data.instanceId = payload.instanceId;
        console.log("[Wix Webhook] Decoded JWT payload:", JSON.stringify(data));
      } else {
        console.error("[Wix Webhook] Cannot parse body");
        return NextResponse.json({ received: true });
      }
    }

    // Extract instanceId from various possible formats
    const instanceId =
      (data.instanceId as string) ??
      (data.instance_id as string) ??
      ((data.data as Record<string, unknown>)?.instanceId as string) ??
      ((data.payload as Record<string, unknown>)?.instanceId as string) ??
      null;

    console.log("[Wix Webhook] Extracted instanceId:", instanceId);

    if (!instanceId) {
      console.warn("[Wix Webhook] No instanceId found in payload");
      return NextResponse.json({ received: true });
    }

    // Get an access token using client_credentials
    let accessToken = "";
    try {
      accessToken = await getOAuthToken(instanceId);
      console.log("[Wix Webhook] Got access token for instanceId:", instanceId);
    } catch (err) {
      console.error("[Wix Webhook] Failed to get token:", err);
    }

    // Save instanceId and token to the pending store
    // Find the most recent pending store that doesn't have an instanceId yet
    const { data: pendingStore } = await supabase
      .from("stores")
      .select("id")
      .eq("wix_site_id", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (pendingStore) {
      await supabase
        .from("stores")
        .update({
          wix_instance_id: instanceId,
          wix_api_key: accessToken || undefined,
        })
        .eq("id", pendingStore.id);

      console.log(`[Wix Webhook] Updated store ${pendingStore.id} with instanceId=${instanceId}`);
    } else {
      // No pending store — create a new record
      await supabase.from("stores").insert({
        name: "Nova Loja",
        wix_instance_id: instanceId,
        wix_api_key: accessToken,
        wix_site_id: "pending",
        wix_site_url: "",
        connection_method: "oauth",
        primary_color: "#10b981",
        secondary_color: "#18181b",
      });
      console.log(`[Wix Webhook] Created new store with instanceId=${instanceId}`);
    }

    return NextResponse.json({ received: true, instanceId });
  } catch (err) {
    console.error("[Wix Webhook] Error:", err);
    return NextResponse.json({ received: true });
  }
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Wix Webhook Handler
 * Receives webhooks from Wix, including "App Instance Installed" events.
 * Captures the instanceId needed for OAuth client_credentials flow.
 */
export async function POST(request: Request) {
  try {
    const body = await request.text();

    console.log("[Wix Webhook] Raw body:", body);

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(body);
    } catch {
      // Wix sometimes sends JWT-encoded webhooks
      const parts = body.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], "base64").toString()
        );
        data = typeof payload.data === "string" ? JSON.parse(payload.data) : payload;
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

    const appId =
      (data.appId as string) ??
      ((data.data as Record<string, unknown>)?.appId as string) ??
      null;

    const metaSiteId =
      (data.metaSiteId as string) ??
      ((data.data as Record<string, unknown>)?.metaSiteId as string) ??
      null;

    console.log("[Wix Webhook] Extracted:", { instanceId, appId, metaSiteId });

    // If we got an instanceId, save it
    if (instanceId && metaSiteId) {
      const { error } = await supabase
        .from("stores")
        .update({ wix_instance_id: instanceId })
        .eq("wix_site_id", metaSiteId);

      if (error) {
        console.warn("[Wix Webhook] Failed to update store:", error.message);
      } else {
        console.log(`[Wix Webhook] Saved instanceId=${instanceId} for site=${metaSiteId}`);
      }
    }

    return NextResponse.json({ received: true, instanceId });
  } catch (err) {
    console.error("[Wix Webhook] Error:", err);
    return NextResponse.json({ received: true });
  }
}

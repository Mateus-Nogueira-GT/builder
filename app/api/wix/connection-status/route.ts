import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabase } from "@/lib/supabase";

/**
 * Polling endpoint: checks if the Wix webhook has arrived
 * and the store has an instanceId.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pendingStoreId = searchParams.get("storeId");

  // If we have a specific store ID, check that directly (no auth needed)
  if (pendingStoreId) {
    const { data: store } = await supabase
      .from("stores")
      .select("id, wix_instance_id")
      .eq("id", pendingStoreId)
      .single();

    const connected = !!(store?.wix_instance_id && store.wix_instance_id !== "");
    return NextResponse.json({
      connected,
      storeId: connected ? store!.id : null,
    });
  }

  // Fallback: check by owner_id
  const token = await getToken({
    req: request as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.id) {
    return NextResponse.json({ connected: false });
  }

  const { data: store } = await supabase
    .from("stores")
    .select("id, wix_instance_id")
    .eq("owner_id", token.id)
    .eq("connection_method", "oauth")
    .eq("wix_site_id", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!store) {
    return NextResponse.json({ connected: false });
  }

  const connected = !!(store.wix_instance_id && store.wix_instance_id !== "");

  return NextResponse.json({
    connected,
    storeId: connected ? store.id : null,
  });
}

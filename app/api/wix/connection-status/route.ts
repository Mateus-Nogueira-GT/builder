import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabase } from "@/lib/supabase";

/**
 * Polling endpoint: checks if the Wix webhook has arrived
 * and the store has an instanceId + token.
 */
export async function GET(request: Request) {
  const token = await getToken({
    req: request as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.id) {
    return NextResponse.json({ connected: false, error: "Não autenticado" }, { status: 401 });
  }

  const { data: store } = await supabase
    .from("stores")
    .select("id, wix_instance_id, wix_api_key")
    .eq("owner_id", token.id)
    .eq("connection_method", "oauth")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!store) {
    return NextResponse.json({ connected: false });
  }

  const connected = !!(store.wix_instance_id && store.wix_instance_id !== "" && store.wix_api_key);

  return NextResponse.json({
    connected,
    storeId: connected ? store.id : null,
  });
}

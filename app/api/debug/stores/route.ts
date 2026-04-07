import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Temporary debug endpoint — remove after testing
export async function GET() {
  const { data } = await supabase
    .from("stores")
    .select("id, name, owner_id, wix_site_id, wix_instance_id, wix_api_key, connection_method, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    stores: (data || []).map((s) => ({
      ...s,
      wix_api_key: s.wix_api_key ? `${s.wix_api_key.slice(0, 10)}...` : null,
    })),
  });
}

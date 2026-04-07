import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, siteId, apiKey, instanceId, totalProductIds, initialOffset } = body;

    if (!siteId || !apiKey || !totalProductIds) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("product_sync_jobs")
      .insert({
        store_id: storeId || "unknown",
        site_id: siteId,
        api_key: apiKey,
        instance_id: instanceId || null,
        total_product_ids: totalProductIds,
        current_offset: initialOffset || 100,
        batch_size: 200,
        status: "running",
        products_created: 0,
        products_failed: 0,
      })
      .select("id")
      .single();

    if (error) {
      console.warn("Failed to create sync job (table may not exist):", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    fetch(`${process.env.NEXTAUTH_URL}/api/products/sync/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: data.id }),
    }).catch((err) => {
      console.warn("Failed to trigger first batch:", err);
    });

    return NextResponse.json({ jobId: data.id, status: "started" });
  } catch (err) {
    console.error("Sync route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao iniciar sync" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabase } from "@/lib/supabase";
import { fetchTorcedorProductIds } from "@/lib/externalCatalog";

export async function GET(request: Request) {
  const token = await getToken({
    req: request as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.id || token.role !== "super_admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending";

  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("connection_method", status)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const token = await getToken({
    req: request as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.id || token.role !== "super_admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { storeId, wixApiKey, wixSiteId } = body;

    if (!storeId || !wixApiKey || !wixSiteId) {
      return NextResponse.json(
        { error: "storeId, wixApiKey e wixSiteId são obrigatórios" },
        { status: 400 }
      );
    }

    // Update store with Wix credentials and set status to provisioning
    const { error: updateError } = await supabase
      .from("stores")
      .update({
        wix_api_key: wixApiKey,
        wix_site_id: wixSiteId,
        connection_method: "provisioning",
      })
      .eq("id", storeId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Fetch product IDs from external catalog
    const productIds = await fetchTorcedorProductIds();

    // Trigger product sync
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const syncRes = await fetch(`${baseUrl}/api/products/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        siteId: wixSiteId,
        apiKey: wixApiKey,
        totalProductIds: productIds,
        initialOffset: 0,
      }),
    });

    const syncData = await syncRes.json();

    if (!syncRes.ok) {
      // Mark store as error if sync failed to start
      await supabase
        .from("stores")
        .update({ connection_method: "error" })
        .eq("id", storeId);

      return NextResponse.json(
        { error: syncData.error || "Erro ao iniciar sync de produtos" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: syncData.jobId,
      totalProducts: productIds.length,
    });
  } catch (err) {
    console.error("[PROVISIONING] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}

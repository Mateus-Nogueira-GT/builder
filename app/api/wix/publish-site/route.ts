import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { storeId, siteId } = await request.json();

    if (!siteId) {
      return NextResponse.json({ error: "siteId required" }, { status: 400 });
    }

    // Get the user's OAuth token from the store record
    const { data: store } = await supabase
      .from("stores")
      .select("wix_api_key")
      .eq("id", storeId)
      .single();

    if (!store?.wix_api_key) {
      return NextResponse.json({ error: "Token não encontrado" }, { status: 400 });
    }

    const authToken = store.wix_api_key;

    // 1. Publish
    await fetch("https://www.wixapis.com/site-publisher/v1/site/publish", {
      method: "POST",
      headers: {
        Authorization: authToken,
        "wix-site-id": siteId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    // 2. Wait for propagation
    await new Promise((r) => setTimeout(r, 10000));

    // 3. Get public URL
    let publicUrl = "";
    const prodRes = await fetch("https://www.wixapis.com/stores/v1/products/query", {
      method: "POST",
      headers: {
        Authorization: authToken,
        "wix-site-id": siteId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { paging: { limit: 1 } } }),
    });

    if (prodRes.ok) {
      const prodData = await prodRes.json();
      publicUrl = prodData.products?.[0]?.productPageUrl?.base || "";
    }

    // 4. Update Supabase
    if (publicUrl && storeId) {
      await supabase.from("stores").update({ wix_site_url: publicUrl }).eq("id", storeId);
    }

    return NextResponse.json({ publicUrl, published: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro" },
      { status: 500 }
    );
  }
}

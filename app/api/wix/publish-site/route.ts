import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const WIX_API_KEY = process.env.WIX_ADMIN_API_KEY!;

export async function POST(request: Request) {
  try {
    const { storeId, siteId } = await request.json();

    if (!siteId) {
      return NextResponse.json({ error: "siteId required" }, { status: 400 });
    }

    // 1. Publish
    await fetch("https://www.wixapis.com/site-publisher/v1/site/publish", {
      method: "POST",
      headers: {
        Authorization: WIX_API_KEY,
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
        Authorization: WIX_API_KEY,
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

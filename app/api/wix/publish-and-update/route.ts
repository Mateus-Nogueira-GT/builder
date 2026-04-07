import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getOAuthToken } from "@/lib/wixOAuth";

export async function POST(request: Request) {
  try {
    const { storeId, siteId } = await request.json();
    if (!storeId || !siteId) {
      return NextResponse.json({ error: "storeId and siteId required" }, { status: 400 });
    }

    // Get the store's instanceId to fetch a fresh token
    const { data: store } = await supabase
      .from("stores")
      .select("wix_instance_id")
      .eq("id", storeId)
      .single();

    if (!store?.wix_instance_id) {
      return NextResponse.json({ error: "Conexão Wix não encontrada" }, { status: 400 });
    }

    const authToken = await getOAuthToken(store.wix_instance_id);

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

    // 2. Wait
    await new Promise((r) => setTimeout(r, 10000));

    // 3. Get public URL
    let publicUrl = "";
    for (let i = 0; i < 3; i++) {
      try {
        const res = await fetch("https://www.wixapis.com/stores/v1/products/query", {
          method: "POST",
          headers: {
            Authorization: authToken,
            "wix-site-id": siteId,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: { paging: { limit: 1 } } }),
        });
        if (res.ok) {
          const data = await res.json();
          const base = data.products?.[0]?.productPageUrl?.base;
          if (base && !base.includes("manage.wix.com")) {
            publicUrl = base;
            break;
          }
        }
      } catch { /* retry */ }
      await new Promise((r) => setTimeout(r, 5000));
    }

    // 4. Update Supabase
    if (publicUrl) {
      await supabase.from("stores").update({ wix_site_url: publicUrl }).eq("id", storeId);
    }

    return NextResponse.json({ publicUrl: publicUrl || null });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabase } from "@/lib/supabase";

const ALLOWED_TEMPLATES = new Set([
  "c208eaf8-8ed3-4ad2-947a-db65813006c2",
  "962b66f7-c9d1-4ba7-be05-354465e71d40",
  "da927d82-5f52-46a6-bc33-9210fb916aaa",
]);

export async function POST(request: Request) {
  const token = await getToken({
    req: request as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { storeName, templateSiteId, pendingStoreId } = body;

    if (!storeName) {
      return NextResponse.json({ error: "Nome da loja é obrigatório" }, { status: 400 });
    }

    if (!templateSiteId || !ALLOWED_TEMPLATES.has(templateSiteId)) {
      return NextResponse.json({ error: "Template inválido" }, { status: 400 });
    }

    // Get the user's OAuth token from the pending store record
    let userAccessToken: string | null = null;
    let storeId = pendingStoreId;

    if (pendingStoreId) {
      const { data: store } = await supabase
        .from("stores")
        .select("wix_api_key")
        .eq("id", pendingStoreId)
        .eq("owner_id", token.id)
        .single();

      userAccessToken = store?.wix_api_key || null;
    }

    if (!userAccessToken) {
      // Fallback: find the most recent pending store for this user
      const { data: store } = await supabase
        .from("stores")
        .select("id, wix_api_key")
        .eq("owner_id", token.id)
        .eq("wix_site_id", "pending")
        .eq("connection_method", "oauth")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!store?.wix_api_key) {
        return NextResponse.json(
          { error: "Token OAuth não encontrado. Conecte com o Wix primeiro." },
          { status: 400 }
        );
      }

      userAccessToken = store.wix_api_key;
      storeId = store.id;
    }

    // 1. Duplicate template using the USER's OAuth token
    const dupRes = await fetch(
      "https://www.wixapis.com/site-actions/v1/sites/duplicate",
      {
        method: "POST",
        headers: {
          Authorization: userAccessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceSiteId: templateSiteId,
          siteDisplayName: storeName.slice(0, 20),
        }),
      }
    );

    if (!dupRes.ok) {
      const errText = await dupRes.text().catch(() => "");
      console.error("Duplicate site error:", dupRes.status, errText);
      return NextResponse.json(
        { error: `Falha ao criar site (${dupRes.status}): ${errText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const dupData = await dupRes.json();
    const metaSiteId = dupData.newSiteId;

    if (!metaSiteId) {
      return NextResponse.json({ error: "Site criado mas ID não retornado" }, { status: 502 });
    }

    // 2. Publish the site using the user's token
    try {
      await fetch("https://www.wixapis.com/site-publisher/v1/site/publish", {
        method: "POST",
        headers: {
          Authorization: userAccessToken,
          "wix-site-id": metaSiteId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
    } catch { /* continue */ }

    // 3. Wait for propagation and get public URL
    await new Promise((r) => setTimeout(r, 8000));

    let siteUrl = `https://manage.wix.com/dashboard/${metaSiteId}`;
    try {
      const prodRes = await fetch("https://www.wixapis.com/stores/v1/products/query", {
        method: "POST",
        headers: {
          Authorization: userAccessToken,
          "wix-site-id": metaSiteId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: { paging: { limit: 1 } } }),
      });
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        const base = prodData.products?.[0]?.productPageUrl?.base;
        if (base) siteUrl = base;
      }
    } catch { /* continue */ }

    // 4. Update the existing store record with real site data
    const dashboardUrl = `https://manage.wix.com/dashboard/${metaSiteId}`;
    const { error: dbError } = await supabase
      .from("stores")
      .update({
        name: storeName,
        wix_site_id: metaSiteId,
        wix_site_url: siteUrl,
        wix_instance_id: metaSiteId,
        template_ready: true,
      })
      .eq("id", storeId);

    if (dbError) {
      return NextResponse.json(
        { error: `Falha ao salvar: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      storeId,
      siteId: metaSiteId,
      siteUrl,
      dashboardUrl,
    });
  } catch (err) {
    console.error("Create site error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao criar site" },
      { status: 500 }
    );
  }
}

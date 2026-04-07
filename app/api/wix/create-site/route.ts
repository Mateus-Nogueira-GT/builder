import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabase } from "@/lib/supabase";

const WIX_API_KEY = process.env.WIX_ADMIN_API_KEY!;
const WIX_ACCOUNT_ID = process.env.WIX_ACCOUNT_ID!;

const ALLOWED_TEMPLATES = new Set([
  "c208eaf8-8ed3-4ad2-947a-db65813006c2",
  "962b66f7-c9d1-4ba7-be05-354465e71d40",
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
    const { storeName, templateSiteId } = body;

    if (!storeName) {
      return NextResponse.json({ error: "Nome da loja é obrigatório" }, { status: 400 });
    }

    if (!templateSiteId || !ALLOWED_TEMPLATES.has(templateSiteId)) {
      return NextResponse.json({ error: "Template inválido" }, { status: 400 });
    }

    // 1. Duplicate template using admin API key
    const dupRes = await fetch(
      "https://www.wixapis.com/site-actions/v1/sites/duplicate",
      {
        method: "POST",
        headers: {
          Authorization: WIX_API_KEY,
          "wix-account-id": WIX_ACCOUNT_ID,
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

    // 2. Publish the site
    try {
      await fetch("https://www.wixapis.com/site-publisher/v1/site/publish", {
        method: "POST",
        headers: {
          Authorization: WIX_API_KEY,
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
          Authorization: WIX_API_KEY,
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

    // 4. Save to Supabase
    const dashboardUrl = `https://manage.wix.com/dashboard/${metaSiteId}`;
    const { data: store, error: dbError } = await supabase
      .from("stores")
      .insert({
        owner_id: token.id,
        name: storeName,
        wix_api_key: WIX_API_KEY,
        wix_site_id: metaSiteId,
        wix_site_url: siteUrl,
        wix_instance_id: metaSiteId,
        primary_color: "#10b981",
        secondary_color: "#18181b",
        connection_method: "admin",
      })
      .select("*")
      .single();

    if (dbError) {
      return NextResponse.json(
        { error: `Falha ao salvar: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      storeId: store.id,
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

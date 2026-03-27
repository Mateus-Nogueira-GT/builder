import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabase } from "@/lib/supabase";
import { getTemplateId } from "@/lib/templateMap";

const WIX_API_KEY = process.env.WIX_ADMIN_API_KEY!;
const WIX_ACCOUNT_ID = process.env.WIX_ACCOUNT_ID!;
const WIX_MASTER_SITE_ID = process.env.WIX_MASTER_SITE_ID!;

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
    const { storeName, email, whatsapp, instagram, city, state, focus,
      activePromotion, primaryColor, secondaryColor,
      accentColor, layoutType, bannerBgColor, bannerTextColor, bannerCtaColor,
      logoVariant, logoSvg } = body;

    if (!storeName) {
      return NextResponse.json(
        { error: "Nome da loja é obrigatório" },
        { status: 400 }
      );
    }

    // 1. Cria site no Wix com template eCommerce (já vem pronto para editar)
    const createRes = await fetch(
      "https://www.wixapis.com/funnel/projects/v1/create",
      {
        method: "POST",
        headers: {
          Authorization: WIX_API_KEY,
          "wix-account-id": WIX_ACCOUNT_ID,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "WIX",
          templateId: getTemplateId(body.layoutType || "classic"),
        }),
      }
    );

    if (!createRes.ok) {
      const errText = await createRes.text().catch(() => "");
      console.error("Wix create site error:", createRes.status, errText);
      return NextResponse.json(
        { error: `Falha ao criar site no Wix (${createRes.status}): ${errText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const createData = await createRes.json();
    const metaSiteId = createData.project?.metaSiteId || createData.metaSiteId;
    const siteId = createData.project?.siteId || metaSiteId;

    if (!metaSiteId) {
      console.error("Wix create response:", JSON.stringify(createData));
      return NextResponse.json(
        { error: "Site criado mas metaSiteId não retornado" },
        { status: 502 }
      );
    }

    // 2. Aguarda provisionamento
    await new Promise((r) => setTimeout(r, 5000));

    // 3. Verifica se a Data API funciona no novo site
    let dataApiReady = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const testRes = await fetch(
          "https://www.wixapis.com/wix-data/v2/collections",
          {
            method: "GET",
            headers: {
              Authorization: WIX_API_KEY,
              "wix-site-id": metaSiteId,
              "Content-Type": "application/json",
            },
          }
        );
        if (testRes.ok) {
          dataApiReady = true;
          break;
        }
      } catch {
        // retry
      }
      await new Promise((r) => setTimeout(r, 3000));
    }

    if (!dataApiReady) {
      console.warn("Data API not ready after retries, proceeding anyway");
    }

    // 4. Busca propriedades do site
    let siteUrl = `https://manage.wix.com/dashboard/${metaSiteId}`;
    try {
      const propsRes = await fetch(
        "https://www.wixapis.com/site-properties/v4/properties",
        {
          headers: {
            Authorization: WIX_API_KEY,
            "wix-site-id": metaSiteId,
            "Content-Type": "application/json",
          },
        }
      );
      if (propsRes.ok) {
        const propsData = await propsRes.json();
        siteUrl = propsData.properties?.siteUrl || siteUrl;
      }
    } catch {
      // site pode levar mais tempo
    }

    // 5. Salva a loja no Supabase
    const { data: store, error: dbError } = await supabase
      .from("stores")
      .insert({
        owner_id: token.id,
        name: storeName,
        wix_api_key: WIX_API_KEY,
        wix_site_id: metaSiteId,
        wix_site_url: siteUrl,
        wix_instance_id: metaSiteId,
        owner_email: email || null,
        whatsapp: whatsapp || null,
        instagram: instagram || null,
        city: city || null,
        state: state || null,
        focus: focus || "todos",
        active_promotion: activePromotion || null,
        primary_color: primaryColor || "#10b981",
        secondary_color: secondaryColor || "#18181b",
        accent_color: accentColor || null,
        layout_type: layoutType || "classic",
        banner_bg_color: bannerBgColor || null,
        banner_text_color: bannerTextColor || null,
        banner_cta_color: bannerCtaColor || null,
        logo_variant: logoVariant || null,
        logo_svg: logoSvg || null,
        connection_method: "auto",
      })
      .select("*")
      .single();

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      return NextResponse.json(
        { error: `Site criado no Wix mas falha ao salvar: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      storeId: store.id,
      siteId: metaSiteId,
      metaSiteId,
      siteUrl,
      dataApiReady,
      dashboardUrl: `https://manage.wix.com/dashboard/${metaSiteId}`,
    });
  } catch (err) {
    console.error("Create site error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao criar site" },
      { status: 500 }
    );
  }
}

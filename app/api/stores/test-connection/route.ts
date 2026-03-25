import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { apiKey, siteId } = await request.json();

    if (!apiKey || !siteId) {
      return NextResponse.json(
        { error: "apiKey e siteId são obrigatórios" },
        { status: 400 }
      );
    }

    // Testa a conexão buscando as propriedades do site
    const res = await fetch(
      "https://www.wixapis.com/site-properties/v4/properties",
      {
        headers: {
          Authorization: apiKey,
          "wix-site-id": siteId,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      return NextResponse.json(
        {
          connected: false,
          error: `Wix retornou ${res.status}: ${errorText.slice(0, 200)}`,
        },
        { status: 400 }
      );
    }

    const data = await res.json();
    const properties = data.properties || {};

    return NextResponse.json({
      connected: true,
      siteName: properties.siteDisplayName || properties.siteName || "Site Wix",
      siteUrl: properties.siteUrl || "",
    });
  } catch (err) {
    return NextResponse.json(
      {
        connected: false,
        error: err instanceof Error ? err.message : "Erro ao testar conexão",
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

const WIX_API_KEY = process.env.WIX_ADMIN_API_KEY!;

/**
 * Verifica se o CMS está ativo no site Wix (Data API funcional).
 */
export async function POST(request: Request) {
  try {
    const { siteId } = await request.json();

    if (!siteId) {
      return NextResponse.json(
        { error: "siteId é obrigatório" },
        { status: 400 }
      );
    }

    // Tenta listar collections — se funcionar, CMS está ativo
    const res = await fetch(
      "https://www.wixapis.com/wix-data/v2/collections",
      {
        method: "GET",
        headers: {
          Authorization: WIX_API_KEY,
          "wix-site-id": siteId,
          "Content-Type": "application/json",
        },
      }
    );

    if (res.ok) {
      return NextResponse.json({ active: true });
    }

    const errText = await res.text().catch(() => "");

    if (errText.includes("WDE0110")) {
      return NextResponse.json({ active: false, reason: "CMS não ativado" });
    }

    return NextResponse.json({
      active: false,
      reason: `Erro ao verificar: ${res.status}`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        active: false,
        reason: err instanceof Error ? err.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

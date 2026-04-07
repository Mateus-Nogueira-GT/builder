import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { resolveAuthHeader } from "@/lib/wix";

/**
 * Verifica se o CMS está ativo no site Wix (Data API funcional).
 * Uses OAuth token when instanceId is available, falls back to admin key.
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

    // Look up instanceId from store record for OAuth
    const { data: store } = await supabase
      .from("stores")
      .select("wix_instance_id, wix_api_key")
      .eq("wix_site_id", siteId)
      .single();

    const apiKey = store?.wix_api_key || process.env.WIX_ADMIN_API_KEY!;
    const instanceId = store?.wix_instance_id || null;
    const authToken = await resolveAuthHeader(apiKey, instanceId);

    // Tenta listar collections — se funcionar, CMS está ativo
    const res = await fetch(
      "https://www.wixapis.com/wix-data/v2/collections",
      {
        method: "GET",
        headers: {
          Authorization: authToken,
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

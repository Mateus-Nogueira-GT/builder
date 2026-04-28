import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabase } from "@/lib/supabase";
import { getPublicBaseUrl } from "@/lib/url";

/**
 * Inicia o fluxo de OAuth para clientes antigos que precisam atualizar tamanhos.
 *
 * Fluxo:
 *  1. Verifica se o usuário já tem uma store sem instanceId (reaproveita)
 *     ou cria uma nova "Migração Tamanhos" pendente.
 *  2. Gera URL OAuth do Wix com next=/atualizar-tamanhos para voltar pra cá.
 *  3. Frontend redireciona para essa URL.
 */
export async function POST(request: Request) {
  const token = await getToken({
    req: request as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.id || !token.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    // Tenta reaproveitar uma store sem instanceId (caso o cliente tenha tentado antes)
    const { data: existing } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_email", token.email)
      .or("wix_instance_id.is.null,wix_site_id.eq.pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let storeId: string;
    if (existing?.id) {
      storeId = existing.id;
    } else {
      // Cria placeholder via RPC (mesmo padrão de /api/stores)
      const { data, error } = await supabase.rpc("insert_store", {
        p_name: "Migração Tamanhos",
        p_wix_site_id: "pending",
        p_owner_email: token.email,
      });

      if (error) {
        console.error("[atualizar-tamanhos/connect] insert_store error:", error.message);
        return NextResponse.json({ error: "Falha ao registrar loja" }, { status: 500 });
      }

      storeId = Array.isArray(data) ? data[0]?.id : (data as { id?: string })?.id;
      if (!storeId) {
        return NextResponse.json({ error: "Falha ao obter storeId" }, { status: 500 });
      }
    }

    // Monta URL do app-installer com next pra voltar aqui
    const appId = process.env.WIX_OAUTH_APP_ID!;
    const baseUrl = getPublicBaseUrl(request);
    const callbackUrl = new URL(`${baseUrl}/api/wix/oauth/callback`);
    callbackUrl.searchParams.set("state", `${token.id}|${storeId}`);
    callbackUrl.searchParams.set("next", "/atualizar-tamanhos");

    const authUrl = `https://www.wix.com/app-installer?appId=${appId}&postInstallationUrl=${encodeURIComponent(callbackUrl.toString())}`;

    return NextResponse.json({ authUrl, storeId });
  } catch (err) {
    console.error("[atualizar-tamanhos/connect] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro inesperado" },
      { status: 500 }
    );
  }
}

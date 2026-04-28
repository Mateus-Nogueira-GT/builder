import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabase } from "@/lib/supabase";
import { queryWixProductsCount } from "@/lib/sizeMigration";
import { resolveAuthHeader } from "@/lib/wix";
import { fetchSiteIdFromInstance } from "@/lib/wixOAuth";

const WIX_ADMIN_API_KEY = process.env.WIX_ADMIN_API_KEY ?? "";
const BATCH_SIZE = 30;

/**
 * Inicia um job de migração de tamanhos para a loja do usuário logado.
 * Retorna o jobId — o frontend faz polling em /api/atualizar-tamanhos/status?jobId=...
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
    const body = await request.json();
    const { storeId } = body;

    if (!storeId) {
      return NextResponse.json({ error: "storeId é obrigatório" }, { status: 400 });
    }

    // Confirma que a loja pertence ao usuário
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id, wix_site_id, wix_instance_id, owner_email")
      .eq("id", storeId)
      .eq("owner_email", token.email)
      .single();

    if (storeErr || !store) {
      return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
    }

    if (!store.wix_instance_id) {
      return NextResponse.json(
        { error: "Loja não tem autorização OAuth — conecte primeiro" },
        { status: 400 }
      );
    }

    // Se siteId está faltando ou é "pending", tenta buscar agora via Wix Apps API
    let siteId = store.wix_site_id;
    if (!siteId || siteId === "pending") {
      console.log(`[atualizar-tamanhos/start] siteId faltando, buscando via Wix Apps API | instanceId=${store.wix_instance_id}`);
      const fetched = await fetchSiteIdFromInstance(store.wix_instance_id);
      if (!fetched) {
        return NextResponse.json(
          {
            error:
              "Não foi possível identificar o site Wix associado. Verifique se autorizou um site, não a conta inteira.",
            instanceId: store.wix_instance_id,
          },
          { status: 502 }
        );
      }
      siteId = fetched;
      // Salva pra não precisar buscar de novo
      await supabase
        .from("stores")
        .update({ wix_site_id: siteId })
        .eq("id", storeId);
      console.log(`[atualizar-tamanhos/start] siteId salvo: ${siteId}`);
    }

    // Verifica se já existe job rodando pra mesma loja — evita duplicação
    const { data: existing } = await supabase
      .from("size_update_jobs")
      .select("id")
      .eq("store_id", storeId)
      .eq("status", "running")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        jobId: existing.id,
        status: "already_running",
      });
    }

    // Resolve auth: prioriza OAuth token (do instanceId), com fallback pra admin key
    const authHeader = await resolveAuthHeader(WIX_ADMIN_API_KEY, store.wix_instance_id);

    // Conta total de produtos na loja Wix
    let totalProducts: number;
    try {
      totalProducts = await queryWixProductsCount(authHeader, siteId);
      console.log(`[atualizar-tamanhos/start] siteId=${siteId} totalProducts=${totalProducts}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[atualizar-tamanhos/start] erro ao contar produtos | storeId=${storeId} siteId=${siteId}:`,
        msg
      );
      return NextResponse.json(
        {
          error: "Falha ao acessar produtos da loja Wix",
          detail: msg,
          siteId,
        },
        { status: 502 }
      );
    }

    // Cria o job
    const { data: job, error: jobErr } = await supabase
      .from("size_update_jobs")
      .insert({
        store_id: storeId,
        site_id: siteId,
        owner_email: token.email,
        status: "running",
        total_products: totalProducts,
        current_offset: 0,
        batch_size: BATCH_SIZE,
      })
      .select("id")
      .single();

    if (jobErr || !job) {
      console.error("[atualizar-tamanhos/start] erro ao criar job:", jobErr);
      return NextResponse.json(
        { error: "Falha ao criar job de atualização" },
        { status: 500 }
      );
    }

    // Dispara o primeiro batch (fire-and-forget)
    fetch(`${process.env.NEXTAUTH_URL}/api/atualizar-tamanhos/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.id }),
    }).catch((err) => console.warn("[atualizar-tamanhos/start] falha ao disparar process:", err));

    return NextResponse.json({
      jobId: job.id,
      status: "started",
      totalProducts,
    });
  } catch (err) {
    console.error("[atualizar-tamanhos/start] erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro inesperado" },
      { status: 500 }
    );
  }
}

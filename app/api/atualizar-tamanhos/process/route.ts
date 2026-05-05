import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { processSizeBatch } from "@/lib/sizeMigration";
import { resolveAuthHeader } from "@/lib/wix";
import { fetchWixTemplateSkuSet } from "@/lib/externalCatalog";

const WIX_ADMIN_API_KEY = process.env.WIX_ADMIN_API_KEY ?? "";

// Vercel serverless mata a função antes do setTimeout de 5s disparar.
// Solução: loopar internamente quantos batches couberem dentro de ~50s
// (limite default no Vercel Pro é 60s, hobby 10s — ajustamos pro menor).
const MAX_RUN_MS = 50_000;

// Permite que o Next.js use até maxDuration na função (Vercel Pro)
export const maxDuration = 60;

/**
 * Processa batches de produtos do job de migração de tamanhos.
 *
 * Mudança v2: em vez de processar 1 batch e morrer, fica em loop processando
 * múltiplos batches dentro do mesmo lifetime da função (até MAX_RUN_MS).
 * Frontend re-aciona se necessário.
 *
 * Idempotente: se duas chamadas concorrerem, ambas leem current_offset do DB
 * e fazem PATCH no Wix. O Wix lida com idempotência (PATCH é safe pra repetir).
 */
export async function POST(request: Request) {
  try {
    let jobId: string | undefined;
    try {
      const body = await request.json();
      jobId = body.jobId;
    } catch {
      // sem body — busca o job mais antigo rodando
    }

    const fetchJob = async () => {
      if (jobId) {
        const { data } = await supabase
          .from("size_update_jobs")
          .select("*")
          .eq("id", jobId)
          .eq("status", "running")
          .single();
        return data;
      }
      const { data } = await supabase
        .from("size_update_jobs")
        .select("*")
        .eq("status", "running")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      return data;
    };

    const initialJob = await fetchJob();
    if (!initialJob) {
      return NextResponse.json({ status: "no_running_jobs" });
    }

    const startTime = Date.now();
    let batchesRun = 0;
    let lastJob = initialJob;

    // Allowlist de SKUs dos templates Wix — só atualiza produtos cujo SKU
    // bate. Se a tabela estiver vazia, processSizeBatch desativa o filtro.
    const allowedSkus = await fetchWixTemplateSkuSet();
    console.log(
      `[atualizar-tamanhos/process] allowedSkus=${allowedSkus.size} (filtro ${allowedSkus.size > 0 ? "ATIVO" : "DESATIVADO"})`
    );

    while (Date.now() - startTime < MAX_RUN_MS) {
      const job = batchesRun === 0 ? initialJob : await fetchJob();
      if (!job) break;
      lastJob = job;

      const total = job.total_products as number;
      const offset = job.current_offset as number;
      const batchSize = job.batch_size as number;
      const siteId = job.site_id as string;

      if (offset >= total) {
        await supabase
          .from("size_update_jobs")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", job.id);
        return NextResponse.json({
          status: "completed",
          jobId: job.id,
          batchesRun,
        });
      }

      // Resolve auth (token OAuth tem TTL de 4h, getOAuthToken cuida da renovação)
      const { data: store } = await supabase
        .from("stores")
        .select("wix_instance_id")
        .eq("id", job.store_id)
        .single();
      // Prefere admin key direto (tem scopes plenos pra Stores). OAuth do
      // instanceId so vira fallback se WIX_ADMIN_API_KEY estiver vazia —
      // necessario porque OAuth de instalacoes novas nao tem
      // WIX_STORES.READ_PRODUCTS.
      const authHeader =
        WIX_ADMIN_API_KEY ||
        (await resolveAuthHeader("", store?.wix_instance_id ?? null));

      let batchResult;
      try {
        batchResult = await processSizeBatch(authHeader, siteId, offset, batchSize, allowedSkus);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        console.error(`[atualizar-tamanhos/process] job=${job.id} batch=${batchesRun} falhou:`, msg);
        await supabase
          .from("size_update_jobs")
          .update({
            status: "failed",
            error_message: msg.slice(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        return NextResponse.json(
          { status: "failed", jobId: job.id, error: msg, batchesRun },
          { status: 500 }
        );
      }

      const newOffset = offset + batchSize;
      const isComplete = newOffset >= total;

      await supabase
        .from("size_update_jobs")
        .update({
          current_offset: newOffset,
          updated_count: (job.updated_count || 0) + batchResult.updated,
          skipped_count: (job.skipped_count || 0) + batchResult.skipped,
          missing_count: (job.missing_count || 0) + batchResult.missing,
          failed_count: (job.failed_count || 0) + batchResult.failed,
          status: isComplete ? "completed" : "running",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      batchesRun++;

      if (isComplete) {
        return NextResponse.json({
          status: "completed",
          jobId: job.id,
          batchesRun,
        });
      }
    }

    // Saiu do loop sem completar — fire-and-forget self-restart pra manter
    // o job vivo mesmo sem frontend polling (caso de novas lojas que disparam
    // o job a partir do /api/inject sem ter UI dedicada). Idempotente: se
    // o frontend também re-acionar, ambos workers leem o mesmo offset do DB
    // e PATCH é safe pra repetir.
    fetch(`${process.env.NEXTAUTH_URL}/api/atualizar-tamanhos/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: lastJob.id }),
    }).catch((err) =>
      console.warn("[atualizar-tamanhos/process] self-restart falhou:", err)
    );

    return NextResponse.json({
      status: "processing",
      jobId: lastJob.id,
      batchesRun,
      progress: `${lastJob.current_offset}/${lastJob.total_products}`,
    });
  } catch (err) {
    console.error("[atualizar-tamanhos/process] erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro no processamento" },
      { status: 500 }
    );
  }
}

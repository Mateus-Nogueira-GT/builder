import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { processSizeBatch } from "@/lib/sizeMigration";

const WIX_ADMIN_API_KEY = process.env.WIX_ADMIN_API_KEY!;

/**
 * Processa um batch de produtos do job especificado e auto-aciona o próximo
 * batch via fetch (mesmo padrão de /api/products/sync/process).
 *
 * Aciona-se também sem body — nesse caso busca o job mais antigo em status=running.
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

    let job;
    if (jobId) {
      const { data, error } = await supabase
        .from("size_update_jobs")
        .select("*")
        .eq("id", jobId)
        .eq("status", "running")
        .single();
      if (error || !data) {
        return NextResponse.json({ status: "no_job_found" });
      }
      job = data;
    } else {
      const { data, error } = await supabase
        .from("size_update_jobs")
        .select("*")
        .eq("status", "running")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      if (error || !data) {
        return NextResponse.json({ status: "no_running_jobs" });
      }
      job = data;
    }

    const total = job.total_products as number;
    const offset = job.current_offset as number;
    const batchSize = job.batch_size as number;
    const siteId = job.site_id as string;

    if (offset >= total) {
      await supabase
        .from("size_update_jobs")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", job.id);
      return NextResponse.json({ status: "completed", jobId: job.id });
    }

    let batchResult;
    try {
      batchResult = await processSizeBatch(WIX_ADMIN_API_KEY, siteId, offset, batchSize);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      console.error(`[atualizar-tamanhos/process] job=${job.id} falhou:`, msg);
      await supabase
        .from("size_update_jobs")
        .update({
          status: "failed",
          error_message: msg.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      return NextResponse.json({ status: "failed", jobId: job.id, error: msg }, { status: 500 });
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

    // Auto-aciona o próximo batch após pequena pausa (mesmo padrão de products/sync/process)
    if (!isComplete) {
      setTimeout(() => {
        fetch(`${process.env.NEXTAUTH_URL}/api/atualizar-tamanhos/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: job.id }),
        }).catch(() => {});
      }, 5000);
    }

    return NextResponse.json({
      status: isComplete ? "completed" : "processing",
      jobId: job.id,
      progress: `${Math.min(newOffset, total)}/${total}`,
      batch: batchResult,
    });
  } catch (err) {
    console.error("[atualizar-tamanhos/process] erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro no processamento" },
      { status: 500 }
    );
  }
}

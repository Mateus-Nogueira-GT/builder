import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabase } from "@/lib/supabase";

/**
 * Retorna o estado atual de um job de migração de tamanhos.
 * O frontend faz polling aqui enquanto o job está running.
 */
export async function GET(request: Request) {
  const token = await getToken({
    req: request as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId é obrigatório" }, { status: 400 });
  }

  const { data: job, error } = await supabase
    .from("size_update_jobs")
    .select("id, status, total_products, current_offset, updated_count, skipped_count, missing_count, failed_count, error_message, owner_email")
    .eq("id", jobId)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Job não encontrado" }, { status: 404 });
  }

  // Só o dono pode ver o status
  if (job.owner_email !== token.email) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const total = job.total_products as number;
  const processed = Math.min(job.current_offset as number, total);
  const percent = total > 0 ? Math.floor((processed / total) * 100) : 0;

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    total,
    processed,
    percent,
    counts: {
      updated: job.updated_count,
      skipped: job.skipped_count,
      missing: job.missing_count,
      failed: job.failed_count,
    },
    errorMessage: job.error_message,
  });
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getPublicBaseUrl } from "@/lib/url";

// Permite que a funcao rode ate 60s caso /process demore a aceitar conexao
export const maxDuration = 60;

/**
 * Watchdog server-side: roda a cada 1 minuto via Vercel Cron.
 *
 * Replica o comportamento do polling do frontend de /atualizar-tamanhos:
 * encontra todos os jobs em status='running' e dispara /process pra cada um.
 * Se um job ficou orfao (auto-restart fire-and-forget falhou), esse cron
 * acorda ele.
 *
 * Tambem age sobre jobs disparados automaticamente via /api/inject (criacao
 * de loja), que nao tem ninguem fazendo polling do front.
 *
 * Auth: Vercel envia `Authorization: Bearer ${CRON_SECRET}` se a env var
 * estiver setada. Se nao tiver, o endpoint fica aberto — mas como ele so
 * dispara /process (que e idempotente), nao ha risco de abuso.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  // Pega todos os jobs travados em running
  const { data: jobs, error } = await supabase
    .from("size_update_jobs")
    .select("id, store_id, current_offset, total_products, updated_at")
    .eq("status", "running")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[atualizar-tamanhos/cron] falha ao buscar jobs:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ revived: 0 });
  }

  const baseUrl = getPublicBaseUrl(request);
  console.log(
    `[atualizar-tamanhos/cron] revivendo ${jobs.length} job(s) running | baseUrl=${baseUrl}`
  );

  // Importante: fire-and-forget puro nao funciona em serverless — a runtime
  // mata a funcao apos return e cancela fetches pendentes que ainda nao
  // estabeleceram conexao TCP. Solucao: AWAIT cada fetch ate 3s com abort.
  // Isso garante que a request saiu de fato, mas nao bloqueia esperando a
  // resposta de /process (que pode levar ate 50s).
  const results = await Promise.allSettled(
    jobs.map(async (job) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        await fetch(`${baseUrl}/api/atualizar-tamanhos/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: job.id }),
          signal: controller.signal,
        });
        return { jobId: job.id, dispatched: true };
      } catch (err) {
        // AbortError aqui significa que a request foi enviada e estamos so
        // desistindo de esperar a resposta — esperado e ok. Outros erros sao
        // problemas reais (DNS, conexao recusada, etc).
        const isAbort =
          err instanceof DOMException && err.name === "AbortError";
        if (!isAbort) {
          console.warn(
            `[atualizar-tamanhos/cron] dispatch falhou job=${job.id}:`,
            err instanceof Error ? err.message : err
          );
        }
        return { jobId: job.id, dispatched: isAbort };
      } finally {
        clearTimeout(timeout);
      }
    })
  );

  return NextResponse.json({
    revived: jobs.length,
    results: results.map((r, i) =>
      r.status === "fulfilled"
        ? r.value
        : { jobId: jobs[i].id, error: String(r.reason) }
    ),
  });
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fetchProducts } from "@/lib/externalCatalog";
import { mapToWixProduct } from "@/lib/productMapper";
import { createProducts, resolveAuthHeader } from "@/lib/wix";

export async function POST(request: Request) {
  try {
    let jobId: string | undefined;

    try {
      const body = await request.json();
      jobId = body.jobId;
    } catch {
      // No body — find oldest running job
    }

    let job;
    if (jobId) {
      const { data, error } = await supabase
        .from("product_sync_jobs")
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
        .from("product_sync_jobs")
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

    const totalIds = job.total_product_ids as string[];
    const currentOffset = job.current_offset as number;
    const batchSize = job.batch_size as number;

    if (currentOffset >= totalIds.length) {
      await supabase
        .from("product_sync_jobs")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", job.id);

      return NextResponse.json({ status: "completed", jobId: job.id });
    }

    const products = await fetchProducts(totalIds, batchSize, currentOffset);
    const wixProducts = products.map((p) => mapToWixProduct(p, { withSizes: true }));
    const authToken = await resolveAuthHeader(job.api_key, job.instance_id);
    const result = await createProducts(authToken, job.site_id, wixProducts);

    const newOffset = currentOffset + batchSize;
    const isComplete = newOffset >= totalIds.length;

    await supabase
      .from("product_sync_jobs")
      .update({
        current_offset: newOffset,
        products_created: (job.products_created || 0) + result.created,
        products_failed: (job.products_failed || 0) + result.failed,
        status: isComplete ? "completed" : "running",
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    if (!isComplete) {
      setTimeout(() => {
        fetch(`${process.env.NEXTAUTH_URL}/api/products/sync/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: job.id }),
        }).catch(() => {});
      }, 60000);
    }

    return NextResponse.json({
      status: isComplete ? "completed" : "processing",
      jobId: job.id,
      batch: {
        offset: currentOffset,
        created: result.created,
        failed: result.failed,
      },
      progress: `${Math.min(newOffset, totalIds.length)}/${totalIds.length}`,
    });
  } catch (err) {
    console.error("Sync process error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro no processamento" },
      { status: 500 }
    );
  }
}

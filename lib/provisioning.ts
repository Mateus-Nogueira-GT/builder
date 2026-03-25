import { supabase } from "./supabase";
import type { ProvisionLog, ProvisionRun } from "./schemas";

/* ─────────────────────── Helpers ──────────────────────── */

export function createLog(
  message: string,
  status: ProvisionLog["status"],
  step?: string
): ProvisionLog {
  return {
    message,
    status,
    step,
    timestamp: new Date().toISOString(),
  };
}

/* ─────────────── Create / Read provision runs ─────────── */

export async function createProvisionRun(params: {
  storeId?: string;
  siteId: string;
  payload: Record<string, unknown>;
}): Promise<ProvisionRun> {
  const { data, error } = await supabase
    .from("provision_runs")
    .insert({
      store_id: params.storeId ?? null,
      site_id: params.siteId,
      payload: params.payload,
      status: "pending",
      result: { logs: [] },
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao criar provision run.");
  }

  return data as ProvisionRun;
}

export async function getProvisionRun(runId: string): Promise<ProvisionRun> {
  const { data, error } = await supabase
    .from("provision_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Provision run não encontrado.");
  }

  return data as ProvisionRun;
}

/* ──────────────── Append log & update status ──────────── */

export async function appendProvisionLog(
  runId: string,
  log: ProvisionLog,
  updates?: {
    status?: ProvisionRun["status"];
    currentStep?: string | null;
    siteUrl?: string;
    lastError?: string;
    completedAt?: string;
  }
): Promise<void> {
  const current = await getProvisionRun(runId);
  const result = (current.result ?? { logs: [] }) as Record<string, unknown>;
  const logs = Array.isArray(result.logs) ? [...result.logs, log] : [log];

  const updatedResult: Record<string, unknown> = {
    ...result,
    logs,
  };

  if (updates?.currentStep !== undefined) updatedResult.currentStep = updates.currentStep;
  if (updates?.siteUrl !== undefined) updatedResult.siteUrl = updates.siteUrl;
  if (updates?.lastError !== undefined) updatedResult.lastError = updates.lastError;
  if (updates?.completedAt !== undefined) updatedResult.completedAt = updates.completedAt;

  const patch: Record<string, unknown> = { result: updatedResult };
  if (updates?.status) patch.status = updates.status;

  const { error } = await supabase
    .from("provision_runs")
    .update(patch)
    .eq("id", runId);

  if (error) {
    console.error("appendProvisionLog error:", error.message);
  }
}

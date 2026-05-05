import { supabase } from "./supabase";
import type { ProvisionLog, ProvisionRun } from "./schemas";

/**
 * NOTA: a tabela `provision_runs` foi descontinuada. O storage real é
 * `injections` (id, store_id, payload, status, result jsonb, created_at).
 * O `site_id` mora dentro de `payload.siteId` (já é passado assim pelo
 * inject route). Os campos extras de ProvisionRun (currentStep, lastError,
 * completedAt, siteUrl) ficam dentro de `result`.
 */

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

interface InjectionRow {
  id: string;
  store_id: string | null;
  payload: Record<string, unknown>;
  status: string;
  result: Record<string, unknown> | null;
  created_at: string;
}

function toProvisionRun(row: InjectionRow): ProvisionRun {
  return {
    id: row.id,
    store_id: row.store_id,
    site_id: (row.payload?.siteId as string) ?? "",
    payload: row.payload,
    status: row.status as ProvisionRun["status"],
    result: row.result as ProvisionRun["result"],
    created_at: row.created_at,
  };
}

/* ─────────────── Create / Read provision runs ─────────── */

export async function createProvisionRun(params: {
  storeId?: string;
  siteId: string;
  payload: Record<string, unknown>;
}): Promise<ProvisionRun> {
  const payload = { ...params.payload, siteId: params.siteId };
  const { data, error } = await supabase
    .from("injections")
    .insert({
      store_id: params.storeId ?? null,
      payload,
      status: "pending",
      result: { logs: [] },
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao criar injection.");
  }

  return toProvisionRun(data as InjectionRow);
}

export async function getProvisionRun(runId: string): Promise<ProvisionRun> {
  const { data, error } = await supabase
    .from("injections")
    .select("*")
    .eq("id", runId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Injection não encontrada.");
  }

  return toProvisionRun(data as InjectionRow);
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
    .from("injections")
    .update(patch)
    .eq("id", runId);

  if (error) {
    console.error("appendProvisionLog error:", error.message);
  }
}

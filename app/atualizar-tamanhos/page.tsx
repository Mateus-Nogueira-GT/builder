"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shirt,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  LinkIcon,
} from "lucide-react";

interface Store {
  id: string;
  name: string;
  wix_site_id: string | null;
  wix_site_url: string | null;
  wix_instance_id: string | null;
}

interface JobStatus {
  jobId: string;
  status: "running" | "completed" | "failed";
  total: number;
  processed: number;
  percent: number;
  counts: {
    updated: number;
    skipped: number;
    missing: number;
    failed: number;
  };
  errorMessage?: string;
}

export default function AtualizarTamanhosPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [activeJob, setActiveJob] = useState<JobStatus | null>(null);
  const [starting, setStarting] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Carrega lojas do usuário (middleware já garante que está autenticado)
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch("/api/stores");
        const data = await res.json();
        // Aceita lojas que passaram pelo OAuth (têm wix_instance_id)
        const valid = Array.isArray(data)
          ? data.filter((s: Store) => Boolean(s.wix_instance_id))
          : [];
        setStores(valid);
      } catch {
        toast.error("Erro ao carregar suas lojas");
      } finally {
        setLoadingStores(false);
      }
    };
    fetchStores();
  }, []);

  const handleConnectWix = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/atualizar-tamanhos/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (!res.ok || !data.authUrl) {
        toast.error(data.error || "Erro ao conectar com o Wix");
        setConnecting(false);
        return;
      }

      // Redireciona pro app-installer do Wix
      window.location.href = data.authUrl;
    } catch (err) {
      console.error("[atualizar-tamanhos] connect error:", err);
      toast.error("Erro ao conectar com o Wix");
      setConnecting(false);
    }
  };

  const pollStatus = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/atualizar-tamanhos/status?jobId=${jobId}`);
      const data: JobStatus = await res.json();
      setActiveJob(data);
      if (data.status === "running") {
        setTimeout(() => pollStatus(jobId), 4000);
      }
    } catch (err) {
      console.error("[atualizar-tamanhos] polling error:", err);
    }
  }, []);

  const handleStart = async (storeId: string) => {
    setStarting(true);
    try {
      const res = await fetch("/api/atualizar-tamanhos/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao iniciar atualização");
        return;
      }

      toast.success("Atualização iniciada!");
      pollStatus(data.jobId);
    } catch (err) {
      console.error("[atualizar-tamanhos] start error:", err);
      toast.error("Erro ao iniciar atualização");
    } finally {
      setStarting(false);
    }
  };

  if (loadingStores) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
            <Sparkles className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold text-white">Atualizar Tamanhos</h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-lg mx-auto">
            Adicione o seletor de tamanho (P, M, G, GG, G1, G2) aos produtos
            que já estão na sua loja Wix. Esta atualização é feita uma única vez
            por loja e leva alguns minutos.
          </p>
        </div>

        {/* Job ativo */}
        {activeJob && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                {activeJob.status === "running" && (
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                )}
                {activeJob.status === "completed" && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                )}
                {activeJob.status === "failed" && (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                {activeJob.status === "running" && "Processando..."}
                {activeJob.status === "completed" && "Atualização concluída!"}
                {activeJob.status === "failed" && "Falha na atualização"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex justify-between text-sm text-zinc-400 mb-2">
                  <span>
                    {activeJob.processed} de {activeJob.total} produtos
                  </span>
                  <span className="font-medium text-white">{activeJob.percent}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${activeJob.percent}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                  <p className="text-emerald-400 font-bold text-lg">
                    {activeJob.counts.updated}
                  </p>
                  <p className="text-zinc-400">Atualizados</p>
                </div>
                <div className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2">
                  <p className="text-zinc-300 font-bold text-lg">
                    {activeJob.counts.skipped}
                  </p>
                  <p className="text-zinc-500">Já tinham tamanho</p>
                </div>
                <div className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2">
                  <p className="text-zinc-300 font-bold text-lg">
                    {activeJob.counts.missing}
                  </p>
                  <p className="text-zinc-500">Sem tamanho no catálogo</p>
                </div>
                <div className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2">
                  <p className="text-zinc-300 font-bold text-lg">
                    {activeJob.counts.failed}
                  </p>
                  <p className="text-zinc-500">Falhas</p>
                </div>
              </div>

              {activeJob.status === "running" && (
                <p className="text-xs text-zinc-500 text-center">
                  Você pode fechar esta página — a atualização continua em segundo plano.
                  Volte aqui depois para ver o resultado.
                </p>
              )}

              {activeJob.status === "completed" && (
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-4 text-sm text-emerald-300">
                  Sua loja foi atualizada. Os produtos agora aparecem com o seletor
                  de tamanho na sua loja Wix.
                </div>
              )}

              {activeJob.status === "failed" && activeJob.errorMessage && (
                <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-4 text-sm text-red-300">
                  {activeJob.errorMessage}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lista de lojas pra atualizar */}
        {!activeJob && (
          <>
            {stores.length === 0 ? (
              <Card className="border-zinc-800 bg-zinc-900">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <LinkIcon className="h-5 w-5 text-emerald-500" />
                    Conecte sua loja Wix
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Para atualizar os tamanhos dos produtos, primeiro precisamos
                    da sua autorização para acessar sua loja. Você será
                    redirecionado para o Wix, vai escolher a sua loja e clicar
                    em "Continuar". É um processo rápido — feito uma única vez.
                  </p>
                  <Button
                    onClick={handleConnectWix}
                    disabled={connecting}
                    className="w-full bg-emerald-500 text-black font-bold hover:bg-emerald-400"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecionando...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Conectar minha loja Wix
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {stores.map((store) => (
                  <Card key={store.id} className="border-zinc-800 bg-zinc-900">
                    <CardContent className="pt-6 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                          <Shirt className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">
                            {store.name}
                          </p>
                          {store.wix_site_url && (
                            <p className="text-xs text-zinc-500 truncate">
                              {store.wix_site_url}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleStart(store.id)}
                        disabled={starting}
                        className="shrink-0 bg-emerald-500 text-black font-bold hover:bg-emerald-400"
                      >
                        {starting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Atualizar Tamanhos
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

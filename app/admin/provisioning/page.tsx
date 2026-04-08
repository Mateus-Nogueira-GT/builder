"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Rocket, ExternalLink } from "lucide-react";
import { TEMPLATES } from "@/components/TemplateSelector";
interface OnboardingRequest {
  id: string;
  owner_id: string;
  store_name: string;
  template_id: string | null;
  status: string;
  wix_api_key: string | null;
  wix_site_id: string | null;
  created_at: string;
}

type StatusFilter = "pending" | "provisioning" | "provisioned" | "error";

const STATUS_COLORS: Record<StatusFilter, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  provisioning: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  provisioned: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_LABELS: Record<StatusFilter, string> = {
  pending: "Pendente",
  provisioning: "Provisionando",
  provisioned: "Provisionada",
  error: "Erro",
};

export default function ProvisioningPage() {
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [stores, setStores] = useState<OnboardingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [provisioningIds, setProvisioningIds] = useState<Set<string>>(new Set());
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [siteIds, setSiteIds] = useState<Record<string, string>>({});

  const loadStores = async (status: StatusFilter) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/provisioning?status=${status}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar lojas");
      setStores(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar lojas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores(filter);
  }, [filter]);

  const handleProvision = async (storeId: string) => {
    const wixApiKey = apiKeys[storeId]?.trim();
    const wixSiteId = siteIds[storeId]?.trim();

    if (!wixApiKey || !wixSiteId) {
      toast.error("Preencha a API Key e o Site ID");
      return;
    }

    setProvisioningIds((prev) => new Set(prev).add(storeId));

    try {
      const res = await fetch("/api/admin/provisioning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, wixApiKey, wixSiteId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao provisionar");

      toast.success(`Sync iniciado! Job: ${data.jobId} — ${data.totalProducts} produtos`);
      await loadStores(filter);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao provisionar");
    } finally {
      setProvisioningIds((prev) => {
        const next = new Set(prev);
        next.delete(storeId);
        return next;
      });
    }
  };

  const getTemplateName = (templateId: string | null) => {
    if (!templateId) return "—";
    const tmpl = TEMPLATES.find((t) => t.id === templateId);
    return tmpl?.name || templateId;
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10">
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Provisioning</h1>
            <p className="text-sm text-zinc-400">
              Gerencie lojas pendentes e injete produtos
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2">
          {(["pending", "provisioning", "provisioned", "error"] as StatusFilter[]).map((status) => (
            <Button
              key={status}
              variant="outline"
              onClick={() => setFilter(status)}
              className={
                filter === status
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }
            >
              {STATUS_LABELS[status]}
            </Button>
          ))}
        </div>

        {/* API Key docs link */}
        <p className="text-xs text-zinc-500">
          Para obter a API Key do Wix, consulte:{" "}
          <a
            href="https://dev.wix.com/docs/rest/account-level-apis/api-keys/about-api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline"
          >
            Documentação de API Keys do Wix
            <ExternalLink className="ml-1 inline h-3 w-3" />
          </a>
        </p>

        {/* Store cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
        ) : stores.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            Nenhuma loja com status &quot;{STATUS_LABELS[filter]}&quot;
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stores.map((store) => (
              <Card key={store.id} className="border-zinc-800 bg-zinc-900">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-white text-base">{store.store_name}</CardTitle>
                    <Badge className={STATUS_COLORS[store.status as StatusFilter] || STATUS_COLORS.pending}>
                      {STATUS_LABELS[store.status as StatusFilter] || store.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1 text-sm text-zinc-400">
                    <p>
                      <span className="text-zinc-500">Template:</span>{" "}
                      {getTemplateName(store.template_id)}
                    </p>
                    <p>
                      <span className="text-zinc-500">Email:</span>{" "}
                      {store.owner_id || "—"}
                    </p>
                    <p>
                      <span className="text-zinc-500">Data:</span>{" "}
                      {new Date(store.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  {/* Pending: show input fields */}
                  {store.status === "pending" && (
                    <div className="space-y-2 pt-2 border-t border-zinc-800">
                      <Input
                        placeholder="Wix API Key"
                        value={apiKeys[store.id] || ""}
                        onChange={(e) =>
                          setApiKeys((prev) => ({ ...prev, [store.id]: e.target.value }))
                        }
                        className="bg-zinc-800 border-zinc-700 text-white text-xs"
                      />
                      <Input
                        placeholder="Wix Site ID"
                        value={siteIds[store.id] || ""}
                        onChange={(e) =>
                          setSiteIds((prev) => ({ ...prev, [store.id]: e.target.value }))
                        }
                        className="bg-zinc-800 border-zinc-700 text-white text-xs"
                      />
                      <Button
                        onClick={() => handleProvision(store.id)}
                        disabled={provisioningIds.has(store.id)}
                        className="w-full bg-emerald-500 text-black font-bold hover:bg-emerald-400"
                      >
                        {provisioningIds.has(store.id) ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Provisionando...
                          </>
                        ) : (
                          <>
                            <Rocket className="mr-2 h-4 w-4" /> Injetar Produtos
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Provisioned: show Wix dashboard link */}
                  {store.status === "provisioned" && store.wix_site_id && (
                    <div className="pt-2 border-t border-zinc-800">
                      <a
                        href={`https://manage.wix.com/dashboard/${store.wix_site_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-emerald-400 hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Abrir Painel Wix
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

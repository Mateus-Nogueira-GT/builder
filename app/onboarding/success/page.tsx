"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, ExternalLink, LayoutDashboard, Loader2 } from "lucide-react";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const name = searchParams.get("name") || "Sua Loja";
  const dashboard = searchParams.get("dashboard") || "";
  const storeId = searchParams.get("storeId") || "";
  const siteId = searchParams.get("siteId") || "";
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(true);

  useEffect(() => {
    if (!siteId || !storeId) {
      setPublishing(false);
      return;
    }

    fetch("/api/wix/publish-site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, siteId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.publicUrl) setPublicUrl(data.publicUrl);
      })
      .catch(() => {})
      .finally(() => setPublishing(false));
  }, [siteId, storeId]);

  const mainUrl = publicUrl || dashboard;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">Loja criada com sucesso!</h2>
          <p className="text-zinc-400 text-sm">
            Sua loja <strong className="text-white">{name}</strong> foi criada com todos os produtos.
          </p>
          {publishing && (
            <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Publicando sua loja...
            </div>
          )}
        </div>

        <div className="space-y-3">
          {publishing ? (
            <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-800 px-6 py-3 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando link da loja...
            </div>
          ) : (
            <a
              href={mainUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-bold text-black hover:bg-emerald-400 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              {publicUrl ? "Acessar Minha Loja" : "Abrir Painel da Loja"}
            </a>
          )}

          {publicUrl && dashboard && (
            <a
              href={dashboard}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 hover:border-zinc-500 transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              Painel de Administração
            </a>
          )}

          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="w-full text-zinc-500 hover:text-zinc-300"
          >
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}

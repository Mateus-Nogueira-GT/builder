"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { StepIndicator } from "@/components/StepIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shirt,
  ExternalLink,
  CheckCircle2,
  Loader2,
  LayoutTemplate,
} from "lucide-react";

const FLOW_STEPS = [
  { label: "Nome da Loja" },
  { label: "Template" },
  { label: "Instalar no Wix" },
  { label: "Conectar App" },
];

function InstallTemplateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("");
  const [opened, setOpened] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Exibe erro de callback do OAuth se houver
    const error = searchParams.get("error");
    if (error) {
      toast.error("Erro ao conectar o app. Tente novamente.");
    }
  }, [searchParams]);

  useEffect(() => {
    const url = sessionStorage.getItem("pending_template_url");
    const id = sessionStorage.getItem("pending_store_id");
    const name = sessionStorage.getItem("pending_store_name") ?? "";

    if (!url || !id) {
      // Sessão perdida — volta ao início
      router.replace("/onboarding");
      return;
    }

    setTemplateUrl(url);
    setStoreId(id);
    setStoreName(name);
  }, [router]);

  const handleOpenWix = () => {
    window.open(templateUrl!, "_blank", "noopener,noreferrer");
    setOpened(true);
  };

  const handleConnect = async () => {
    if (!storeId) return;
    setConnecting(true);

    try {
      const res = await fetch(`/api/wix/oauth?storeId=${storeId}`);
      const data = await res.json();

      if (!res.ok || !data.authUrl) {
        toast.error(data.error || "Erro ao gerar URL de autorização");
        setConnecting(false);
        return;
      }

      // Redireciona para o Wix app-installer na mesma aba
      window.location.href = data.authUrl;
    } catch (err) {
      console.error("[INSTALL-TEMPLATE] connect error:", err);
      toast.error("Erro ao conectar. Tente novamente.");
      setConnecting(false);
    }
  };

  if (!templateUrl) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
            <Shirt className="h-6 w-6 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold text-white">Construtor de lojas</h1>
          {storeName && (
            <p className="text-zinc-400 text-sm">{storeName}</p>
          )}
        </div>

        <StepIndicator steps={FLOW_STEPS} currentStep={2} />

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <LayoutTemplate className="h-5 w-5 text-emerald-500" />
              Instalar o Template no Wix
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ol className="space-y-3 text-sm text-zinc-400">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                  1
                </span>
                Clique em <strong className="text-white">"Abrir no Wix"</strong> — vai abrir numa nova aba
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                  2
                </span>
                Faça login na sua conta Wix (a que tem o plano premium)
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                  3
                </span>
                Confirme a instalação do template e volte para esta aba
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                  4
                </span>
                Clique em <strong className="text-white">"Já instalei, continuar"</strong> para conectar sua loja
              </li>
            </ol>

            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={handleOpenWix}
                variant="outline"
                className="w-full border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-400"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir no Wix
              </Button>

              {opened && (
                <Button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="w-full bg-emerald-500 text-black font-bold hover:bg-emerald-400"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Já instalei, continuar
                    </>
                  )}
                </Button>
              )}
            </div>

            {!opened && (
              <p className="text-center text-xs text-zinc-600">
                O botão "Já instalei" aparece após abrir o Wix
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function InstallTemplatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <InstallTemplateContent />
    </Suspense>
  );
}

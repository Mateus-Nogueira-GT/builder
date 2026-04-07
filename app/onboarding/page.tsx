"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { StepIndicator } from "@/components/StepIndicator";
import { TemplateSelector, TEMPLATES, type TemplateOption } from "@/components/TemplateSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shirt, ArrowRight, ArrowLeft, Store, LayoutTemplate, LinkIcon, Loader2 } from "lucide-react";

const FLOW_STEPS = [
  { label: "Nome da Loja" },
  { label: "Template" },
  { label: "Conectar Wix" },
];

type PageState = "form" | "waiting" | "creating" | "publishing";

function OnboardingContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [pageState, setPageState] = useState<PageState>("form");
  const [storeName, setStoreName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null);
  const [storeId, setStoreId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [countdown, setCountdown] = useState(90);
  const [publicUrl, setPublicUrl] = useState("");
  const [pendingStoreId, setPendingStoreId] = useState("");
  const [wixAppId, setWixAppId] = useState("");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Prefetch Wix app ID on mount (needed synchronously for popup)
  useEffect(() => {
    fetch("/api/wix-config")
      .then((r) => r.json())
      .then((data) => { if (data.clientId) setWixAppId(data.clientId); })
      .catch(() => {});
  }, []);

  // Check if returning from Wix OAuth (fallback for redirect-based flow)
  useEffect(() => {
    const connected = searchParams.get("wix_connected");
    const name = searchParams.get("storeName");
    const template = searchParams.get("templateSiteId");
    const pending = searchParams.get("pendingStoreId");
    const error = searchParams.get("error");

    if (error) {
      toast.error("Erro ao conectar com Wix. Tente novamente.");
      setStep(2);
      return;
    }

    if (connected === "true") {
      if (name) setStoreName(name);
      if (pending) setPendingStoreId(pending);
      if (template) {
        const found = TEMPLATES.find((t) => t.siteId === template);
        if (found) setSelectedTemplate(found);
      }
      setStep(2);
      // Auto-create site since OAuth already connected
      handleAutoCreate(name || "", template || "", pending || "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Countdown timer
  useEffect(() => {
    if (pageState !== "publishing") return;
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [pageState, countdown]);

  // Publish in background
  useEffect(() => {
    if (pageState !== "publishing" || !storeId || !siteId) return;
    fetch("/api/wix/publish-and-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, siteId }),
    })
      .then((r) => r.json())
      .then((data) => { if (data.publicUrl) setPublicUrl(data.publicUrl); })
      .catch(() => {});
  }, [pageState, storeId, siteId]);

  // Auto-redirect when countdown ends
  useEffect(() => {
    if (countdown > 0 || pageState !== "publishing") return;
    if (publicUrl) {
      window.location.href = publicUrl;
    } else {
      window.location.href = `https://manage.wix.com/dashboard/${siteId}`;
    }
  }, [countdown, pageState, publicUrl, siteId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Auto-create store after OAuth redirect return
  const handleAutoCreate = async (name: string, templateId: string, pending: string) => {
    const tpl = TEMPLATES.find((t) => t.siteId === templateId);
    if (!name || !tpl) return;

    setPageState("creating");
    try {
      const res = await fetch("/api/wix/create-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: name,
          templateSiteId: tpl.siteId,
          pendingStoreId: pending,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao criar site");
        setPageState("form");
        setStep(2);
        return;
      }
      window.location.href = `https://manage.wix.com/dashboard/${data.siteId}`;
    } catch {
      toast.error("Erro ao criar site");
      setPageState("form");
      setStep(2);
    }
  };

  const handleConnectWix = async () => {
    if (!storeName || !selectedTemplate) return;

    if (!wixAppId) {
      toast.error("Wix App ID não configurado. Recarregue a página.");
      return;
    }

    // 1. Open Wix installer FIRST (must be synchronous to avoid popup blocker)
    const redirectUrl = `${window.location.origin}/api/wix/oauth/callback`;
    const installUrl = `https://www.wix.com/installer/install?appId=${wixAppId}&redirectUrl=${encodeURIComponent(redirectUrl)}`;
    window.open(installUrl, "_blank");

    // 3. Create a pending store so the webhook can find it
    let createdStoreId = pendingStoreId;
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: storeName, siteId: "pending", connectionMethod: "oauth" }),
      });
      const data = await res.json();
      if (data.id) {
        createdStoreId = data.id;
        setPendingStoreId(data.id);
      }
    } catch { /* continue */ }

    // 4. Start polling for connection (webhook will update the pending store)
    setPageState("waiting");
    toast.info("Autorize o app no Wix. Aguardando conexão...");

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/wix/connection-status?storeId=${createdStoreId}`);
        const data = await res.json();
        if (data.connected) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          // Auto-create store immediately after connection
          setPageState("creating");
          try {
            const createRes = await fetch("/api/wix/create-site", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                storeName,
                templateSiteId: selectedTemplate!.siteId,
                pendingStoreId: data.storeId,
              }),
            });
            const createData = await createRes.json();
            if (!createRes.ok) {
              toast.error(createData.error || "Erro ao criar site");
              setPageState("form");
              setStep(2);
              return;
            }
            // Redirect to Wix dashboard
            window.location.href = `https://manage.wix.com/dashboard/${createData.siteId}`;
          } catch {
            toast.error("Erro ao criar site");
            setPageState("form");
            setStep(2);
          }
        }
      } catch { /* retry */ }
    }, 3000);
  };

  // Waiting for Wix connection screen
  if (pageState === "waiting") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="relative mx-auto h-20 w-20">
            <div className="absolute inset-0 rounded-full border-4 border-zinc-800" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#0C6EFC] animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Aguardando conexão com Wix</h2>
            <p className="text-zinc-400 text-sm">
              Instale o app na aba que abriu e volte aqui. A conexão será detectada automaticamente.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              if (pollingRef.current) clearInterval(pollingRef.current);
              setPageState("form");
            }}
            className="border-zinc-700 text-zinc-300"
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // Creating screen
  if (pageState === "creating") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-6">
          <div className="relative mx-auto h-20 w-20">
            <div className="absolute inset-0 rounded-full border-4 border-zinc-800" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
            <div className="absolute inset-3 rounded-full border-4 border-transparent border-t-emerald-400/50 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Criando sua loja...</h2>
            <p className="text-zinc-400 text-sm">Aguarde alguns segundos.</p>
          </div>
        </div>
      </div>
    );
  }

  // Publishing screen
  if (pageState === "publishing") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-8 max-w-md">
          <div className="relative mx-auto h-20 w-20">
            <div className="absolute inset-0 rounded-full border-4 border-zinc-800" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
            <div className="absolute inset-3 rounded-full border-4 border-transparent border-t-emerald-400/50 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-white">Estamos construindo a sua loja</h2>
            <p className="text-zinc-400 text-sm">
              Pode ir buscando um cafezinho enquanto isso. Você será redirecionado automaticamente quando tudo estiver pronto.
            </p>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: "0.3s" }} />
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: "0.6s" }} />
          </div>
          {publicUrl && (
            <a href={publicUrl} className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300">
              Sua loja já está pronta — clique aqui se não for redirecionado
            </a>
          )}
        </div>
      </div>
    );
  }

  // Form
  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
            <Shirt className="h-6 w-6 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold">Kit Store Builder</h1>
        </div>

        <StepIndicator steps={FLOW_STEPS} currentStep={step} />

        {/* Step 0: Name */}
        {step === 0 && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Store className="h-5 w-5 text-emerald-500" />
                Nome da Loja
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Como sua loja vai se chamar? *</label>
                <Input
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Ex: Camisa10 Store"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(1)} disabled={storeName.length === 0} className="bg-emerald-500 text-black font-bold">
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Template */}
        {step === 1 && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <LayoutTemplate className="h-5 w-5 text-emerald-500" />
                Escolha o Template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-zinc-400">
                Selecione o modelo visual da sua loja. Todos já vêm com os produtos cadastrados.
              </p>
              <TemplateSelector selected={selectedTemplate?.siteId || null} onSelect={setSelectedTemplate} />
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(0)} className="border-zinc-700 text-zinc-300">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button onClick={() => setStep(2)} disabled={!selectedTemplate} className="bg-emerald-500 text-black font-bold">
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Connect Wix */}
        {step === 2 && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <LinkIcon className="h-5 w-5 text-emerald-500" />
                Conectar sua conta Wix
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">
                  Para criar sua loja, precisamos conectar com sua conta Wix. Clique abaixo para autorizar o acesso.
                </p>
                <Button
                  onClick={handleConnectWix}
                  className="w-full bg-[#0C6EFC] text-white font-bold hover:bg-[#0B5ED8]"
                >
                  Conectar com Wix
                </Button>
              </div>
              <div className="flex justify-start">
                <Button variant="outline" onClick={() => setStep(1)} className="border-zinc-700 text-zinc-300">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <OnboardingContent />
    </Suspense>
  );
}

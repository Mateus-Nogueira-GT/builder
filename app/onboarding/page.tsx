"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { StepIndicator } from "@/components/StepIndicator";
import { TemplateSelector, type TemplateOption } from "@/components/TemplateSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shirt, ArrowRight, ArrowLeft, Store, LayoutTemplate } from "lucide-react";

const FLOW_STEPS = [
  { label: "Nome da Loja" },
  { label: "Template" },
];

type PageState = "form" | "creating";

function OnboardingContent() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pageState, setPageState] = useState<PageState>("form");
  const [storeName, setStoreName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null);

  const handleCreateStore = async () => {
    if (!storeName || !selectedTemplate) return;
    setPageState("creating");

    try {
      const res = await fetch("/api/wix/create-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName,
          templateSiteId: selectedTemplate.siteId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao criar site");
        setPageState("form");
        return;
      }

      // Redirect to success page
      const params = new URLSearchParams({
        name: storeName,
        dashboard: data.dashboardUrl,
        storeId: data.storeId,
        siteId: data.siteId,
      });
      router.push(`/onboarding/success?${params.toString()}`);
    } catch (err) {
      console.error("[ONBOARDING] error:", err);
      toast.error("Erro ao criar site");
      setPageState("form");
    }
  };

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

        {/* Step 1: Template + Create */}
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
                <Button
                  onClick={handleCreateStore}
                  disabled={!selectedTemplate}
                  className="bg-emerald-500 text-black font-bold hover:bg-emerald-400"
                >
                  Criar Minha Loja <ArrowRight className="ml-2 h-4 w-4" />
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

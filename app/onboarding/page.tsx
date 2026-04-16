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
import { Shirt, ArrowRight, ArrowLeft, Store, LayoutTemplate, Loader2 } from "lucide-react";

const FLOW_STEPS = [
  { label: "Nome da Loja" },
  { label: "Template" },
];

function OnboardingContent() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null);

  const handleSubmit = async () => {
    if (!storeName || !selectedTemplate) return;
    setSubmitting(true);

    try {
      // 1. Cria a store pendente no banco
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: storeName,
          templateId: selectedTemplate.id,
          status: "pending",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao registrar loja");
        setSubmitting(false);
        return;
      }

      // 2. Salva dados da sessão para a próxima etapa recuperar
      const storeId = data?.id ?? data?.[0]?.id ?? null;
      if (storeId) {
        sessionStorage.setItem("pending_store_id", String(storeId));
      }
      sessionStorage.setItem("pending_store_name", storeName);
      sessionStorage.setItem("pending_template_url", selectedTemplate.installUrl);

      // 3. Vai para a página intermediária de instalação do template
      router.push("/onboarding/install-template");
    } catch (err) {
      console.error("[ONBOARDING] error:", err);
      toast.error("Erro ao registrar loja");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
            <Shirt className="h-6 w-6 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold">Construtor de lojas</h1>
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

        {/* Step 1: Template + Submit */}
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
              <TemplateSelector selected={selectedTemplate?.id || null} onSelect={setSelectedTemplate} />
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(0)} className="border-zinc-700 text-zinc-300">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedTemplate || submitting}
                  className="bg-emerald-500 text-black font-bold hover:bg-emerald-400"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando...
                    </>
                  ) : (
                    "Finalizar Cadastro"
                  )}
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

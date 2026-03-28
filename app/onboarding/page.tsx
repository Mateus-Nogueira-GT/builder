"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StepIndicator } from "@/components/StepIndicator";
import { PaletteSelector } from "@/components/PaletteSelector";
import { LayoutSelector } from "@/components/LayoutSelector";
import { BannerColorPicker } from "@/components/BannerColorPicker";
import { LogoSelector } from "@/components/LogoSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession, setSession } from "@/lib/session";
import { generateDefaultContent } from "@/lib/defaultContent";
import { PALETTES, type Palette } from "@/lib/palettes";
import type { LogoVariant } from "@/lib/logoTemplates";
import {
  Shirt, ArrowRight, ArrowLeft, Loader2, Store,
  Palette as PaletteIcon, ImageIcon, Sparkles,
  Database, ExternalLink, CheckCircle2, RefreshCw,
} from "lucide-react";

const FLOW_STEPS = [
  { label: "Nome & Cores" },
  { label: "Layout" },
  { label: "Banners" },
  { label: "Logo" },
  { label: "Ativar CMS" },
];

interface OnboardingState {
  storeName: string;
  focus: "brasileirao" | "copa" | "retro" | "todos";
  palette: Palette;
  layoutType: "classic" | "modern";
  bannerBgColor: string;
  bannerTextColor: string;
  bannerCtaColor: string;
  logoVariant: LogoVariant | null;
  logoSvg: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cmsActive, setCmsActive] = useState(false);
  const [siteData, setSiteData] = useState<{ storeId: string; siteId: string; metaSiteId: string; siteUrl: string } | null>(null);

  const [form, setForm] = useState<OnboardingState>(() => {
    const session = getSession();
    const ob = session.onboarding;
    const defaultPalette = PALETTES[0];
    return {
      storeName: ob?.storeName || "",
      focus: (ob?.focus as "brasileirao" | "copa" | "retro" | "todos") || "todos",
      palette: PALETTES.find(p => p.primary === ob?.primaryColor) || defaultPalette,
      layoutType: "classic",
      bannerBgColor: defaultPalette.primary,
      bannerTextColor: "#ffffff",
      bannerCtaColor: defaultPalette.accent,
      logoVariant: null,
      logoSvg: "",
    };
  });

  const update = (partial: Partial<OnboardingState>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  };

  useEffect(() => {
    setSession({
      onboarding: {
        connectionMethod: "api_key",
        apiKey: "",
        siteId: "",
        storeName: form.storeName,
        siteUrl: "",
        email: "",
        whatsapp: "",
        instagram: "",
        city: "",
        state: "",
        focus: form.focus,
        featuredTeams: [],
        activePromotion: "Compre 2 Leve 3",
        primaryColor: form.palette.primary,
        secondaryColor: form.palette.secondary,
        heroBannerColor: "",
        heroBannerId: "",
        heroBannerDesktopUrl: "",
        heroBannerMobileUrl: "",
        heroBannerThumbnailUrl: "",
        siteName: form.storeName,
        instanceId: "",
      },
    });
  }, [form]);

  // Step 4: Create Wix site and go to CMS activation
  const handleCreateSite = async () => {
    if (!form.storeName || !form.logoVariant) return;

    setCreating(true);
    try {
      const createRes = await fetch("/api/wix/create-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: form.storeName,
          focus: form.focus,
          primaryColor: form.palette.primary,
          secondaryColor: form.palette.secondary,
          accentColor: form.palette.accent,
          layoutType: form.layoutType,
          bannerBgColor: form.bannerBgColor,
          bannerTextColor: form.bannerTextColor,
          bannerCtaColor: form.bannerCtaColor,
          logoVariant: form.logoVariant,
          logoSvg: form.logoSvg,
        }),
      });

      const data = await createRes.json();
      if (!createRes.ok) {
        toast.error(data.error || "Erro ao criar site");
        return;
      }

      setSiteData(data);

      const updatedOnboarding = {
        ...getSession().onboarding!,
        siteId: data.siteId,
        siteUrl: data.siteUrl,
        siteName: form.storeName,
        instanceId: data.metaSiteId,
        apiKey: "",
        focus: form.focus,
        accentColor: form.palette.accent,
        layoutType: form.layoutType,
        bannerBgColor: form.bannerBgColor,
        bannerTextColor: form.bannerTextColor,
        bannerCtaColor: form.bannerCtaColor,
        logoSvg: form.logoSvg,
        logoVariant: form.logoVariant,
      };

      setSession({
        onboarding: updatedOnboarding,
        storeId: data.storeId,
      });

      toast.success("Site criado no Wix!");
      setStep(4); // Go to CMS activation step
    } catch (err) {
      console.error("[ONBOARDING] handleCreateSite error:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao criar site");
    } finally {
      setCreating(false);
    }
  };

  // Check if CMS is active
  const checkCms = async () => {
    const sid = siteData?.siteId || siteData?.metaSiteId;
    if (!sid) {
      toast.error("Site não encontrado");
      return;
    }

    setChecking(true);
    try {
      const res = await fetch("/api/wix/check-cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: sid }),
      });

      const data = await res.json();
      if (data.active) {
        setCmsActive(true);
        toast.success("CMS ativado com sucesso!");
      } else {
        toast.error("CMS ainda não ativado. Siga os passos e tente novamente.");
      }
    } catch {
      toast.error("Erro ao verificar CMS");
    } finally {
      setChecking(false);
    }
  };

  // Step 5: Inject content and publish
  const handlePublish = async () => {
    if (!siteData) return;

    setPublishing(true);
    try {
      const content = generateDefaultContent({
        storeName: form.storeName,
        primaryColor: form.palette.primary,
        secondaryColor: form.palette.secondary,
        accentColor: form.palette.accent,
        layoutType: form.layoutType,
        bannerBgColor: form.bannerBgColor,
        bannerTextColor: form.bannerTextColor,
        bannerCtaColor: form.bannerCtaColor,
        logoSvg: form.logoSvg,
        logoVariant: form.logoVariant || "bold",
      });

      const updatedOnboarding = getSession().onboarding!;

      setSession({ content });

      const injectRes = await fetch("/api/inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: {
            ...content,
            onboarding: updatedOnboarding,
            images: {},
          },
          storeId: siteData.storeId,
          apiKey: updatedOnboarding.apiKey,
          siteId: siteData.siteId,
        }),
      });

      const injectData = await injectRes.json();
      if (!injectRes.ok) {
        toast.error(injectData.error || "Erro ao iniciar publicação");
        return;
      }

      toast.success("Publicando loja...");
      router.push(`/publishing?jobId=${injectData.jobId}`);
    } catch (err) {
      console.error("[ONBOARDING] handlePublish error:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao publicar");
    } finally {
      setPublishing(false);
    }
  };

  const canProceed = [
    form.storeName.length > 0,
    true,
    true,
    form.logoVariant !== null,
  ];

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

        {/* Step 0: Name + Focus + Palette */}
        {step === 0 && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Store className="h-5 w-5 text-emerald-500" />
                Nome & Paleta de Cores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Nome da Loja *</label>
                <Input
                  value={form.storeName}
                  onChange={(e) => update({ storeName: e.target.value })}
                  placeholder="Ex: Camisa10 Store"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Foco da Loja</label>
                <Select value={form.focus} onValueChange={(v) => update({ focus: v as OnboardingState["focus"] })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brasileirao">Brasileirão</SelectItem>
                    <SelectItem value="copa">Copa do Mundo</SelectItem>
                    <SelectItem value="retro">Retrô</SelectItem>
                    <SelectItem value="todos">Todos os estilos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <PaletteSelector
                storeName={form.storeName}
                selectedPalette={form.palette}
                onSelect={(p) => update({
                  palette: p,
                  bannerBgColor: p.primary,
                  bannerTextColor: "#ffffff",
                  bannerCtaColor: p.accent,
                })}
              />
              <div className="flex justify-end">
                <Button onClick={() => setStep(1)} disabled={!canProceed[0]} className="bg-emerald-500 text-black font-bold">
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Layout */}
        {step === 1 && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <PaletteIcon className="h-5 w-5 text-emerald-500" />
                Escolha o Layout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <LayoutSelector
                selected={form.layoutType}
                onSelect={(l) => update({ layoutType: l })}
                primaryColor={form.palette.primary}
              />
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(0)} className="border-zinc-700 text-zinc-300">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button onClick={() => setStep(2)} className="bg-emerald-500 text-black font-bold">
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Banner Colors */}
        {step === 2 && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <ImageIcon className="h-5 w-5 text-emerald-500" />
                Cores dos Banners
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <BannerColorPicker
                palette={form.palette}
                colors={{
                  bgColor: form.bannerBgColor,
                  textColor: form.bannerTextColor,
                  ctaColor: form.bannerCtaColor,
                }}
                onChange={(c) => update({
                  bannerBgColor: c.bgColor,
                  bannerTextColor: c.textColor,
                  bannerCtaColor: c.ctaColor,
                })}
              />
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="border-zinc-700 text-zinc-300">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button onClick={() => setStep(3)} className="bg-emerald-500 text-black font-bold">
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Logo */}
        {step === 3 && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                Escolha seu Logo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <LogoSelector
                storeName={form.storeName}
                primaryColor={form.palette.primary}
                accentColor={form.palette.accent}
                selected={form.logoVariant}
                onSelect={(variant, svg) => update({ logoVariant: variant, logoSvg: svg })}
              />
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)} className="border-zinc-700 text-zinc-300">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button
                  onClick={handleCreateSite}
                  disabled={!canProceed[3] || creating}
                  className="bg-emerald-500 text-black font-bold"
                >
                  {creating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando site...</>
                  ) : (
                    <>Criar Site <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Activate CMS */}
        {step === 4 && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Database className="h-5 w-5 text-emerald-500" />
                Ativar o CMS da sua Loja
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="text-sm text-amber-200">
                  Seu site foi criado! Agora precisamos que você ative o CMS no editor do Wix. São apenas <strong>3 cliques</strong>:
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-black">1</div>
                  <div>
                    <p className="font-medium text-white">Abra o editor do seu site</p>
                    <p className="text-sm text-zinc-400 mt-1">Clique no botão abaixo para abrir o editor</p>
                    <a
                      href={`https://manage.wix.com/dashboard/${siteData?.siteId || siteData?.metaSiteId}/home`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-sm text-emerald-400 hover:border-emerald-500 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir Editor do Site
                    </a>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-black">2</div>
                  <div>
                    <p className="font-medium text-white">Clique em &quot;CMS&quot; no painel lateral</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      No editor, procure o ícone de CMS no menu lateral esquerdo (parece uma tabela). Clique nele e depois em <strong>&quot;Comece adicionando conteúdo&quot;</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-black">3</div>
                  <div>
                    <p className="font-medium text-white">Crie uma coleção qualquer e publique</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      Selecione <strong>&quot;Começar do zero&quot;</strong>, dê qualquer nome e clique em criar. Depois clique em <strong>&quot;Publicar&quot;</strong> no canto superior direito do editor.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4 space-y-3">
                <p className="text-sm text-zinc-400 text-center">
                  Depois de publicar, clique no botão abaixo para verificar:
                </p>

                {cmsActive ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      CMS ativado com sucesso!
                    </div>
                    <Button
                      onClick={handlePublish}
                      disabled={publishing}
                      className="w-full bg-emerald-500 text-black font-bold hover:bg-emerald-400"
                    >
                      {publishing ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publicando loja...</>
                      ) : (
                        <>Publicar Loja <ArrowRight className="ml-2 h-4 w-4" /></>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={checkCms}
                    disabled={checking}
                    className="w-full bg-emerald-500 text-black font-bold hover:bg-emerald-400"
                  >
                    {checking ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
                    ) : (
                      <><RefreshCw className="mr-2 h-4 w-4" /> Verificar Ativação</>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

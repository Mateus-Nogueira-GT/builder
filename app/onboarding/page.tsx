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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession, setSession } from "@/lib/session";
import { generateDefaultContent } from "@/lib/defaultContent";
import { PALETTES, type Palette } from "@/lib/palettes";
import type { LogoVariant } from "@/lib/logoTemplates";
import { Shirt, ArrowRight, ArrowLeft, Loader2, Store, Palette as PaletteIcon, ImageIcon, Sparkles } from "lucide-react";

const FLOW_STEPS = [
  { label: "Nome & Cores" },
  { label: "Layout" },
  { label: "Banners" },
  { label: "Logo" },
];

interface OnboardingState {
  storeName: string;
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

  const [form, setForm] = useState<OnboardingState>(() => {
    const session = getSession();
    const ob = session.onboarding;
    const defaultPalette = PALETTES[0];
    return {
      storeName: ob?.storeName || "",
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
        focus: "todos",
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

  const handleFinish = async () => {
    if (!form.storeName || !form.logoVariant) return;

    setCreating(true);
    try {
      // 1. Create Wix site
      const createRes = await fetch("/api/wix/create-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: form.storeName,
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

      const siteData = await createRes.json();
      if (!createRes.ok) {
        toast.error(siteData.error || "Erro ao criar site");
        return;
      }

      // 2. Generate default content
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
        logoVariant: form.logoVariant,
      });

      // 3. Update session
      const updatedOnboarding = {
        ...getSession().onboarding!,
        siteId: siteData.siteId,
        siteUrl: siteData.siteUrl,
        siteName: form.storeName,
        instanceId: siteData.metaSiteId,
        apiKey: "",
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
        storeId: siteData.storeId,
        content,
      });

      // 4. Trigger injection
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

      // 5. Redirect to publishing
      toast.success("Loja criada! Publicando...");
      router.push(`/publishing?jobId=${injectData.jobId}`);
    } catch {
      toast.error("Erro ao criar site");
    } finally {
      setCreating(false);
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
                  onClick={handleFinish}
                  disabled={!canProceed[3] || creating}
                  className="bg-emerald-500 text-black font-bold"
                >
                  {creating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando e publicando...</>
                  ) : (
                    <>Finalizar <ArrowRight className="ml-2 h-4 w-4" /></>
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

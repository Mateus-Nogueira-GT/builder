"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StepIndicator } from "@/components/StepIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSession, setSession } from "@/lib/session";
import { BANNER_COLOR_OPTIONS } from "@/lib/bannerColors";
import type { OnboardingData } from "@/lib/schemas";
import {
  Shirt,
  ArrowRight,
  ArrowLeft,
  Store,
  Palette,
  ImageIcon,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Database,
  RefreshCw,
} from "lucide-react";

const FLOW_STEPS = [
  { label: "Dados da Loja" },
  { label: "Conteúdo" },
  { label: "Imagens" },
  { label: "Preview" },
  { label: "Publicar" },
  { label: "Dashboard" },
];

const FOCUS_OPTIONS = [
  { value: "brasileirao", label: "Brasileirão" },
  { value: "copa", label: "Copa do Mundo" },
  { value: "retro", label: "Retrô" },
  { value: "todos", label: "Todos os estilos" },
] as const;

const STATE_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

type SubStep = "store-info" | "branding" | "hero-banner" | "activate-cms";

export default function OnboardingPage() {
  const router = useRouter();
  const [subStep, setSubStep] = useState<SubStep>("store-info");
  const [wixReady, setWixReady] = useState(false);
  const [banners, setBanners] = useState<Array<{
    id: string;
    name: string;
    color: string;
    desktopUrl: string;
    mobileUrl: string;
    thumbnailUrl: string;
  }>>([]);
  const [loadingBanners, setLoadingBanners] = useState(false);

  const [form, setForm] = useState<OnboardingData>(() => {
    const session = getSession();
    return session.onboarding ?? {
      connectionMethod: "api_key",
      apiKey: "",
      siteId: "",
      storeName: "",
      siteUrl: "",
      email: "",
      whatsapp: "",
      instagram: "",
      city: "",
      state: "",
      focus: "todos",
      featuredTeams: [],
      activePromotion: "Compre 2 Leve 3",
      primaryColor: "#10b981",
      secondaryColor: "#18181b",
      heroBannerColor: "VERMELHO",
      heroBannerId: "",
      heroBannerDesktopUrl: "",
      heroBannerMobileUrl: "",
      heroBannerThumbnailUrl: "",
      siteName: "",
      instanceId: "",
    };
  });

  const update = (partial: Partial<OnboardingData>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  };

  // Salva no session a cada mudança
  useEffect(() => {
    setSession({ onboarding: form });
  }, [form]);

  // Busca config Wix automaticamente do servidor
  useEffect(() => {
    fetch("/api/wix-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.configured && data.apiKey) {
          update({ apiKey: data.apiKey });
          setWixReady(true);
        } else {
          toast.error("Configuração Wix não encontrada no servidor");
        }
      })
      .catch(() => {
        toast.error("Erro ao carregar configuração Wix");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carrega banners do catálogo
  const loadBanners = async () => {
    setLoadingBanners(true);
    try {
      const res = await fetch(`/api/admin/banners?color=${form.heroBannerColor}`);
      const data = await res.json();
      if (Array.isArray(data)) setBanners(data);
    } catch {
      toast.error("Erro ao carregar banners");
    } finally {
      setLoadingBanners(false);
    }
  };

  useEffect(() => {
    if (subStep === "hero-banner") {
      loadBanners();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subStep, form.heroBannerColor]);

  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cmsActive, setCmsActive] = useState(false);

  const checkCms = async () => {
    const siteId = form.siteId || form.instanceId;
    if (!siteId) {
      toast.error("Site não encontrado");
      return;
    }

    setChecking(true);
    try {
      const res = await fetch("/api/wix/check-cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });

      const data = await res.json();
      if (data.active) {
        setCmsActive(true);
        toast.success("CMS ativado com sucesso!");
      } else {
        toast.error("CMS ainda não ativado. Siga os passos acima e tente novamente.");
      }
    } catch {
      toast.error("Erro ao verificar CMS");
    } finally {
      setChecking(false);
    }
  };

  const handleGoToGenerate = () => {
    setSession({ onboarding: form });
    router.push("/generate");
  };

  const handleFinish = async () => {
    if (!form.storeName) {
      toast.error("Preencha o nome da loja");
      return;
    }

    setCreating(true);
    try {
      // Cria o site no Wix automaticamente
      const res = await fetch("/api/wix/create-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: form.storeName,
          email: form.email,
          whatsapp: form.whatsapp,
          instagram: form.instagram,
          city: form.city,
          state: form.state,
          focus: form.focus,
          activePromotion: form.activePromotion,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao criar site");
        return;
      }

      // Atualiza a sessão com os dados do site criado
      const updatedForm = {
        ...form,
        siteId: data.siteId,
        siteUrl: data.siteUrl,
        siteName: form.storeName,
        instanceId: data.metaSiteId,
      };

      setForm(updatedForm);
      setSession({ onboarding: updatedForm, storeId: data.storeId });
      toast.success("Site criado no Wix com sucesso!");
      setSubStep("activate-cms");
    } catch {
      toast.error("Erro ao criar site no Wix");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
            <Shirt className="h-6 w-6 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold">Kit Store Builder</h1>
        </div>

        <StepIndicator steps={FLOW_STEPS} currentStep={0} />

        {/* Wix status badge */}
        <div className="flex justify-center">
          {wixReady ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Wix conectado automaticamente
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-1.5 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Conectando ao Wix...
            </div>
          )}
        </div>

        {/* Sub-step: Store Info */}
        {subStep === "store-info" && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Store className="h-5 w-5 text-emerald-500" />
                Informações da Loja
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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
                  <label className="text-sm font-medium text-zinc-300">Email</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => update({ email: e.target.value })}
                    placeholder="contato@loja.com"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">WhatsApp</label>
                  <Input
                    value={form.whatsapp}
                    onChange={(e) => update({ whatsapp: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Instagram</label>
                  <Input
                    value={form.instagram}
                    onChange={(e) => update({ instagram: e.target.value })}
                    placeholder="@sualoja"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Cidade</label>
                  <Input
                    value={form.city}
                    onChange={(e) => update({ city: e.target.value })}
                    placeholder="São Paulo"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Estado</label>
                  <Select value={form.state} onValueChange={(v) => update({ state: v })}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATE_OPTIONS.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Foco da Loja</label>
                <Select value={form.focus} onValueChange={(v) => update({ focus: v as OnboardingData["focus"] })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOCUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Promoção Ativa</label>
                <Input
                  value={form.activePromotion}
                  onChange={(e) => update({ activePromotion: e.target.value })}
                  placeholder="Compre 2 Leve 3"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setSubStep("branding")}
                  disabled={!form.storeName}
                  className="bg-emerald-500 text-black font-bold"
                >
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sub-step: Branding */}
        {subStep === "branding" && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Palette className="h-5 w-5 text-emerald-500" />
                Cores e Identidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Cor Primária</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={form.primaryColor}
                      onChange={(e) => update({ primaryColor: e.target.value })}
                      className="h-10 w-14 cursor-pointer rounded border border-zinc-700 bg-zinc-800"
                    />
                    <Input
                      value={form.primaryColor}
                      onChange={(e) => update({ primaryColor: e.target.value })}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Cor Secundária</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={form.secondaryColor}
                      onChange={(e) => update({ secondaryColor: e.target.value })}
                      className="h-10 w-14 cursor-pointer rounded border border-zinc-700 bg-zinc-800"
                    />
                    <Input
                      value={form.secondaryColor}
                      onChange={(e) => update({ secondaryColor: e.target.value })}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                </div>
              </div>

              {/* Preview das cores */}
              <div className="flex gap-3 rounded-lg border border-zinc-800 p-4">
                <div
                  className="h-16 w-16 rounded-lg"
                  style={{ backgroundColor: form.primaryColor }}
                />
                <div
                  className="h-16 w-16 rounded-lg"
                  style={{ backgroundColor: form.secondaryColor }}
                />
                <div className="flex flex-col justify-center">
                  <p className="text-sm text-zinc-300">Preview das cores</p>
                  <p className="text-xs text-zinc-500">
                    {form.primaryColor} / {form.secondaryColor}
                  </p>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setSubStep("store-info")} className="border-zinc-700 text-zinc-300">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button onClick={() => setSubStep("hero-banner")} className="bg-emerald-500 text-black font-bold">
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sub-step: Hero Banner */}
        {subStep === "hero-banner" && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <ImageIcon className="h-5 w-5 text-emerald-500" />
                Banner Hero
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Filtrar por cor</label>
                <Select value={form.heroBannerColor} onValueChange={(v) => update({ heroBannerColor: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BANNER_COLOR_OPTIONS.map((color) => (
                      <SelectItem key={color} value={color}>{color}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {loadingBanners ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                </div>
              ) : banners.length === 0 ? (
                <p className="py-8 text-center text-zinc-500">
                  Nenhum banner encontrado para a cor {form.heroBannerColor}
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {banners.map((banner) => (
                    <button
                      key={banner.id}
                      type="button"
                      onClick={() =>
                        update({
                          heroBannerId: banner.id,
                          heroBannerDesktopUrl: banner.desktopUrl,
                          heroBannerMobileUrl: banner.mobileUrl,
                          heroBannerThumbnailUrl: banner.thumbnailUrl,
                        })
                      }
                      className={`overflow-hidden rounded-lg border-2 transition-all ${
                        form.heroBannerId === banner.id
                          ? "border-emerald-500 ring-2 ring-emerald-500/30"
                          : "border-zinc-700 hover:border-zinc-500"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={banner.thumbnailUrl}
                        alt={banner.name}
                        className="aspect-[16/9] w-full object-cover"
                      />
                      <p className="bg-zinc-800 px-3 py-2 text-xs text-zinc-300">
                        {banner.name}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setSubStep("branding")} className="border-zinc-700 text-zinc-300">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={!form.storeName || creating}
                  className="bg-emerald-500 text-black font-bold"
                >
                  {creating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando site no Wix...</>
                  ) : (
                    <>Gerar Conteúdo <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Sub-step: Activate CMS */}
        {subStep === "activate-cms" && (
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
                  Para que o builder consiga montar sua loja automaticamente, precisamos que você ative o CMS no editor do Wix. São apenas <strong>3 cliques</strong>:
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-black">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-white">Abra o editor do seu site</p>
                    <p className="text-sm text-zinc-400 mt-1">Clique no botão abaixo para abrir o editor</p>
                    <a
                      href={`https://manage.wix.com/dashboard/${form.siteId || form.instanceId}/home`}
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
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-black">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-white">Clique em &quot;CMS&quot; no painel lateral</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      No editor, procure o icone de CMS no menu lateral esquerdo (parece uma tabela). Clique nele e depois em <strong>&quot;Comece adicionando conteudo&quot;</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-black">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-white">Crie uma colecao qualquer e publique</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      Selecione <strong>&quot;Comecar do zero&quot;</strong>, de qualquer nome e clique em criar. Depois clique em <strong>&quot;Publicar&quot;</strong> no canto superior direito do editor.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4 space-y-3">
                <p className="text-sm text-zinc-400 text-center">
                  Depois de publicar, clique no botao abaixo para verificar:
                </p>

                {cmsActive ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      CMS ativado com sucesso!
                    </div>
                    <Button
                      onClick={handleGoToGenerate}
                      className="w-full bg-emerald-500 text-black font-bold hover:bg-emerald-400"
                    >
                      Continuar: Gerar Conteudo <ArrowRight className="ml-2 h-4 w-4" />
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
                      <><RefreshCw className="mr-2 h-4 w-4" /> Verificar Ativacao</>
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

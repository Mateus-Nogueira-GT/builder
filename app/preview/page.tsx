"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StepIndicator } from "@/components/StepIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/session";
import type { StoreContent, OnboardingData, SessionImages } from "@/lib/schemas";
import {
  Shirt,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Eye,
  Star,
  MessageCircle,
  Shield,
  Truck,
  CreditCard,
} from "lucide-react";

const FLOW_STEPS = [
  { label: "Dados da Loja" },
  { label: "Conteúdo" },
  { label: "Imagens" },
  { label: "Preview" },
  { label: "Publicar" },
  { label: "Dashboard" },
];

const TRUST_ICONS: Record<string, React.ReactNode> = {
  shield: <Shield className="h-4 w-4" />,
  truck: <Truck className="h-4 w-4" />,
  creditcard: <CreditCard className="h-4 w-4" />,
  message: <MessageCircle className="h-4 w-4" />,
};

export default function PreviewPage() {
  const router = useRouter();
  const [content, setContent] = useState<StoreContent | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [images, setImages] = useState<SessionImages>({});
  const [storeId, setStoreId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session.content) {
      toast.error("Gere o conteúdo primeiro");
      router.push("/generate");
      return;
    }
    setContent(session.content);
    setOnboarding(session.onboarding ?? null);
    setImages(session.images ?? {});
    setStoreId(session.storeId ?? null);
  }, [router]);

  const handlePublish = async () => {
    if (!content || !onboarding) return;

    setPublishing(true);
    try {
      const payload = {
        ...content,
        onboarding,
        images,
      };

      const res = await fetch("/api/inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload,
          storeId: storeId ?? undefined,
          apiKey: onboarding.apiKey,
          siteId: onboarding.siteId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao iniciar publicação");

      router.push(`/publishing?jobId=${data.jobId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao publicar");
      setPublishing(false);
    }
  };

  if (!content || !onboarding) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
            <Shirt className="h-6 w-6 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold">Kit Store Builder</h1>
        </div>

        <StepIndicator steps={FLOW_STEPS} currentStep={3} />

        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-emerald-500" />
          <h2 className="text-xl font-bold">Preview da Loja</h2>
        </div>

        {/* Simulated preview */}
        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          {/* Topbar */}
          <div
            className="px-4 py-2 text-center text-sm font-medium"
            style={{ backgroundColor: onboarding.primaryColor, color: "#000" }}
          >
            {content.topbar}
          </div>

          {/* Hero Banner */}
          {onboarding.heroBannerDesktopUrl && (
            <div className="relative aspect-[21/9] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={onboarding.heroBannerDesktopUrl}
                alt="Hero"
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* Trust Bar */}
          <div className="flex justify-center gap-6 px-4 py-3 border-b border-zinc-800">
            {content.trustBar.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                {TRUST_ICONS[item.icon.toLowerCase()] ?? <Shield className="h-4 w-4" />}
                {item.text}
              </div>
            ))}
          </div>

          {/* Promo Banner */}
          <div className="relative mx-4 overflow-hidden rounded-xl">
            {images.promoBanner && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images.promoBanner} alt="Promo" className="aspect-[21/7] w-full object-cover" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white">{content.promoBanner.title}</h3>
                <p className="text-zinc-200">{content.promoBanner.subtitle}</p>
                <button className="mt-3 rounded-lg bg-emerald-500 px-6 py-2 text-sm font-bold text-black">
                  {content.promoBanner.ctaLabel}
                </button>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="px-4 py-4">
            <h3 className="mb-3 text-lg font-bold text-white">Categorias</h3>
            <div className="grid grid-cols-4 gap-3">
              {content.categories.map((cat, i) => (
                <div key={i} className="rounded-lg bg-zinc-800 p-3 text-center">
                  <p className="text-sm font-medium text-zinc-300">{cat.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials */}
          <div className="px-4 py-4">
            <h3 className="mb-3 text-lg font-bold text-white">Depoimentos</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {content.testimonials.slice(0, 2).map((test, i) => (
                <Card key={i} className="border-zinc-700 bg-zinc-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      {images[`testimonial${i + 1}` as keyof SessionImages] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={images[`testimonial${i + 1}` as keyof SessionImages]}
                          alt={test.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-white">{test.name}</p>
                        <p className="text-xs text-zinc-400">{test.city}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 mb-2">
                      {Array.from({ length: test.rating }).map((_, s) => (
                        <Star key={s} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-xs text-zinc-300">{test.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Footer preview */}
          <div className="border-t border-zinc-800 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-emerald-400">{content.footer.tagline}</p>
            <p className="mt-1 text-xs text-zinc-500 max-w-md mx-auto">{content.footer.aboutText}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => router.push("/hero-image")}
            className="border-zinc-700 text-zinc-300"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <Button
            onClick={handlePublish}
            disabled={publishing}
            className="bg-emerald-500 text-black font-bold hover:bg-emerald-400"
          >
            {publishing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publicando...</>
            ) : (
              <>Publicar Loja <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// app/preview/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getSession, setSession } from "@/lib/session";
import type { StoreContent, OnboardingData, SessionImages } from "@/lib/schemas";
import { PreviewToolbar } from "@/components/PreviewToolbar";
import { PreviewCanvas } from "@/components/PreviewCanvas";
import { PreviewEditPanel } from "@/components/PreviewEditPanel";
import { Loader2 } from "lucide-react";

type ViewMode = "desktop" | "mobile";

export default function PreviewPage() {
  const router = useRouter();
  const [content, setContent] = useState<StoreContent | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [images, setImages] = useState<SessionImages>({});
  const [storeId, setStoreId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");

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

  const updateField = useCallback(
    (section: string, key: string, value: string) => {
      setContent((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };

        if (section === "topbar") {
          updated.topbar = value;
        } else if (section === "whatsapp") {
          updated.whatsappGreeting = value;
        } else if (section.startsWith("trust-")) {
          const idx = parseInt(section.split("-")[1]);
          updated.trustBar = [...updated.trustBar];
          updated.trustBar[idx] = { ...updated.trustBar[idx], [key]: value };
        } else if (section === "promo") {
          updated.promoBanner = { ...updated.promoBanner, [key]: value };
        } else if (section.startsWith("category-")) {
          const idx = parseInt(section.split("-")[1]);
          updated.categories = [...updated.categories];
          updated.categories[idx] = { ...updated.categories[idx], [key]: value };
        }

        setSession({ content: updated });
        return updated;
      });
    },
    []
  );

  const handleColorChange = useCallback(
    (field: "primaryColor" | "secondaryColor", value: string) => {
      setOnboarding((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, [field]: value };
        setSession({ onboarding: updated });
        return updated;
      });
    },
    []
  );

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
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      <PreviewToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        primaryColor={onboarding.primaryColor}
        secondaryColor={onboarding.secondaryColor}
        onPrimaryColorChange={(c) => handleColorChange("primaryColor", c)}
        onSecondaryColorChange={(c) => handleColorChange("secondaryColor", c)}
        onPublish={handlePublish}
        onBack={() => router.push("/hero-image")}
        publishing={publishing}
      />

      <div className="flex flex-1 min-h-0">
        <PreviewCanvas
          content={content}
          onboarding={onboarding}
          images={images}
          viewMode={viewMode}
        />

        <PreviewEditPanel content={content} onUpdateField={updateField} />
      </div>
    </div>
  );
}

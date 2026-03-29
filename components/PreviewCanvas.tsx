// components/PreviewCanvas.tsx
"use client";

import { cn } from "@/lib/utils";
import type { StoreContent, OnboardingData, SessionImages } from "@/lib/schemas";
import { Shield, Truck, CreditCard, MessageCircle } from "lucide-react";

type ViewMode = "desktop" | "mobile";

interface PreviewCanvasProps {
  content: StoreContent;
  onboarding: OnboardingData;
  images: SessionImages;
  viewMode: ViewMode;
}

const TRUST_ICONS: Record<string, React.ReactNode> = {
  shield: <Shield className="h-4 w-4" />,
  truck: <Truck className="h-4 w-4" />,
  creditcard: <CreditCard className="h-4 w-4" />,
  message: <MessageCircle className="h-4 w-4" />,
};

export function PreviewCanvas({
  content,
  onboarding,
  images,
  viewMode,
}: PreviewCanvasProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-6">
      <div
        className={cn(
          "mx-auto rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden transition-all duration-300",
          viewMode === "mobile" && "max-w-[375px] shadow-lg shadow-black/50"
        )}
      >
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
        <div
          className={cn(
            "flex justify-center gap-6 px-4 py-3 border-b border-zinc-800",
            viewMode === "mobile" && "flex-col items-center gap-2"
          )}
        >
          {content.trustBar.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-zinc-300">
              {TRUST_ICONS[item.icon.toLowerCase()] ?? (
                <Shield className="h-4 w-4" />
              )}
              {item.text}
            </div>
          ))}
        </div>

        {/* Promo Banner */}
        <div className="relative mx-4 my-4 overflow-hidden rounded-xl">
          {images.promoBanner && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={images.promoBanner}
              alt="Promo"
              className="aspect-[21/7] w-full object-cover"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center px-4">
              <h3
                className={cn(
                  "font-bold text-white",
                  viewMode === "mobile" ? "text-lg" : "text-2xl"
                )}
              >
                {content.promoBanner.title}
              </h3>
              <p className="text-zinc-200 text-sm">{content.promoBanner.subtitle}</p>
              <button
                className="mt-3 rounded-lg px-6 py-2 text-sm font-bold text-black"
                style={{ backgroundColor: onboarding.primaryColor }}
              >
                {content.promoBanner.ctaLabel}
              </button>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 py-4">
          <h3 className="mb-3 text-lg font-bold text-white">Categorias</h3>
          <div
            className={cn(
              "grid gap-3",
              viewMode === "mobile" ? "grid-cols-2" : "grid-cols-4"
            )}
          >
            {content.categories.map((cat, i) => (
              <div key={i} className="rounded-lg bg-zinc-800 p-3 text-center">
                <p className="text-sm font-medium text-zinc-300">{cat.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

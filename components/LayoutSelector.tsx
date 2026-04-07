"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type LayoutType = "classic" | "modern";

interface LayoutSelectorProps {
  selected: LayoutType;
  onSelect: (layout: LayoutType) => void;
  primaryColor: string;
}

function ClassicMockup({ primaryColor }: { primaryColor: string }) {
  return (
    <div className="rounded-md border border-zinc-700 overflow-hidden text-[8px]">
      <div className="py-1 text-center text-black font-bold" style={{ backgroundColor: primaryColor }}>TOPBAR</div>
      <div className="h-14 bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-zinc-500">Hero Banner</div>
      <div className="flex justify-center gap-2 py-1.5 bg-zinc-900">
        <div className="h-1 w-8 rounded bg-zinc-700" />
        <div className="h-1 w-8 rounded bg-zinc-700" />
        <div className="h-1 w-8 rounded bg-zinc-700" />
      </div>
      <div className="grid grid-cols-4 gap-1 p-1.5">
        {[1,2,3,4].map(i => <div key={i} className="h-6 rounded bg-zinc-800" />)}
      </div>
      <div className="mx-1.5 mb-1.5 h-8 rounded bg-zinc-800 flex items-center justify-center">
        <div className="text-zinc-500">Promo</div>
      </div>
    </div>
  );
}

function ModernMockup({ primaryColor }: { primaryColor: string }) {
  return (
    <div className="rounded-md border border-zinc-700 overflow-hidden text-[8px]">
      <div className="relative h-24 bg-gradient-to-b from-zinc-700 to-zinc-900 flex flex-col items-center justify-center">
        <div className="text-zinc-400 font-bold text-[10px]">HERO</div>
        <div className="text-zinc-600 text-[7px]">fullscreen + overlay</div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3/4 rounded-lg border border-zinc-600 bg-zinc-800 p-1.5 text-center shadow-lg">
          <div className="text-zinc-400">Promo Card</div>
        </div>
      </div>
      <div className="pt-6 pb-2 px-2">
        <div className="flex gap-1.5 overflow-hidden">
          {[1,2,3].map(i => <div key={i} className="h-8 w-14 shrink-0 rounded-lg bg-zinc-800" />)}
        </div>
      </div>
      <div className="flex justify-center gap-3 py-1.5">
        {[1,2,3].map(i => <div key={i} className="h-3 w-3 rounded-full" style={{ backgroundColor: primaryColor, opacity: 0.5 }} />)}
      </div>
    </div>
  );
}

export function LayoutSelector({ selected, onSelect, primaryColor }: LayoutSelectorProps) {
  const layouts: { type: LayoutType; label: string; description: string; Mockup: typeof ClassicMockup }[] = [
    { type: "classic", label: "Clássico", description: "Hero grande, grid de categorias, banner promo", Mockup: ClassicMockup },
    { type: "modern", label: "Moderno", description: "Hero fullscreen, carrossel, card flutuante", Mockup: ModernMockup },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {layouts.map(({ type, label, description, Mockup }) => {
        const isSelected = selected === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            className={cn(
              "relative rounded-xl border-2 p-4 text-left transition-all",
              isSelected
                ? "border-emerald-500 ring-2 ring-emerald-500/30 bg-zinc-900/50"
                : "border-zinc-800 hover:border-zinc-600 bg-zinc-900/30"
            )}
          >
            {isSelected && (
              <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
                <Check className="h-3.5 w-3.5 text-black" />
              </div>
            )}
            <Mockup primaryColor={primaryColor} />
            <div className="mt-3">
              <p className="text-sm font-bold text-white">{label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

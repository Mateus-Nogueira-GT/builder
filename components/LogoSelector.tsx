"use client";

import { generateLogo, LOGO_VARIANTS, type LogoVariant } from "@/lib/logoTemplates";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface LogoSelectorProps {
  storeName: string;
  primaryColor: string;
  accentColor: string;
  selected: LogoVariant | null;
  onSelect: (variant: LogoVariant, svg: string) => void;
}

export function LogoSelector({ storeName, primaryColor, accentColor, selected, onSelect }: LogoSelectorProps) {
  const name = storeName || "Sua Loja";

  return (
    <div className="grid grid-cols-2 gap-4">
      {LOGO_VARIANTS.map(({ variant, label }) => {
        const svg = generateLogo(variant, name, primaryColor, accentColor);
        const isSelected = selected === variant;

        return (
          <button
            key={variant}
            type="button"
            onClick={() => onSelect(variant, svg)}
            className={cn(
              "relative rounded-xl border-2 p-4 text-left transition-all",
              isSelected
                ? "border-emerald-500 ring-2 ring-emerald-500/30"
                : "border-zinc-800 hover:border-zinc-600"
            )}
          >
            {isSelected && (
              <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
                <Check className="h-3.5 w-3.5 text-black" />
              </div>
            )}
            <div className="rounded-lg bg-zinc-900 p-4 flex items-center justify-center">
              <div className="w-40 h-16" dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
            <div className="rounded-lg bg-zinc-100 p-4 mt-2 flex items-center justify-center">
              <div className="w-40 h-16" dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
            <p className="text-xs font-medium text-zinc-400 mt-2 text-center">{label}</p>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useState } from "react";
import { PALETTES, type Palette } from "@/lib/palettes";
import { cn } from "@/lib/utils";
import { Check, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaletteSelectorProps {
  storeName: string;
  selectedPalette: Palette;
  onSelect: (palette: Palette) => void;
}

export function PaletteSelector({ storeName, selectedPalette, onSelect }: PaletteSelectorProps) {
  const [customMode, setCustomMode] = useState(false);
  const [customPalette, setCustomPalette] = useState<Palette>({ ...selectedPalette, name: "Personalizada" });

  const handleCustomChange = (field: keyof Omit<Palette, "name">, value: string) => {
    const updated = { ...customPalette, [field]: value };
    setCustomPalette(updated);
    onSelect(updated);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {PALETTES.map((palette) => {
          const isSelected = !customMode && selectedPalette.name === palette.name;
          return (
            <button
              key={palette.name}
              type="button"
              onClick={() => { setCustomMode(false); onSelect(palette); }}
              className={cn(
                "relative rounded-lg border-2 p-3 transition-all text-left",
                isSelected
                  ? "border-emerald-500 ring-2 ring-emerald-500/30"
                  : "border-zinc-800 hover:border-zinc-600"
              )}
            >
              {isSelected && (
                <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                  <Check className="h-3 w-3 text-black" />
                </div>
              )}
              <div className="flex gap-1 mb-2">
                <div className="h-6 flex-1 rounded-sm" style={{ backgroundColor: palette.primary }} />
                <div className="h-6 flex-1 rounded-sm" style={{ backgroundColor: palette.secondary }} />
                <div className="h-6 flex-1 rounded-sm" style={{ backgroundColor: palette.accent }} />
              </div>
              <p className="text-xs font-medium text-zinc-400">{palette.name}</p>
            </button>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setCustomMode(!customMode);
          if (!customMode) {
            setCustomPalette({ ...selectedPalette, name: "Personalizada" });
            onSelect({ ...selectedPalette, name: "Personalizada" });
          }
        }}
        className={cn(
          "border-zinc-700 text-zinc-300",
          customMode && "border-emerald-500 text-emerald-400"
        )}
      >
        <Sliders className="mr-2 h-4 w-4" /> Personalizar cores
      </Button>

      {customMode && (
        <div className="grid grid-cols-3 gap-4 rounded-lg border border-zinc-800 p-4">
          {(["primary", "secondary", "accent"] as const).map((field) => (
            <div key={field} className="space-y-1">
              <label className="text-xs font-medium text-zinc-400 capitalize">{field === "primary" ? "Primária" : field === "secondary" ? "Secundária" : "Accent"}</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={customPalette[field]}
                  onChange={(e) => handleCustomChange(field, e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-zinc-700 bg-zinc-800"
                />
                <span className="flex items-center text-xs text-zinc-500">{customPalette[field]}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-zinc-800 p-4 space-y-2">
        <p className="text-xs text-zinc-500 mb-2">Preview</p>
        <div className="rounded-md px-3 py-1.5 text-center text-xs font-medium text-black" style={{ backgroundColor: selectedPalette.primary }}>
          {storeName || "Sua Loja"} — Frete grátis acima de R$199
        </div>
        <div className="flex gap-2">
          <div className="flex-1 rounded-md p-3" style={{ backgroundColor: selectedPalette.secondary }}>
            <div className="h-2 w-16 rounded bg-white/20" />
          </div>
          <button className="rounded-md px-4 py-2 text-xs font-bold text-black" style={{ backgroundColor: selectedPalette.accent }}>
            Ver Ofertas
          </button>
        </div>
      </div>
    </div>
  );
}

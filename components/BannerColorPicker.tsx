"use client";

import { type Palette, generateBannerSuggestions, type BannerColorSuggestion } from "@/lib/palettes";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface BannerColors {
  bgColor: string;
  textColor: string;
  ctaColor: string;
}

interface BannerColorPickerProps {
  palette: Palette;
  colors: BannerColors;
  onChange: (colors: BannerColors) => void;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-zinc-700 bg-zinc-800"
        />
        <span className="text-xs text-zinc-500 font-mono">{value}</span>
      </div>
    </div>
  );
}

export function BannerColorPicker({ palette, colors, onChange }: BannerColorPickerProps) {
  const suggestions = generateBannerSuggestions(palette);

  const isSuggestionSelected = (s: BannerColorSuggestion) =>
    s.bgColor === colors.bgColor && s.textColor === colors.textColor && s.ctaColor === colors.ctaColor;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-400">Sugestões rápidas</p>
        <div className="flex gap-2">
          {suggestions.map((s, i) => {
            const selected = isSuggestionSelected(s);
            return (
              <button
                key={i}
                type="button"
                onClick={() => onChange({ bgColor: s.bgColor, textColor: s.textColor, ctaColor: s.ctaColor })}
                className={cn(
                  "relative flex-1 rounded-lg border-2 p-2 transition-all",
                  selected ? "border-emerald-500" : "border-zinc-800 hover:border-zinc-600"
                )}
              >
                {selected && (
                  <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                    <Check className="h-2.5 w-2.5 text-black" />
                  </div>
                )}
                <div className="h-8 rounded" style={{ backgroundColor: s.bgColor }}>
                  <div className="flex h-full items-center justify-center gap-1">
                    <span className="text-[7px] font-bold" style={{ color: s.textColor }}>Texto</span>
                    <span className="rounded px-1 text-[6px] font-bold text-black" style={{ backgroundColor: s.ctaColor }}>CTA</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <ColorField label="Cor de fundo" value={colors.bgColor} onChange={(v) => onChange({ ...colors, bgColor: v })} />
        <ColorField label="Cor do texto" value={colors.textColor} onChange={(v) => onChange({ ...colors, textColor: v })} />
        <ColorField label="Cor do botão CTA" value={colors.ctaColor} onChange={(v) => onChange({ ...colors, ctaColor: v })} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-400">Preview do banner</p>
        <div className="rounded-xl p-6 text-center" style={{ backgroundColor: colors.bgColor }}>
          <h3 className="text-lg font-bold" style={{ color: colors.textColor }}>Promoção Especial</h3>
          <p className="text-sm mt-1" style={{ color: colors.textColor, opacity: 0.7 }}>Aproveite as ofertas</p>
          <button className="mt-3 rounded-lg px-5 py-2 text-sm font-bold text-black" style={{ backgroundColor: colors.ctaColor }}>
            Ver Ofertas
          </button>
        </div>
      </div>
    </div>
  );
}

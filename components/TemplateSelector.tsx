"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface TemplateOption {
  id: string;
  siteId: string;
  name: string;
  previewUrl: string;
}

export const TEMPLATES: TemplateOption[] = [
  {
    id: "template-1",
    siteId: "c208eaf8-8ed3-4ad2-947a-db65813006c2",
    name: "Modelo 01",
    previewUrl: "/templates/template-01.jpeg",
  },
  {
    id: "template-2",
    siteId: "962b66f7-c9d1-4ba7-be05-354465e71d40",
    name: "Modelo 02",
    previewUrl: "/templates/template-02.jpeg",
  },
];

interface TemplateSelectorProps {
  selected: string | null;
  onSelect: (template: TemplateOption) => void;
}

export function TemplateSelector({ selected, onSelect }: TemplateSelectorProps) {
  return (
    <div className="grid gap-4">
      {TEMPLATES.map((template) => {
        const isSelected = selected === template.siteId;
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            className={cn(
              "relative rounded-xl border-2 overflow-hidden text-left transition-all",
              isSelected
                ? "border-emerald-500 ring-2 ring-emerald-500/30"
                : "border-zinc-800 hover:border-zinc-600"
            )}
          >
            {isSelected && (
              <div className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 shadow-lg">
                <Check className="h-4 w-4 text-black" />
              </div>
            )}
            <div className="relative w-full overflow-hidden bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={template.previewUrl}
                alt={template.name}
                className="w-full h-auto object-cover"
                loading="lazy"
              />
            </div>
            <div className="px-4 py-3 bg-zinc-900 border-t border-zinc-800">
              <p className="text-sm font-semibold text-white">{template.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Clique para visualizar</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

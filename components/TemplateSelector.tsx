"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface TemplateOption {
  id: string;
  installUrl: string;
  name: string;
  previewUrl: string;
}

export const TEMPLATES: TemplateOption[] = [
  {
    id: "template-1",
    installUrl:
      "https://manage.wix.com/marketplace/redemption?id=eyJpdiI6IjVlNDJkYzQ0NTMyZTQ0MDc3NDFlNTYxYzIzNmNiOTllIiwiZW5jcnlwdGVkRGF0YSI6ImEwNzE1ZDU4YzQ3NzFmMzFkYjc0NGU0YWFlZDU4Nzk4OWYyNmVlZWYzYzQ4MWMyYTEyZGQyNzQ4ZTRhYmZlZjFhNzBhNDEwMTQ1M2FjYmQ0NjQ3ZWVmYmU1YTU0OTU1ZjcwMjBkNGQzZjhjODY3OGNmZmJjZjY2MDUyYzE2YTQ5MDIyYWFiYjBmMTQ4YTFmNDc3MzA4OTEzMjIzYTkxZGU3NGEzZDQ4NDg1OWY5MGU4NDM2YzdkMjliZjY2NjQ5ZTAwM2IzM2ZkYWMxZWZhNzUzOTNiZmQ4YWY0ODg0N2E1NWVhYTU3NGNlOGM1N2I1YmZiMzlmMzZkNTFmNTRlNTdmZTMzOWQxMjE3NWFjZmVhZTgxNTA0YmQ5MmUwZGZiOCJ9",
    name: "Modelo 01",
    previewUrl: "/templates/template-01.jpeg",
  },
  {
    id: "template-2",
    installUrl:
      "https://manage.wix.com/marketplace/redemption?id=eyJpdiI6ImViYmZmNmZkZDQ0OGNmY2NhZDQyNjMyMTA5OTBkNTI2IiwiZW5jcnlwdGVkRGF0YSI6IjIwNzk5NmYxODQxYWFiMWJhMDQzMDZkOGQ3OWY4MjRjYWVmMjI4ODc2ZWNlMjUwNDQwNWQ0N2RiZDc2YzRhODFkZTI3ODcwYjc1MTIzNjE0M2I4OWY1ZGI4N2QwZGE4MTg2M2QzNWFhNzY2M2RkZTNmZjNhY2ZhMmNhY2M5NmNlNTUxZmUyYzJhMGExNmRhMzIxZjY1Yjg4NjE2OTgyZjVjYTIyYjBkNTQ3NTM0MDM4MjE1YmNmZTkzN2NhYjU5MGJlY2RhMDIxY2I5MmY1NmIzYTc2ZTJkNTE2ZTM3MGQxODRlZTBmMDdjN2MwYmMyODA5MTA0NmUyMDE2YzZlZTc5YTgyNDY5NGUyZWY4NDg5ZmNhNDIyMzUxYzVhOTNiNSJ9",
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
    <div className="grid grid-cols-2 gap-4">
      {TEMPLATES.map((template) => {
        const isSelected = selected === template.id;
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
            <div className="relative w-full h-[280px] overflow-hidden bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={template.previewUrl}
                alt={template.name}
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
            </div>
            <div className="px-4 py-3 bg-zinc-900 border-t border-zinc-800">
              <p className="text-sm font-semibold text-white">{template.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Clique para selecionar</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

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
      "https://manage.wix.com/marketplace/redemption?id=eyJpdiI6IjE2NWI1NTllZDg2YTVkNzVhZWVkMzY2MWYyMGVmOWYyIiwiZW5jcnlwdGVkRGF0YSI6ImIzZTY1MGY3MzNjMjFlNDUxMzM4NTQ0NTRmZmEwZmQzMmIwYWRiODI3MTYzMDk2OTNlNjBlMWJmYzQ5M2IyMGFlYTM2YzhmN2I0OGQ2ODMxNWJiMzZhMjk1MTRhNmRjMDc0ZGY0MmM2ZTVkMDNjMDNmNDg3YjFiMjU2NTliMTMwNTY1ZjMxNjEwZjA5YzA3OWJjNzM3MTcxOWJlMjM4NGU5NGYzM2E3MjAyYTI1NTlkZTQ0YThmNWNhNzQ4MGUwOTE5MWRmMzYxNWQwMjlmNmEwMmIxZTEzNDNlMTA1MjcxZmUwNTRlODEzOTQzNjFmMjAzZmRiNzBmY2VlOTUxOTcwOTVmYjM2OThkNjk4MmUyZDdjNmNlMzdmYTJlMWMwNCJ9",
    name: "Modelo 01",
    previewUrl: "/templates/template-01.jpeg",
  },
  {
    id: "template-2",
    installUrl:
      "https://manage.wix.com/marketplace/redemption?id=eyJpdiI6IjBkMDg5M2UwZTEwYWMwMTc4NzcyMTAyZGE4YTI4ZjEwIiwiZW5jcnlwdGVkRGF0YSI6ImQzOGNlMTQxNTU4NDEzMzcyNWQ4YTgyZTI5OTNlY2MwNWM0YmNhZWUzMTU2MjFkMzVlNDYyODIyODg5Y2MxYzk5MjdjNzVjMzcxZmVkMmNiOTNiYjhmMGI0NzA3M2NmNWE1ZTBjZDQyMzVjYTYyZjJhYTk4ZTRiNTY0MmYxOWE1Y2QxNTI5YWM2OTM5ODMwMjc5Yzk5MWVjNTNmZDc4OTkyYzhjMGNmZmE3N2U4MTE0NmE2NGFmNTEyYjkwNjdiZGFhMjUwY2RjNWI3OTdlYTQ1OTU0ZWVmYWVhMzQyYTJlM2RhODQ1ZWM0YmE1ZmFlNTg2NmU2MjJlMDhhNzEyNDNiNjczMjQyMDE0NDNjNjE3MDkzNzliNjRhMGRhOTQ1NiJ9",
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

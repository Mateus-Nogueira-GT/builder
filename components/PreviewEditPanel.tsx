// components/PreviewEditPanel.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { AccordionSection } from "@/components/AccordionSection";
import type { StoreContent } from "@/lib/schemas";
import {
  Megaphone,
  MessageCircle,
  Shield,
  Tag,
  FolderOpen,
} from "lucide-react";

interface PreviewEditPanelProps {
  content: StoreContent;
  onUpdateField: (section: string, key: string, value: string) => void;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
      {children}
    </label>
  );
}

export function PreviewEditPanel({
  content,
  onUpdateField,
}: PreviewEditPanelProps) {
  const [openSection, setOpenSection] = useState<string | null>("topbar");

  const toggle = (section: string) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  return (
    <div className="w-80 shrink-0 border-l border-zinc-800 bg-zinc-900/50 overflow-y-auto">
      <div className="p-4 space-y-2">
        <h3 className="text-sm font-bold text-emerald-500 mb-3">
          Editar Conteúdo
        </h3>

        {/* Topbar */}
        <AccordionSection
          title="Topbar"
          icon={<Megaphone className="h-4 w-4" />}
          isOpen={openSection === "topbar"}
          onToggle={() => toggle("topbar")}
        >
          <div className="space-y-1">
            <FieldLabel>Texto promocional</FieldLabel>
            <Input
              value={content.topbar}
              onChange={(e) => onUpdateField("topbar", "topbar", e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
            />
          </div>
        </AccordionSection>

        {/* WhatsApp */}
        <AccordionSection
          title="WhatsApp"
          icon={<MessageCircle className="h-4 w-4" />}
          isOpen={openSection === "whatsapp"}
          onToggle={() => toggle("whatsapp")}
        >
          <div className="space-y-1">
            <FieldLabel>Mensagem de saudação</FieldLabel>
            <Input
              value={content.whatsappGreeting}
              onChange={(e) =>
                onUpdateField("whatsapp", "whatsappGreeting", e.target.value)
              }
              className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
            />
          </div>
        </AccordionSection>

        {/* Trust Bar */}
        <AccordionSection
          title="Trust Bar"
          icon={<Shield className="h-4 w-4" />}
          isOpen={openSection === "trustbar"}
          onToggle={() => toggle("trustbar")}
        >
          {content.trustBar.map((item, i) => (
            <div key={i} className="space-y-2">
              <FieldLabel>Item {i + 1} — Ícone</FieldLabel>
              <Input
                value={item.icon}
                onChange={(e) =>
                  onUpdateField(`trust-${i}`, "icon", e.target.value)
                }
                className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
              />
              <FieldLabel>Item {i + 1} — Texto</FieldLabel>
              <Input
                value={item.text}
                onChange={(e) =>
                  onUpdateField(`trust-${i}`, "text", e.target.value)
                }
                className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
              />
            </div>
          ))}
        </AccordionSection>

        {/* Promo Banner */}
        <AccordionSection
          title="Promo Banner"
          icon={<Tag className="h-4 w-4" />}
          isOpen={openSection === "promo"}
          onToggle={() => toggle("promo")}
        >
          <div className="space-y-1">
            <FieldLabel>Título</FieldLabel>
            <Input
              value={content.promoBanner.title}
              onChange={(e) =>
                onUpdateField("promo", "title", e.target.value)
              }
              className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
            />
          </div>
          <div className="space-y-1">
            <FieldLabel>Subtítulo</FieldLabel>
            <Input
              value={content.promoBanner.subtitle}
              onChange={(e) =>
                onUpdateField("promo", "subtitle", e.target.value)
              }
              className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
            />
          </div>
          <div className="space-y-1">
            <FieldLabel>Texto do botão</FieldLabel>
            <Input
              value={content.promoBanner.ctaLabel}
              onChange={(e) =>
                onUpdateField("promo", "ctaLabel", e.target.value)
              }
              className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
            />
          </div>
          <div className="space-y-1">
            <FieldLabel>Link do botão</FieldLabel>
            <Input
              value={content.promoBanner.ctaLink}
              onChange={(e) =>
                onUpdateField("promo", "ctaLink", e.target.value)
              }
              className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
            />
          </div>
        </AccordionSection>

        {/* Categories */}
        <AccordionSection
          title="Categorias"
          icon={<FolderOpen className="h-4 w-4" />}
          isOpen={openSection === "categories"}
          onToggle={() => toggle("categories")}
        >
          {content.categories.map((cat, i) => (
            <div key={i} className="space-y-1">
              <FieldLabel>Categoria {i + 1}</FieldLabel>
              <Input
                value={cat.name}
                onChange={(e) =>
                  onUpdateField(`category-${i}`, "name", e.target.value)
                }
                className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
              />
            </div>
          ))}
        </AccordionSection>
      </div>
    </div>
  );
}

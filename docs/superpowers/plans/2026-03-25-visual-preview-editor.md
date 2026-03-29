# Visual Preview Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `/preview` page with an interactive visual editor featuring a live preview, a right-side editing panel with accordion sections, a toolbar with desktop/mobile toggle and color pickers, and inline publish functionality.

**Architecture:** Split-pane layout — toolbar on top, live preview canvas on the left, editing accordion panel on the right. All state lives in React state synced to sessionStorage via the existing `setSession()` helper. The publish flow is unchanged.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Lucide icons, existing UI components (`Button`, `Input`), existing `lib/session.ts` and `lib/schemas.ts`.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `components/AccordionSection.tsx` | Create | Reusable collapsible section with smooth height animation |
| `components/PreviewToolbar.tsx` | Create | Top toolbar: device toggle, color pickers, back/publish buttons |
| `components/PreviewCanvas.tsx` | Create | Live preview renderer showing store sections with real-time updates |
| `components/PreviewEditPanel.tsx` | Create | Right-side panel with 5 accordion sections for editing content |
| `app/preview/page.tsx` | Rewrite | Orchestrator: loads session, manages state, composes the 3 components above |

---

### Task 1: AccordionSection Component

**Files:**
- Create: `components/AccordionSection.tsx`

- [ ] **Step 1: Create the AccordionSection component**

```tsx
// components/AccordionSection.tsx
"use client";

import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface AccordionSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function AccordionSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: AccordionSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [children, isOpen]);

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-zinc-900 px-4 py-3 text-left hover:bg-zinc-800/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-emerald-500">{icon}</span>
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        <ChevronRight
          className={cn(
            "h-4 w-4 text-zinc-500 transition-transform duration-200",
            isOpen && "rotate-90"
          )}
        />
      </button>
      <div
        className="transition-[max-height] duration-200 ease-in-out overflow-hidden"
        style={{ maxHeight: isOpen ? `${height}px` : "0px" }}
      >
        <div ref={contentRef} className="bg-zinc-950 px-4 py-3 space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file was created and has no syntax errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to `AccordionSection.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/AccordionSection.tsx
git commit -m "feat: add AccordionSection reusable collapsible component"
```

---

### Task 2: PreviewToolbar Component

**Files:**
- Create: `components/PreviewToolbar.tsx`

- [ ] **Step 1: Create the PreviewToolbar component**

```tsx
// components/PreviewToolbar.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Monitor,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "desktop" | "mobile";

interface PreviewToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  primaryColor: string;
  secondaryColor: string;
  onPrimaryColorChange: (color: string) => void;
  onSecondaryColorChange: (color: string) => void;
  onPublish: () => void;
  onBack: () => void;
  publishing: boolean;
}

export function PreviewToolbar({
  viewMode,
  onViewModeChange,
  primaryColor,
  secondaryColor,
  onPrimaryColorChange,
  onSecondaryColorChange,
  onPublish,
  onBack,
  publishing,
}: PreviewToolbarProps) {
  return (
    <div className="flex items-center justify-between bg-zinc-900 border-b border-zinc-800 px-4 py-3">
      {/* Left: Back + Device toggle */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>

        <div className="flex items-center bg-zinc-800 rounded-lg p-1">
          <button
            type="button"
            onClick={() => onViewModeChange("desktop")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "desktop"
                ? "bg-emerald-500 text-black"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Monitor className="h-3.5 w-3.5" /> Desktop
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("mobile")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "mobile"
                ? "bg-emerald-500 text-black"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Smartphone className="h-3.5 w-3.5" /> Mobile
          </button>
        </div>
      </div>

      {/* Right: Color pickers + Publish */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-zinc-400">Primária</span>
            <div className="relative">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => onPrimaryColorChange(e.target.value)}
                className="sr-only"
              />
              <div
                className="h-7 w-7 rounded-full border-2 border-zinc-600 hover:border-zinc-400 transition-colors cursor-pointer"
                style={{ backgroundColor: primaryColor }}
                onClick={(e) => {
                  const input = (e.currentTarget as HTMLElement)
                    .previousElementSibling as HTMLInputElement;
                  input?.click();
                }}
              />
            </div>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-zinc-400">Secundária</span>
            <div className="relative">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => onSecondaryColorChange(e.target.value)}
                className="sr-only"
              />
              <div
                className="h-7 w-7 rounded-full border-2 border-zinc-600 hover:border-zinc-400 transition-colors cursor-pointer"
                style={{ backgroundColor: secondaryColor }}
                onClick={(e) => {
                  const input = (e.currentTarget as HTMLElement)
                    .previousElementSibling as HTMLInputElement;
                  input?.click();
                }}
              />
            </div>
          </label>
        </div>

        <Button
          onClick={onPublish}
          disabled={publishing}
          size="sm"
          className="bg-emerald-500 text-black font-bold hover:bg-emerald-400"
        >
          {publishing ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Publicando...
            </>
          ) : (
            <>
              Publicar Loja <ArrowRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to `PreviewToolbar.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/PreviewToolbar.tsx
git commit -m "feat: add PreviewToolbar with device toggle and color pickers"
```

---

### Task 3: PreviewCanvas Component

**Files:**
- Create: `components/PreviewCanvas.tsx`

- [ ] **Step 1: Create the PreviewCanvas component**

```tsx
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
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to `PreviewCanvas.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/PreviewCanvas.tsx
git commit -m "feat: add PreviewCanvas live preview renderer with desktop/mobile support"
```

---

### Task 4: PreviewEditPanel Component

**Files:**
- Create: `components/PreviewEditPanel.tsx`

- [ ] **Step 1: Create the PreviewEditPanel component**

```tsx
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
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to `PreviewEditPanel.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/PreviewEditPanel.tsx
git commit -m "feat: add PreviewEditPanel with 5 accordion sections for content editing"
```

---

### Task 5: Rewrite Preview Page (Orchestrator)

**Files:**
- Modify: `app/preview/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite app/preview/page.tsx**

Replace the entire file content with:

```tsx
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
```

- [ ] **Step 2: Verify no type errors and dev server works**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/preview/page.tsx
git commit -m "feat: rewrite preview page as interactive visual editor with split-pane layout"
```

---

### Task 6: Manual Smoke Test

- [ ] **Step 1: Start the dev server**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npm run dev`

- [ ] **Step 2: Verify the following in the browser at `/preview`**

Checklist:
1. Page loads with toolbar at top, preview on left, edit panel on right
2. Desktop/Mobile toggle switches preview width (mobile = 375px centered)
3. Color picker swatches open native color picker on click
4. Changing primary color updates topbar background and CTA button in preview in real-time
5. Topbar accordion section is expanded by default
6. Clicking another section collapses the current one and expands the new one
7. Editing text in any field updates the preview immediately
8. "Publicar Loja" button triggers publish flow (or shows error toast if no session data)
9. "Voltar" button navigates to `/hero-image`
10. Edit panel scrolls independently when content overflows

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address smoke test issues in visual preview editor"
```

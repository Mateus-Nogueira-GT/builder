# Content Generation Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add partial block regeneration (local template variations) and content version history (persisted in Supabase) to the `/generate` page.

**Architecture:** A new `lib/contentVariations.ts` module generates template-based variations per content block with no API calls. A new `content_versions` Supabase table stores full `StoreContent` snapshots before each regeneration. Two new API routes handle version CRUD. The existing `ContentBlock` component gets a regenerate button, and a new `VersionHistory` dropdown lets users browse and restore past versions.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Supabase (PostgreSQL + JS client), Lucide icons, existing UI components (`Button`, `Input`, `Card`).

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/contentVariations.ts` | Create | Template banks + `generateVariation()` function per block |
| `app/api/content-versions/route.ts` | Create | `GET` list versions / `POST` save new version |
| `app/api/content-versions/[id]/route.ts` | Create | `GET` single version with full content |
| `components/ContentBlock.tsx` | Modify | Add `onRegenerate` + `isRegenerating` props, render regenerate button |
| `components/VersionHistory.tsx` | Create | Dropdown listing versions with restore capability |
| `app/generate/page.tsx` | Modify | Wire up partial regeneration + version history |

---

### Task 1: Create Content Variations Module

**Files:**
- Create: `lib/contentVariations.ts`

- [ ] **Step 1: Create lib/contentVariations.ts with all variation logic**

```typescript
// lib/contentVariations.ts
import type { StoreContent, OnboardingData, TrustBarItem, PromoBanner, Testimonial, Category, FooterContent } from "./schemas";

export type BlockName = "topbar" | "whatsapp" | "trustBar" | "promoBanner" | "categories" | "testimonials" | "footer";

function pickRandom<T>(items: T[], exclude?: T): T {
  const filtered = exclude !== undefined ? items.filter((item) => JSON.stringify(item) !== JSON.stringify(exclude)) : items;
  const pool = filtered.length > 0 ? filtered : items;
  return pool[Math.floor(Math.random() * pool.length)];
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] || key);
}

// ── Topbar ──

const TOPBAR_TEMPLATES = [
  "🔥 {activePromotion} | Frete grátis acima de R$199",
  "⚽ {storeName} — Novidades toda semana!",
  "🚚 Entrega expressa para {city} e região",
  "💥 {activePromotion} | Parcele em até 12x",
  "🏆 A melhor loja de camisas de {city}",
  "⭐ {storeName} — Qualidade e preço justo",
  "🎯 {activePromotion} | Só essa semana!",
  "🔝 Vista a camisa do seu time | {storeName}",
];

function generateTopbarVariation(current: string, vars: Record<string, string>): string {
  const filled = TOPBAR_TEMPLATES.map((t) => fillTemplate(t, vars));
  return pickRandom(filled, current);
}

// ── WhatsApp ──

const WHATSAPP_TEMPLATES = [
  "Olá! Vi o site da {storeName} e quero saber mais sobre as camisas!",
  "Oi! Gostaria de aproveitar a promoção {activePromotion}!",
  "Olá! Vocês têm a camisa do meu time? Quero encomendar!",
  "Oi {storeName}! Quais são as novidades?",
  "Olá! Quero comprar uma camisa, podem me ajudar?",
  "Oi! Vi que vocês têm {activePromotion}, como funciona?",
];

function generateWhatsappVariation(current: string, vars: Record<string, string>): string {
  const filled = WHATSAPP_TEMPLATES.map((t) => fillTemplate(t, vars));
  return pickRandom(filled, current);
}

// ── Trust Bar ──

const TRUST_BAR_SETS: TrustBarItem[][] = [
  [
    { icon: "shield", text: "Qualidade garantida" },
    { icon: "truck", text: "Frete grátis acima de R$199" },
    { icon: "creditcard", text: "12x sem juros" },
  ],
  [
    { icon: "shield", text: "100% seguro" },
    { icon: "truck", text: "Entrega expressa" },
    { icon: "creditcard", text: "Parcele no cartão" },
  ],
  [
    { icon: "shield", text: "Satisfação garantida" },
    { icon: "truck", text: "Entrega para todo Brasil" },
    { icon: "creditcard", text: "Pague como quiser" },
  ],
  [
    { icon: "shield", text: "Troca garantida" },
    { icon: "truck", text: "Frete grátis para {city}" },
    { icon: "creditcard", text: "Todos os cartões" },
  ],
];

function generateTrustBarVariation(current: TrustBarItem[], vars: Record<string, string>): TrustBarItem[] {
  const filled = TRUST_BAR_SETS.map((set) =>
    set.map((item) => ({ ...item, text: fillTemplate(item.text, vars) }))
  );
  return pickRandom(filled, current);
}

// ── Promo Banner ──

const PROMO_BANNER_TEMPLATES: PromoBanner[] = [
  { title: "{activePromotion}", subtitle: "Aproveite por tempo limitado", ctaLabel: "Ver Ofertas", ctaLink: "/colecao" },
  { title: "Mega Promoção", subtitle: "{activePromotion} em camisas selecionadas", ctaLabel: "Comprar Agora", ctaLink: "/promocao" },
  { title: "Só Hoje!", subtitle: "{activePromotion} | Não perca!", ctaLabel: "Aproveitar", ctaLink: "/ofertas" },
  { title: "Oferta Imperdível", subtitle: "{activePromotion}", ctaLabel: "Conferir", ctaLink: "/colecao" },
  { title: "Liquidação", subtitle: "Camisas a partir de R$89", ctaLabel: "Ver Tudo", ctaLink: "/liquidacao" },
  { title: "Black Friday Antecipada", subtitle: "{activePromotion} em todo site", ctaLabel: "Garantir", ctaLink: "/black-friday" },
];

function generatePromoBannerVariation(current: PromoBanner, vars: Record<string, string>): PromoBanner {
  const filled = PROMO_BANNER_TEMPLATES.map((b) => ({
    title: fillTemplate(b.title, vars),
    subtitle: fillTemplate(b.subtitle, vars),
    ctaLabel: b.ctaLabel,
    ctaLink: b.ctaLink,
  }));
  return pickRandom(filled, current);
}

// ── Categories ──

const CATEGORIES_BY_FOCUS: Record<string, Category[][]> = {
  brasileirao: [
    [{ name: "Brasileirão Série A", image: "" }, { name: "Brasileirão Série B", image: "" }, { name: "Copa do Brasil", image: "" }, { name: "Estaduais", image: "" }],
    [{ name: "Flamengo", image: "" }, { name: "Corinthians", image: "" }, { name: "Palmeiras", image: "" }, { name: "São Paulo", image: "" }],
    [{ name: "Times do Sul", image: "" }, { name: "Times do Nordeste", image: "" }, { name: "Times de SP", image: "" }, { name: "Times do RJ", image: "" }],
  ],
  copa: [
    [{ name: "Seleção Brasileira", image: "" }, { name: "Argentina", image: "" }, { name: "Alemanha", image: "" }, { name: "França", image: "" }],
    [{ name: "Europa", image: "" }, { name: "América do Sul", image: "" }, { name: "África", image: "" }, { name: "Ásia", image: "" }],
  ],
  retro: [
    [{ name: "Anos 70", image: "" }, { name: "Anos 80", image: "" }, { name: "Anos 90", image: "" }, { name: "Anos 2000", image: "" }],
    [{ name: "Retrô Brasil", image: "" }, { name: "Retrô Europa", image: "" }, { name: "Retrô Clássicos", image: "" }, { name: "Retrô Edição Especial", image: "" }],
  ],
  todos: [
    [{ name: "Brasileirão", image: "" }, { name: "Seleções", image: "" }, { name: "Europa", image: "" }, { name: "Retrô", image: "" }],
    [{ name: "Mais Vendidos", image: "" }, { name: "Novidades", image: "" }, { name: "Promoção", image: "" }, { name: "Infantil", image: "" }],
  ],
};

function generateCategoriesVariation(current: Category[], focus: string): Category[] {
  const sets = CATEGORIES_BY_FOCUS[focus] || CATEGORIES_BY_FOCUS["todos"];
  return pickRandom(sets, current);
}

// ── Testimonials ──

const TESTIMONIAL_BANK: Testimonial[] = [
  { name: "João Silva", city: "São Paulo", rating: 5, text: "Camisa de altíssima qualidade! Idêntica à original, superou minhas expectativas." },
  { name: "Maria Oliveira", city: "Rio de Janeiro", rating: 5, text: "Entrega super rápida e o acabamento da camisa é perfeito. Já indiquei para amigos!" },
  { name: "Carlos Santos", city: "Belo Horizonte", rating: 4, text: "Ótimo custo-benefício. Material resistente e confortável para usar no dia a dia." },
  { name: "Ana Costa", city: "Curitiba", rating: 5, text: "Comprei para presente e foi um sucesso! Embalagem caprichada e entrega no prazo." },
  { name: "Pedro Almeida", city: "Salvador", rating: 5, text: "Já é minha terceira compra. Sempre com a mesma qualidade impecável." },
  { name: "Julia Ferreira", city: "Porto Alegre", rating: 4, text: "Atendimento nota 10 pelo WhatsApp. Tiraram todas as minhas dúvidas rapidamente." },
  { name: "Lucas Souza", city: "Recife", rating: 5, text: "A camisa retrô ficou sensacional! Tecido de qualidade e estampa perfeita." },
  { name: "Fernanda Lima", city: "Brasília", rating: 5, text: "Melhor loja de camisas que já comprei. Preço justo e produto excelente." },
  { name: "Rafael Mendes", city: "Fortaleza", rating: 4, text: "Produto chegou bem embalado e dentro do prazo. Camisa muito bonita." },
  { name: "Camila Rocha", city: "Manaus", rating: 5, text: "Comprei a camisa da seleção e amei! Qualidade surpreendente pelo preço." },
  { name: "Thiago Barbosa", city: "Goiânia", rating: 5, text: "Site fácil de navegar e a compra foi super tranquila. Recomendo demais!" },
  { name: "Beatriz Nunes", city: "Florianópolis", rating: 4, text: "Boa qualidade no geral. O tecido é confortável e a costura bem feita." },
];

function generateTestimonialsVariation(current: Testimonial[]): Testimonial[] {
  const currentNames = new Set(current.map((t) => t.name));
  const available = TESTIMONIAL_BANK.filter((t) => !currentNames.has(t.name));
  const pool = available.length >= 4 ? available : TESTIMONIAL_BANK;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

// ── Footer ──

const FOOTER_TAGLINES = [
  "{storeName} — Vista a camisa do seu time.",
  "Paixão pelo futebol, qualidade na camisa.",
  "{storeName} — Onde começa a torcida.",
  "Camisas oficiais e réplicas premium | {storeName}",
  "Seu time, sua camisa, sua loja.",
  "{storeName} — A camisa que você merece.",
];

const FOOTER_ABOUT_TEXTS = [
  "A {storeName} é referência em camisas de futebol em {city}. Trabalhamos com as melhores réplicas do mercado, garantindo qualidade e satisfação.",
  "Somos apaixonados por futebol e especializados em camisas de time. A {storeName} oferece o melhor em qualidade e variedade para torcedores de {city} e todo Brasil.",
  "Na {storeName}, cada camisa conta uma história. Oferecemos as melhores réplicas e edições especiais com entrega para todo o Brasil.",
  "Fundada por torcedores, para torcedores. A {storeName} de {city} traz as melhores camisas com qualidade premium e preço justo.",
  "A {storeName} nasceu da paixão pelo futebol. Nossa missão é levar camisas de qualidade para todos os torcedores de {city} e do Brasil.",
  "Qualidade, variedade e preço justo. É isso que a {storeName} oferece para os verdadeiros apaixonados por futebol.",
];

function generateFooterVariation(current: FooterContent, vars: Record<string, string>): FooterContent {
  const taglines = FOOTER_TAGLINES.map((t) => fillTemplate(t, vars));
  const aboutTexts = FOOTER_ABOUT_TEXTS.map((t) => fillTemplate(t, vars));
  return {
    tagline: pickRandom(taglines, current.tagline),
    aboutText: pickRandom(aboutTexts, current.aboutText),
  };
}

// ── Main export ──

export function generateVariation(
  blockName: BlockName,
  currentContent: StoreContent,
  onboarding: OnboardingData
): Partial<StoreContent> {
  const vars: Record<string, string> = {
    storeName: onboarding.storeName || "Kit Store",
    activePromotion: onboarding.activePromotion || "Compre 2 Leve 3",
    city: onboarding.city || "Brasil",
    state: onboarding.state || "",
  };

  switch (blockName) {
    case "topbar":
      return { topbar: generateTopbarVariation(currentContent.topbar, vars) };
    case "whatsapp":
      return { whatsappGreeting: generateWhatsappVariation(currentContent.whatsappGreeting, vars) };
    case "trustBar":
      return { trustBar: generateTrustBarVariation(currentContent.trustBar, vars) };
    case "promoBanner":
      return { promoBanner: generatePromoBannerVariation(currentContent.promoBanner, vars) };
    case "categories":
      return { categories: generateCategoriesVariation(currentContent.categories, onboarding.focus || "todos") };
    case "testimonials":
      return { testimonials: generateTestimonialsVariation(currentContent.testimonials) };
    case "footer":
      return { footer: generateFooterVariation(currentContent.footer, vars) };
  }
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `contentVariations.ts`

- [ ] **Step 3: Commit**

```bash
git add lib/contentVariations.ts
git commit -m "feat: add content variations module with template banks for all blocks"
```

---

### Task 2: Create Content Versions API Routes

**Files:**
- Create: `app/api/content-versions/route.ts`
- Create: `app/api/content-versions/[id]/route.ts`

- [ ] **Step 1: Create the list/create API route**

```typescript
// app/api/content-versions/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const MAX_VERSIONS_PER_STORE = 20;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId");

  if (!storeId) {
    return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("content_versions")
    .select("id, trigger, block_name, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(MAX_VERSIONS_PER_STORE);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, content, trigger, blockName } = body;

    if (!storeId || !content || !trigger) {
      return NextResponse.json(
        { error: "storeId, content, and trigger are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("content_versions")
      .insert({
        store_id: storeId,
        content,
        trigger,
        block_name: blockName || null,
      })
      .select("id, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Cleanup: delete excess versions beyond MAX_VERSIONS_PER_STORE
    const { data: allVersions } = await supabase
      .from("content_versions")
      .select("id")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (allVersions && allVersions.length > MAX_VERSIONS_PER_STORE) {
      const idsToDelete = allVersions
        .slice(MAX_VERSIONS_PER_STORE)
        .map((v) => v.id);

      await supabase
        .from("content_versions")
        .delete()
        .in("id", idsToDelete);
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao salvar versão" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create the single version API route**

```typescript
// app/api/content-versions/[id]/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("content_versions")
    .select("id, store_id, content, trigger, block_name, created_at")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}
```

- [ ] **Step 3: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/api/content-versions/route.ts app/api/content-versions/\[id\]/route.ts
git commit -m "feat: add content-versions API routes for version history CRUD"
```

---

### Task 3: Create Supabase Table

**Files:**
- No code files — this is a database migration run against Supabase

- [ ] **Step 1: Create the content_versions table in Supabase**

Run the following SQL against the Supabase project (via the Supabase dashboard SQL Editor, or via curl to the REST API):

```sql
CREATE TABLE IF NOT EXISTS content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  content jsonb NOT NULL,
  trigger text NOT NULL,
  block_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_versions_store_created
  ON content_versions (store_id, created_at DESC);
```

Run via curl using the service role key:

```bash
curl -X POST "https://qgyehlnydiknypzwpyyq.supabase.co/rest/v1/rpc" \
  -H "apikey: SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "CREATE TABLE IF NOT EXISTS content_versions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE, content jsonb NOT NULL, trigger text NOT NULL, block_name text, created_at timestamptz DEFAULT now()); CREATE INDEX IF NOT EXISTS idx_content_versions_store_created ON content_versions (store_id, created_at DESC);"}'
```

Alternatively, use the Supabase SQL Editor at the project dashboard.

- [ ] **Step 2: Verify the table exists**

```bash
curl -s "https://qgyehlnydiknypzwpyyq.supabase.co/rest/v1/content_versions?select=id&limit=1" \
  -H "apikey: SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY"
```

Expected: `[]` (empty array, no error)

- [ ] **Step 3: Commit (no files to commit — note in plan tracking only)**

No git commit needed for this task — it's a DB migration only.

---

### Task 4: Modify ContentBlock with Regenerate Button

**Files:**
- Modify: `components/ContentBlock.tsx`

- [ ] **Step 1: Update ContentBlock to accept onRegenerate and isRegenerating props**

Replace the entire file with:

```tsx
// components/ContentBlock.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldDef {
  key: string;
  label: string;
  value: string;
  type?: "text" | "textarea";
}

interface ContentBlockProps {
  title: string;
  isComplete: boolean;
  fields: FieldDef[];
  onFieldChange: (key: string, value: string) => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export function ContentBlock({
  title,
  isComplete,
  fields,
  onFieldChange,
  onRegenerate,
  isRegenerating,
}: ContentBlockProps) {
  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full",
              isComplete ? "bg-emerald-500" : "bg-zinc-700"
            )}
          >
            {isComplete ? (
              <Check className="h-3 w-3 text-black" />
            ) : (
              <AlertCircle className="h-3 w-3 text-zinc-400" />
            )}
          </div>
          <span className="flex-1">{title}</span>
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-emerald-400 transition-colors disabled:opacity-50"
              title="Regenerar este bloco"
            >
              <RotateCcw
                className={cn(
                  "h-3.5 w-3.5",
                  isRegenerating && "animate-spin"
                )}
              />
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map((field) => (
          <div key={field.key} className="space-y-1">
            <label className="text-xs font-medium text-zinc-400">{field.label}</label>
            {field.type === "textarea" ? (
              <textarea
                value={field.value}
                onChange={(e) => onFieldChange(field.key, e.target.value)}
                rows={3}
                className="flex w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
            ) : (
              <Input
                value={field.value}
                onChange={(e) => onFieldChange(field.key, e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/ContentBlock.tsx
git commit -m "feat: add regenerate button to ContentBlock component"
```

---

### Task 5: Create VersionHistory Component

**Files:**
- Create: `components/VersionHistory.tsx`

- [ ] **Step 1: Create the VersionHistory component**

```tsx
// components/VersionHistory.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { History, Loader2, Clock, RotateCcw, Sparkles } from "lucide-react";
import type { StoreContent } from "@/lib/schemas";

interface VersionEntry {
  id: string;
  trigger: string;
  block_name: string | null;
  created_at: string;
}

interface VersionHistoryProps {
  storeId: string | null;
  onRestore: (content: StoreContent) => void;
}

const BLOCK_LABELS: Record<string, string> = {
  topbar: "Topbar",
  whatsapp: "WhatsApp",
  trustBar: "Trust Bar",
  promoBanner: "Promo Banner",
  categories: "Categorias",
  testimonials: "Depoimentos",
  footer: "Footer",
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHour < 24) return `há ${diffHour}h`;
  return `há ${diffDay}d`;
}

export function VersionHistory({ storeId, onRestore }: VersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchVersions = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/content-versions?storeId=${storeId}`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      fetchVersions();
    }
    setIsOpen(!isOpen);
  };

  const handleRestore = async (versionId: string) => {
    setRestoring(versionId);
    try {
      const res = await fetch(`/api/content-versions/${versionId}`);
      if (!res.ok) return;
      const data = await res.json();
      onRestore(data.content);
      setIsOpen(false);
    } catch {
      // silent fail
    } finally {
      setRestoring(null);
    }
  };

  if (!storeId) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={handleToggle}
        className="border-zinc-700 text-zinc-300 hover:border-emerald-500"
      >
        <History className="mr-2 h-4 w-4" /> Histórico
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
          <div className="p-3 border-b border-zinc-800">
            <h4 className="text-sm font-semibold text-white">Versões Anteriores</h4>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
              </div>
            ) : versions.length === 0 ? (
              <div className="py-6 text-center text-sm text-zinc-500">
                Nenhuma versão anterior
              </div>
            ) : (
              versions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => handleRestore(version.id)}
                  disabled={restoring !== null}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-800/60 transition-colors disabled:opacity-50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                    {version.trigger === "full_regeneration" ? (
                      <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {version.trigger === "full_regeneration"
                        ? "Regeneração completa"
                        : `Regeneração: ${BLOCK_LABELS[version.block_name || ""] || version.block_name}`}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(version.created_at)}
                    </div>
                  </div>
                  {restoring === version.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-500 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/VersionHistory.tsx
git commit -m "feat: add VersionHistory dropdown component for browsing and restoring content versions"
```

---

### Task 6: Wire Everything into Generate Page

**Files:**
- Modify: `app/generate/page.tsx`

- [ ] **Step 1: Rewrite app/generate/page.tsx to integrate regeneration + history**

Replace the entire file with:

```tsx
// app/generate/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { StepIndicator } from '@/components/StepIndicator';
import { ContentBlock } from '@/components/ContentBlock';
import { VersionHistory } from '@/components/VersionHistory';
import { Button } from '@/components/ui/button';
import { getSession, setSession } from '@/lib/session';
import { generateVariation, type BlockName } from '@/lib/contentVariations';
import type { StoreContent, OnboardingData } from '@/lib/schemas';
import { Loader2, ArrowRight, RotateCcw, Sparkles, Shirt } from 'lucide-react';

const FLOW_STEPS = [
    { label: 'Dados da Loja' },
    { label: 'Conteúdo' },
    { label: 'Imagens' },
    { label: 'Preview' },
    { label: 'Publicar' },
    { label: 'Dashboard' },
];

export default function GeneratePage() {
    const router = useRouter();
    const [content, setContent] = useState<StoreContent | null>(null);
    const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
    const [storeId, setStoreId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [regeneratingBlock, setRegeneratingBlock] = useState<string | null>(null);

    useEffect(() => {
        const session = getSession();
        if (session.content) {
            setContent(session.content);
            setOnboarding(session.onboarding ?? null);
            setStoreId(session.storeId ?? null);
            setLoading(false);
        } else if (session.onboarding) {
            setOnboarding(session.onboarding);
            setStoreId(session.storeId ?? null);
            generateFullContent(session.onboarding);
        } else {
            toast.error('Complete o onboarding primeiro');
            router.push('/onboarding');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const generateFullContent = async (onb: OnboardingData) => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...onb, onboarding: onb }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Erro na geração');
            }

            const data: StoreContent = await res.json();
            setContent(data);
            setSession({ content: data });
            toast.success('Conteúdo gerado com sucesso!');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao gerar conteúdo';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const saveVersion = async (trigger: string, blockName?: string) => {
        if (!storeId || !content) return;
        try {
            await fetch('/api/content-versions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId,
                    content,
                    trigger,
                    blockName,
                }),
            });
        } catch {
            // Non-blocking: version save failure should not block regeneration
            console.warn('Failed to save content version');
        }
    };

    const handleRegenerateBlock = useCallback(
        async (blockName: BlockName) => {
            if (!content || !onboarding || regeneratingBlock) return;

            setRegeneratingBlock(blockName);

            // Save current version before regenerating
            await saveVersion('block_regeneration', blockName);

            // Generate variation locally
            const variation = generateVariation(blockName, content, onboarding);
            const updated = { ...content, ...variation };

            setContent(updated);
            setSession({ content: updated });
            toast.success('Bloco regenerado!');

            // Brief delay for visual feedback
            setTimeout(() => setRegeneratingBlock(null), 300);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [content, onboarding, regeneratingBlock, storeId]
    );

    const handleRegenerateAll = async () => {
        if (!onboarding) return;
        await saveVersion('full_regeneration');
        generateFullContent(onboarding);
    };

    const handleRestore = (restored: StoreContent) => {
        setContent(restored);
        setSession({ content: restored });
        toast.success('Versão restaurada!');
    };

    const updateField = (section: string, key: string, value: string) => {
        if (!content) return;

        const updated = { ...content };

        if (section === 'topbar') {
            updated.topbar = value;
        } else if (section === 'whatsapp') {
            updated.whatsappGreeting = value;
        } else if (section.startsWith('trust-')) {
            const idx = parseInt(section.split('-')[1]);
            updated.trustBar = [...updated.trustBar];
            updated.trustBar[idx] = { ...updated.trustBar[idx], [key]: value };
        } else if (section === 'promo') {
            updated.promoBanner = { ...updated.promoBanner, [key]: value };
        } else if (section.startsWith('testimonial-')) {
            const idx = parseInt(section.split('-')[1]);
            updated.testimonials = [...updated.testimonials];
            updated.testimonials[idx] = { ...updated.testimonials[idx], [key]: value };
        } else if (section.startsWith('category-')) {
            const idx = parseInt(section.split('-')[1]);
            updated.categories = [...(updated.categories || [])];
            updated.categories[idx] = { ...updated.categories[idx], [key]: value };
        } else if (section === 'footer') {
            updated.footer = { ...updated.footer, [key]: value };
        }

        setContent(updated);
        setSession({ content: updated });
    };

    const allComplete = content
        ? content.topbar.length > 0 &&
        content.trustBar.every((t) => t.text) &&
        content.promoBanner.title.length > 0 &&
        content.testimonials.every((t) => t.name && t.text) &&
        (content.categories?.length === 4) &&
        content.footer.tagline.length > 0
        : false;

    const handleNext = () => {
        if (!allComplete) {
            toast.error('Complete todos os blocos antes de avançar');
            return;
        }
        setSession({ content: content! });
        router.push('/hero-image');
    };

    const isAnyRegenerating = regeneratingBlock !== null;

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 px-4 py-8">
                <div className="mx-auto max-w-3xl space-y-8">
                    <div className="text-center space-y-2">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                            <Shirt className="h-6 w-6 text-emerald-500" />
                        </div>
                        <h1 className="text-3xl font-bold">Kit Store Builder</h1>
                    </div>
                    <StepIndicator steps={FLOW_STEPS} currentStep={1} />
                    <div className="space-y-4">
                        <div className="flex items-center justify-center gap-3 py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                            <div>
                                <p className="text-lg font-semibold text-white">
                                    Gerando conteúdo com IA...
                                </p>
                                <p className="text-sm text-zinc-400">
                                    Isso pode levar alguns segundos
                                </p>
                            </div>
                        </div>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="h-24 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900"
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
                <div className="text-center space-y-4">
                    <p className="text-red-400 text-lg">{error}</p>
                    <Button
                        onClick={() => onboarding && generateFullContent(onboarding)}
                        className="bg-emerald-500 text-black font-bold"
                    >
                        <RotateCcw className="mr-2 h-4 w-4" /> Tentar novamente
                    </Button>
                </div>
            </div>
        );
    }

    if (!content) return null;

    return (
        <div className="min-h-screen bg-zinc-950 px-4 py-8">
            <div className="mx-auto max-w-3xl space-y-8">
                <div className="text-center space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                        <Shirt className="h-6 w-6 text-emerald-500" />
                    </div>
                    <h1 className="text-3xl font-bold">Kit Store Builder</h1>
                </div>

                <StepIndicator steps={FLOW_STEPS} currentStep={1} />

                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-emerald-500" />
                        Conteúdo Gerado
                    </h2>
                    <div className="flex items-center gap-2">
                        <VersionHistory storeId={storeId} onRestore={handleRestore} />
                        <Button
                            variant="outline"
                            onClick={handleRegenerateAll}
                            disabled={isAnyRegenerating}
                            className="border-zinc-700 text-zinc-300 hover:border-emerald-500"
                        >
                            <RotateCcw className="mr-2 h-4 w-4" /> Regenerar tudo
                        </Button>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Topbar + WhatsApp */}
                    <ContentBlock
                        title="Configurações Gerais"
                        isComplete={content.topbar.length > 0 && content.whatsappGreeting.length > 0}
                        fields={[
                            { key: 'topbar', label: 'Texto do Topbar', value: content.topbar },
                            { key: 'whatsappGreeting', label: 'Mensagem WhatsApp', value: content.whatsappGreeting },
                        ]}
                        onFieldChange={(key, value) => {
                            if (key === 'topbar') updateField('topbar', key, value);
                            else updateField('whatsapp', key, value);
                        }}
                        onRegenerate={() => handleRegenerateBlock('topbar')}
                        isRegenerating={regeneratingBlock === 'topbar'}
                    />

                    {/* Trust Bar */}
                    <ContentBlock
                        title="Trust Bar"
                        isComplete={content.trustBar.every((t) => t.text.length > 0)}
                        fields={content.trustBar.flatMap((item, i) => [
                            { key: `icon-${i}`, label: `Ícone ${i + 1}`, value: item.icon },
                            { key: `text-${i}`, label: `Texto ${i + 1}`, value: item.text },
                        ])}
                        onFieldChange={(key, value) => {
                            const [field, idxStr] = key.split('-');
                            const idx = parseInt(idxStr);
                            updateField(`trust-${idx}`, field, value);
                        }}
                        onRegenerate={() => handleRegenerateBlock('trustBar')}
                        isRegenerating={regeneratingBlock === 'trustBar'}
                    />

                    {/* Promo Banner */}
                    <ContentBlock
                        title="Banner Promocional"
                        isComplete={content.promoBanner.title.length > 0}
                        fields={[
                            { key: 'title', label: 'Título', value: content.promoBanner.title },
                            { key: 'subtitle', label: 'Subtítulo', value: content.promoBanner.subtitle },
                            { key: 'ctaLabel', label: 'Texto do Botão', value: content.promoBanner.ctaLabel },
                            { key: 'ctaLink', label: 'Link do Botão', value: content.promoBanner.ctaLink },
                        ]}
                        onFieldChange={(key, value) => updateField('promo', key, value)}
                        onRegenerate={() => handleRegenerateBlock('promoBanner')}
                        isRegenerating={regeneratingBlock === 'promoBanner'}
                    />

                    {/* Testimonials */}
                    {content.testimonials.map((test, i) => (
                        <ContentBlock
                            key={`test-${i}`}
                            title={`Depoimento ${i + 1}`}
                            isComplete={!!test.name && !!test.text}
                            fields={[
                                { key: 'name', label: 'Nome', value: test.name },
                                { key: 'city', label: 'Cidade', value: test.city },
                                { key: 'rating', label: 'Nota (1-5)', value: String(test.rating) },
                                { key: 'text', label: 'Depoimento', value: test.text, type: 'textarea' as const },
                            ]}
                            onFieldChange={(key, value) => {
                                updateField(`testimonial-${i}`, key, value);
                            }}
                            onRegenerate={i === 0 ? () => handleRegenerateBlock('testimonials') : undefined}
                            isRegenerating={i === 0 ? regeneratingBlock === 'testimonials' : false}
                        />
                    ))}

                    {/* Categories */}
                    <ContentBlock
                        title="Categorias de Produtos"
                        isComplete={content.categories?.length === 4}
                        fields={content.categories?.flatMap((cat, i) => [
                            { key: `name-${i}`, label: `Nome ${i + 1}`, value: cat.name },
                            { key: `image-${i}`, label: `Prompt da Imagem ${i + 1}`, value: cat.image || '', type: 'textarea' as const },
                        ]) || []}
                        onFieldChange={(key, value) => {
                            const [field, idxStr] = key.split('-');
                            const idx = parseInt(idxStr);
                            updateField(`category-${idx}`, field === 'name' ? 'name' : 'image', value);
                        }}
                        onRegenerate={() => handleRegenerateBlock('categories')}
                        isRegenerating={regeneratingBlock === 'categories'}
                    />

                    {/* Footer */}
                    <ContentBlock
                        title="Footer"
                        isComplete={content.footer.tagline.length > 0 && content.footer.aboutText.length > 0}
                        fields={[
                            { key: 'tagline', label: 'Tagline', value: content.footer.tagline },
                            { key: 'aboutText', label: 'Sobre Nós', value: content.footer.aboutText, type: 'textarea' as const },
                        ]}
                        onFieldChange={(key, value) => updateField('footer', key, value)}
                        onRegenerate={() => handleRegenerateBlock('footer')}
                        isRegenerating={regeneratingBlock === 'footer'}
                    />
                </div>

                {/* Next button */}
                <div className="flex justify-end">
                    <Button
                        onClick={handleNext}
                        disabled={!allComplete}
                        className="bg-emerald-500 text-black font-bold hover:bg-emerald-400 disabled:opacity-50"
                    >
                        Próximo: Escolher Imagens <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/generate/page.tsx
git commit -m "feat: wire up partial block regeneration and version history into generate page"
```

---

### Task 7: Smoke Test

- [ ] **Step 1: Start the dev server**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npm run dev`

- [ ] **Step 2: Verify the following in the browser at `/generate`**

Checklist:
1. Page loads and shows content blocks with regenerate icons on each block header
2. Clicking the regenerate icon on Topbar changes the topbar text to a new variation
3. Clicking regenerate on Trust Bar replaces all 3 trust items
4. Clicking regenerate on Promo Banner changes title/subtitle/CTA
5. Clicking regenerate on Categories changes category names
6. Clicking regenerate on Footer changes tagline and about text
7. Clicking regenerate on Depoimento 1 regenerates all 4 testimonials
8. "Regenerar tudo" button saves a version then calls the API for full regeneration
9. "Histórico" button opens a dropdown listing previous versions
10. Clicking a version in the dropdown restores that content
11. All regenerate buttons are disabled while one is regenerating
12. Version history shows "Nenhuma versão anterior" when no versions exist
13. Version history shows correct trigger labels ("Regeneração completa" vs "Regeneração: Topbar")

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address smoke test issues in content generation improvements"
```

# Store Generation Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the end-to-end pipeline that maps onboarding choices to Wix templates, generates default content, injects it via Wix API, publishes the site, and shows progress on the existing `/publishing` page.

**Architecture:** A template map module selects the Wix template by layout type. A default content module generates pre-defined `StoreContent` personalized with store name and colors (no AI). The inject route is updated to include branding fields and skip testimonials. The onboarding page's `handleFinish` chains create-site → generate content → inject → redirect to publishing.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase, Wix REST API, existing provisioning/inject pipeline.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/templateMap.ts` | Create | Layout type → Wix template ID mapping |
| `lib/defaultContent.ts` | Create | Pre-defined content generator (no AI) |
| `app/api/wix/create-site/route.ts` | Modify | Use templateMap instead of hardcoded ID |
| `app/api/inject/route.ts` | Modify | Add branding fields to collections, skip testimonials |
| `app/onboarding/page.tsx` | Modify | handleFinish chains create → content → inject → publishing |
| `app/publishing/page.tsx` | Modify | Update FLOW_STEPS to new 4-step labels |

---

### Task 1: Create Template Map Module

**Files:**
- Create: `lib/templateMap.ts`

- [ ] **Step 1: Create lib/templateMap.ts**

```typescript
// lib/templateMap.ts

const CLASSIC_TEMPLATE_ID = "9b6ae83a-02a6-4c47-8816-bade636b412e";

export const TEMPLATE_MAP: Record<string, string> = {
  classic: CLASSIC_TEMPLATE_ID,
  modern: CLASSIC_TEMPLATE_ID, // placeholder — update when second Wix template is created
};

export function getTemplateId(layoutType: string): string {
  return TEMPLATE_MAP[layoutType] || CLASSIC_TEMPLATE_ID;
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -10`

- [ ] **Step 3: Commit**

```bash
git add lib/templateMap.ts
git commit -m "feat: add template map module for layout → Wix template ID mapping"
```

---

### Task 2: Create Default Content Module

**Files:**
- Create: `lib/defaultContent.ts`

- [ ] **Step 1: Create lib/defaultContent.ts**

```typescript
// lib/defaultContent.ts
import type { StoreContent } from "./schemas";

export interface DefaultContentConfig {
  storeName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  layoutType: "classic" | "modern";
  bannerBgColor: string;
  bannerTextColor: string;
  bannerCtaColor: string;
  logoSvg: string;
  logoVariant: string;
}

export function generateDefaultContent(config: DefaultContentConfig): StoreContent {
  const { storeName, layoutType } = config;
  const name = storeName || "Kit Store";

  const categories =
    layoutType === "modern"
      ? [
          { name: "Mais Vendidos", image: "" },
          { name: "Novidades", image: "" },
          { name: "Promoção", image: "" },
        ]
      : [
          { name: "Brasileirão", image: "" },
          { name: "Seleções", image: "" },
          { name: "Europa", image: "" },
          { name: "Retrô", image: "" },
        ];

  return {
    topbar: `🔥 Frete grátis acima de R$199 | ${name}`,
    whatsappGreeting: `Olá! Vi o site da ${name} e quero saber mais sobre as camisas!`,
    trustBar: [
      { icon: "shield", text: "Qualidade garantida" },
      { icon: "truck", text: "Entrega para todo Brasil" },
      { icon: "creditcard", text: "Parcele em até 12x" },
    ],
    promoBanner: {
      title: "Novidades Toda Semana",
      subtitle: `As melhores camisas de futebol na ${name}`,
      ctaLabel: "Ver Coleção",
      ctaLink: "/colecao",
    },
    testimonials: [],
    categories,
    footer: {
      tagline: `${name} — Vista a camisa do seu time.`,
      aboutText: `A ${name} é referência em camisas de futebol. Trabalhamos com as melhores réplicas do mercado, garantindo qualidade e satisfação.`,
    },
  };
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -10`

- [ ] **Step 3: Commit**

```bash
git add lib/defaultContent.ts
git commit -m "feat: add default content generator with pre-defined templates per layout"
```

---

### Task 3: Update create-site API to Use Template Map

**Files:**
- Modify: `app/api/wix/create-site/route.ts`

- [ ] **Step 1: Add templateMap import and use it for template selection**

First READ the file, then make these edits:

**Edit 1:** Add import at the top (after the existing imports around line 3):

Find:
```typescript
import { supabase } from "@/lib/supabase";
```
Replace with:
```typescript
import { supabase } from "@/lib/supabase";
import { getTemplateId } from "@/lib/templateMap";
```

**Edit 2:** Replace the hardcoded template ID in the create call. Find (around line 42):
```typescript
          templateId: "9b6ae83a-02a6-4c47-8816-bade636b412e",
```
Replace with:
```typescript
          templateId: getTemplateId(body.layoutType || "classic"),
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -10`

- [ ] **Step 3: Commit**

```bash
git add app/api/wix/create-site/route.ts
git commit -m "feat: use templateMap for dynamic Wix template selection by layout type"
```

---

### Task 4: Update Inject Route with Branding Fields

**Files:**
- Modify: `app/api/inject/route.ts`

- [ ] **Step 1: Update REQUIRED_COLLECTIONS to remove testimonials**

First READ the file, then find (around lines 7-14):
```typescript
const REQUIRED_COLLECTIONS = [
    { id: COLLECTIONS.storeConfig, label: 'Configuracoes da loja' },
    { id: COLLECTIONS.banners, label: 'Banners e hero' },
    { id: COLLECTIONS.trustBar, label: 'Trust bar' },
    { id: COLLECTIONS.testimonials, label: 'Depoimentos' },
    { id: COLLECTIONS.promoBanner, label: 'Banner promocional' },
    { id: COLLECTIONS.categories, label: 'Categorias' },
];
```
Replace with:
```typescript
const REQUIRED_COLLECTIONS = [
    { id: COLLECTIONS.storeConfig, label: 'Configuracoes da loja' },
    { id: COLLECTIONS.banners, label: 'Banners e hero' },
    { id: COLLECTIONS.trustBar, label: 'Trust bar' },
    { id: COLLECTIONS.promoBanner, label: 'Banner promocional' },
    { id: COLLECTIONS.categories, label: 'Categorias' },
];
```

- [ ] **Step 2: Update ensureCollection for StoreConfig to include branding fields**

Find the StoreConfig ensureCollection call (around line 142):
```typescript
    await ensureCollection(apiKey, siteId, COLLECTIONS.storeConfig, 'Configuracoes da Loja', [
        { key: 'topbar', type: 'TEXT' },
        { key: 'whatsappGreeting', type: 'TEXT' },
        { key: 'tagline', type: 'TEXT' },
        { key: 'aboutText', type: 'RICH_TEXT' },
        { key: 'logo', type: 'URL' },
        { key: 'primaryColor', type: 'TEXT' },
        { key: 'secondaryColor', type: 'TEXT' },
    ]);
```
Replace with:
```typescript
    await ensureCollection(apiKey, siteId, COLLECTIONS.storeConfig, 'Configuracoes da Loja', [
        { key: 'topbar', type: 'TEXT' },
        { key: 'whatsappGreeting', type: 'TEXT' },
        { key: 'tagline', type: 'TEXT' },
        { key: 'aboutText', type: 'RICH_TEXT' },
        { key: 'logo', type: 'URL' },
        { key: 'primaryColor', type: 'TEXT' },
        { key: 'secondaryColor', type: 'TEXT' },
        { key: 'accentColor', type: 'TEXT' },
        { key: 'layoutType', type: 'TEXT' },
        { key: 'bannerBgColor', type: 'TEXT' },
        { key: 'bannerTextColor', type: 'TEXT' },
        { key: 'bannerCtaColor', type: 'TEXT' },
        { key: 'logoSvg', type: 'TEXT' },
        { key: 'logoVariant', type: 'TEXT' },
    ]);
```

- [ ] **Step 3: Update Banners ensureCollection to add color fields**

Find (around line 151):
```typescript
    await ensureCollection(apiKey, siteId, COLLECTIONS.banners, 'Banners e Hero', [
        { key: 'title', type: 'TEXT' },
        { key: 'subtext', type: 'TEXT' },
        { key: 'ctaLabel', type: 'TEXT' },
        { key: 'ctaLink', type: 'URL' },
        { key: 'theme', type: 'TEXT' },
        { key: 'order', type: 'NUMBER' },
        { key: 'image', type: 'URL' },
        { key: 'mobileImage', type: 'URL' },
    ]);
```
Replace with:
```typescript
    await ensureCollection(apiKey, siteId, COLLECTIONS.banners, 'Banners e Hero', [
        { key: 'title', type: 'TEXT' },
        { key: 'subtext', type: 'TEXT' },
        { key: 'ctaLabel', type: 'TEXT' },
        { key: 'ctaLink', type: 'URL' },
        { key: 'theme', type: 'TEXT' },
        { key: 'order', type: 'NUMBER' },
        { key: 'image', type: 'URL' },
        { key: 'mobileImage', type: 'URL' },
        { key: 'bgColor', type: 'TEXT' },
        { key: 'textColor', type: 'TEXT' },
        { key: 'ctaColor', type: 'TEXT' },
    ]);
```

- [ ] **Step 4: Remove Testimonials ensureCollection call**

Find and DELETE these lines (around line 166):
```typescript
    await ensureCollection(apiKey, siteId, COLLECTIONS.testimonials, 'Depoimentos', [
        { key: 'name', type: 'TEXT' },
        { key: 'city', type: 'TEXT' },
        { key: 'rating', type: 'NUMBER' },
        { key: 'text', type: 'RICH_TEXT' },
        { key: 'photo', type: 'URL' },
        { key: 'order', type: 'NUMBER' },
    ]);
```

- [ ] **Step 5: Update StoreConfig injection to include branding data**

Find the StoreConfig upsert (around line 206):
```typescript
    await clearCollection(apiKey, siteId, COLLECTIONS.storeConfig);
    await upsertItem(apiKey, siteId, COLLECTIONS.storeConfig, {
        topbar: content.topbar || '',
        whatsappGreeting: content.whatsappGreeting || '',
        tagline: footer.tagline || '',
        aboutText: footer.aboutText || '',
        logo: images.logo || '',
        primaryColor: onboarding.primaryColor || '#10b981',
        secondaryColor: onboarding.secondaryColor || '#18181b',
    });
```
Replace with:
```typescript
    await clearCollection(apiKey, siteId, COLLECTIONS.storeConfig);
    await upsertItem(apiKey, siteId, COLLECTIONS.storeConfig, {
        topbar: content.topbar || '',
        whatsappGreeting: content.whatsappGreeting || '',
        tagline: footer.tagline || '',
        aboutText: footer.aboutText || '',
        logo: images.logo || '',
        primaryColor: onboarding.primaryColor || '#10b981',
        secondaryColor: onboarding.secondaryColor || '#18181b',
        accentColor: onboarding.accentColor || '',
        layoutType: onboarding.layoutType || 'classic',
        bannerBgColor: onboarding.bannerBgColor || '',
        bannerTextColor: onboarding.bannerTextColor || '',
        bannerCtaColor: onboarding.bannerCtaColor || '',
        logoSvg: onboarding.logoSvg || '',
        logoVariant: onboarding.logoVariant || '',
    });
```

- [ ] **Step 6: Update Banners injection to include color data**

Find the Banners upsert (around line 217):
```typescript
    await clearCollection(apiKey, siteId, COLLECTIONS.banners);
    await upsertItem(apiKey, siteId, COLLECTIONS.banners, {
        title: '',
        subtext: '',
        ctaLabel: '',
        ctaLink: '',
        theme: 'dark',
        order: 0,
        image: onboarding.heroBannerDesktopUrl || '',
        mobileImage: onboarding.heroBannerMobileUrl || '',
    });
```
Replace with:
```typescript
    await clearCollection(apiKey, siteId, COLLECTIONS.banners);
    await upsertItem(apiKey, siteId, COLLECTIONS.banners, {
        title: (promoBanner.title as string) || '',
        subtext: (promoBanner.subtitle as string) || '',
        ctaLabel: (promoBanner.ctaLabel as string) || '',
        ctaLink: (promoBanner.ctaLink as string) || '',
        theme: 'dark',
        order: 0,
        image: onboarding.heroBannerDesktopUrl || '',
        mobileImage: onboarding.heroBannerMobileUrl || '',
        bgColor: onboarding.bannerBgColor || '',
        textColor: onboarding.bannerTextColor || '',
        ctaColor: onboarding.bannerCtaColor || '',
    });
```

- [ ] **Step 7: Remove Testimonials injection**

Find and DELETE these lines (around line 249):
```typescript
    await clearCollection(apiKey, siteId, COLLECTIONS.testimonials);
    await bulkUpsertItems(
        apiKey,
        siteId,
        COLLECTIONS.testimonials,
        testimonials.map((item, index) => ({
            ...item,
            photo: images[`testimonial${index + 1}`] || item.photo || '',
            order: index,
        }))
    );
```

- [ ] **Step 8: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -10`

- [ ] **Step 9: Commit**

```bash
git add app/api/inject/route.ts
git commit -m "feat: update inject pipeline with branding fields, remove testimonials"
```

---

### Task 5: Update Onboarding handleFinish to Chain Full Pipeline

**Files:**
- Modify: `app/onboarding/page.tsx`

- [ ] **Step 1: Add import for defaultContent**

Find (around line 14):
```typescript
import { getSession, setSession } from "@/lib/session";
```
Replace with:
```typescript
import { getSession, setSession } from "@/lib/session";
import { generateDefaultContent } from "@/lib/defaultContent";
```

- [ ] **Step 2: Replace handleFinish with full pipeline chain**

Find the entire `handleFinish` function (around lines 91-138):
```typescript
  const handleFinish = async () => {
    if (!form.storeName || !form.logoVariant) return;

    setCreating(true);
    try {
      const res = await fetch("/api/wix/create-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: form.storeName,
          primaryColor: form.palette.primary,
          secondaryColor: form.palette.secondary,
          accentColor: form.palette.accent,
          layoutType: form.layoutType,
          bannerBgColor: form.bannerBgColor,
          bannerTextColor: form.bannerTextColor,
          bannerCtaColor: form.bannerCtaColor,
          logoVariant: form.logoVariant,
          logoSvg: form.logoSvg,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao criar site");
        return;
      }

      setSession({
        onboarding: {
          ...getSession().onboarding!,
          siteId: data.siteId,
          siteUrl: data.siteUrl,
          siteName: form.storeName,
          instanceId: data.metaSiteId,
          apiKey: "",
        },
        storeId: data.storeId,
      });

      toast.success("Loja criada com sucesso!");
      router.push("/generate");
    } catch {
      toast.error("Erro ao criar site");
    } finally {
      setCreating(false);
    }
  };
```
Replace with:
```typescript
  const handleFinish = async () => {
    if (!form.storeName || !form.logoVariant) return;

    setCreating(true);
    try {
      // 1. Create Wix site
      const createRes = await fetch("/api/wix/create-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: form.storeName,
          primaryColor: form.palette.primary,
          secondaryColor: form.palette.secondary,
          accentColor: form.palette.accent,
          layoutType: form.layoutType,
          bannerBgColor: form.bannerBgColor,
          bannerTextColor: form.bannerTextColor,
          bannerCtaColor: form.bannerCtaColor,
          logoVariant: form.logoVariant,
          logoSvg: form.logoSvg,
        }),
      });

      const siteData = await createRes.json();
      if (!createRes.ok) {
        toast.error(siteData.error || "Erro ao criar site");
        return;
      }

      // 2. Generate default content
      const content = generateDefaultContent({
        storeName: form.storeName,
        primaryColor: form.palette.primary,
        secondaryColor: form.palette.secondary,
        accentColor: form.palette.accent,
        layoutType: form.layoutType,
        bannerBgColor: form.bannerBgColor,
        bannerTextColor: form.bannerTextColor,
        bannerCtaColor: form.bannerCtaColor,
        logoSvg: form.logoSvg,
        logoVariant: form.logoVariant,
      });

      // 3. Update session
      const updatedOnboarding = {
        ...getSession().onboarding!,
        siteId: siteData.siteId,
        siteUrl: siteData.siteUrl,
        siteName: form.storeName,
        instanceId: siteData.metaSiteId,
        apiKey: "",
        accentColor: form.palette.accent,
        layoutType: form.layoutType,
        bannerBgColor: form.bannerBgColor,
        bannerTextColor: form.bannerTextColor,
        bannerCtaColor: form.bannerCtaColor,
        logoSvg: form.logoSvg,
        logoVariant: form.logoVariant,
      };

      setSession({
        onboarding: updatedOnboarding,
        storeId: siteData.storeId,
        content,
      });

      // 4. Trigger injection
      const injectRes = await fetch("/api/inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: {
            ...content,
            onboarding: updatedOnboarding,
            images: {},
          },
          storeId: siteData.storeId,
          apiKey: updatedOnboarding.apiKey,
          siteId: siteData.siteId,
        }),
      });

      const injectData = await injectRes.json();
      if (!injectRes.ok) {
        toast.error(injectData.error || "Erro ao iniciar publicação");
        return;
      }

      // 5. Redirect to publishing
      toast.success("Loja criada! Publicando...");
      router.push(`/publishing?jobId=${injectData.jobId}`);
    } catch {
      toast.error("Erro ao criar site");
    } finally {
      setCreating(false);
    }
  };
```

- [ ] **Step 3: Update the button text for creating state**

Find (around line 282):
```typescript
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando loja...</>
```
Replace with:
```typescript
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando e publicando...</>
```

- [ ] **Step 4: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -10`

- [ ] **Step 5: Commit**

```bash
git add app/onboarding/page.tsx
git commit -m "feat: chain create-site → default content → inject → publishing in onboarding"
```

---

### Task 6: Update Publishing Page FLOW_STEPS

**Files:**
- Modify: `app/publishing/page.tsx`

- [ ] **Step 1: Update FLOW_STEPS to match new 4-step flow**

First READ the file, then find (around lines 12-19):
```typescript
const FLOW_STEPS = [
    { label: 'Dados da Loja' },
    { label: 'Conteúdo' },
    { label: 'Imagens' },
    { label: 'Preview' },
    { label: 'Publicar' },
    { label: 'Dashboard' },
];
```
Replace with:
```typescript
const FLOW_STEPS = [
    { label: 'Nome & Cores' },
    { label: 'Layout' },
    { label: 'Banners' },
    { label: 'Logo' },
    { label: 'Publicar' },
];
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -10`

- [ ] **Step 3: Commit**

```bash
git add app/publishing/page.tsx
git commit -m "feat: update publishing page flow steps to match new 4-step onboarding"
```

---

### Task 7: Type Check and Smoke Test

- [ ] **Step 1: Run final type check**

Run: `cd /Users/mateusnascimentonogueiradasilva/Desktop/Builder/builder-site-main && npx tsc --noEmit --pretty 2>&1 | grep -v cache-life | head -20`
Expected: No application errors

- [ ] **Step 2: Verify in browser**

Checklist:
1. Go to `/onboarding`, complete all 4 steps
2. Click "Finalizar" on step 4
3. Should see "Criando e publicando..." spinner
4. Should redirect to `/publishing?jobId=X`
5. Publishing page shows SSE logs in real-time
6. Logs should show: preflight → collections (no testimonials) → content injection (with branding fields) → publish
7. On success, "Ir para o Dashboard" button appears

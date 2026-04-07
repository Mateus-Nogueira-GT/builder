# Simplified Onboarding + Admin Provisioning Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace OAuth-based onboarding with a 2-step data collection flow, add Supabase schema fields, and create an admin provisioning page where the internal team inputs the user's Wix API Key + Site ID to inject products.

**Architecture:** The onboarding collects store name + template choice and saves to Supabase with status "pending". A new admin page at `/admin/provisioning` lists pending stores, lets the admin input Wix credentials, and triggers product injection using the user's API Key. The existing product sync pipeline (`/api/products/sync`) handles injection.

**Tech Stack:** Next.js 15, React 19, Supabase, Tailwind CSS, Wix Stores API

---

### Task 1: Add Supabase schema fields (template_id, status)

**Files:**
- Modify: `lib/schemas.ts:3-23`

The `stores` table needs two new columns. Run these via Supabase dashboard (SQL Editor):

- [ ] **Step 1: Run SQL migration in Supabase dashboard**

Open the Supabase dashboard → SQL Editor → run:

```sql
ALTER TABLE stores ADD COLUMN IF NOT EXISTS template_id TEXT DEFAULT NULL;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
```

- [ ] **Step 2: Update TypeScript interface**

In `lib/schemas.ts`, update the `Store` interface to include the new fields:

```typescript
export interface Store {
  id: string;
  name: string;
  wix_api_key: string | null;
  wix_site_id: string;
  wix_site_url: string | null;
  wix_instance_id: string | null;
  owner_id: string;
  owner_email: string | null;
  whatsapp: string | null;
  instagram: string | null;
  city: string | null;
  state: string | null;
  focus: "brasileirao" | "copa" | "retro" | "todos" | null;
  active_promotion: string | null;
  primary_color: string;
  secondary_color: string;
  connection_method: string | null;
  template_ready: boolean;
  template_id: string | null;
  status: "pending" | "provisioning" | "provisioned" | "error";
  created_at: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/schemas.ts
git commit -m "feat: add template_id and status fields to Store schema"
```

---

### Task 2: Simplify onboarding page (2 steps, no Wix connection)

**Files:**
- Modify: `app/onboarding/page.tsx`

- [ ] **Step 1: Rewrite onboarding to collect data only**

Replace `app/onboarding/page.tsx` with a 2-step flow:
- Step 0: Store name input
- Step 1: Template selection + "Finalizar Cadastro" button

On submit, POST to `/api/stores` with `name`, `templateId`, `status: "pending"`. Then redirect to `/onboarding/success`.

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { StepIndicator } from "@/components/StepIndicator";
import { TemplateSelector, type TemplateOption } from "@/components/TemplateSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shirt, ArrowRight, ArrowLeft, Store, LayoutTemplate, Loader2 } from "lucide-react";

const FLOW_STEPS = [
  { label: "Nome da Loja" },
  { label: "Template" },
];

function OnboardingContent() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null);

  const handleSubmit = async () => {
    if (!storeName || !selectedTemplate) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: storeName,
          templateId: selectedTemplate.id,
          status: "pending",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao salvar cadastro");
        setSubmitting(false);
        return;
      }

      router.push(`/onboarding/success?name=${encodeURIComponent(storeName)}`);
    } catch {
      toast.error("Erro ao salvar cadastro");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
            <Shirt className="h-6 w-6 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold">Kit Store Builder</h1>
        </div>

        <StepIndicator steps={FLOW_STEPS} currentStep={step} />

        {step === 0 && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Store className="h-5 w-5 text-emerald-500" />
                Nome da Loja
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Como sua loja vai se chamar? *</label>
                <Input
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Ex: Camisa10 Store"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(1)} disabled={storeName.length === 0} className="bg-emerald-500 text-black font-bold">
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <LayoutTemplate className="h-5 w-5 text-emerald-500" />
                Escolha o Template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-zinc-400">
                Selecione o modelo visual da sua loja. Todos já vêm com os produtos cadastrados.
              </p>
              <TemplateSelector selected={selectedTemplate?.siteId || null} onSelect={setSelectedTemplate} />
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(0)} className="border-zinc-700 text-zinc-300">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedTemplate || submitting}
                  className="bg-emerald-500 text-black font-bold hover:bg-emerald-400"
                >
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                  ) : (
                    <>Finalizar Cadastro <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <OnboardingContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/onboarding/page.tsx
git commit -m "feat: simplify onboarding to 2-step data collection (no Wix)"
```

---

### Task 3: Update stores API to accept template_id and status

**Files:**
- Modify: `app/api/stores/route.ts:40-61`

- [ ] **Step 1: Add template_id and status to the POST handler**

In the `POST` function of `app/api/stores/route.ts`, add the new fields to the insert object:

```typescript
const { data, error } = await supabase
  .from("stores")
  .insert({
    owner_id: token.id,
    name: body.name,
    wix_api_key: body.apiKey || null,
    wix_site_id: body.siteId || "pending",
    wix_site_url: body.siteUrl || null,
    wix_instance_id: body.instanceId || null,
    owner_email: body.email || null,
    whatsapp: body.whatsapp || null,
    instagram: body.instagram || null,
    city: body.city || null,
    state: body.state || null,
    focus: body.focus || "todos",
    active_promotion: body.activePromotion || null,
    primary_color: body.primaryColor || "#10b981",
    secondary_color: body.secondaryColor || "#18181b",
    connection_method: body.connectionMethod || "admin",
    template_id: body.templateId || null,
    status: body.status || "pending",
  })
  .select("*")
  .single();
```

- [ ] **Step 2: Commit**

```bash
git add app/api/stores/route.ts
git commit -m "feat: accept template_id and status in stores POST"
```

---

### Task 4: Update success page to show "waiting" message

**Files:**
- Modify: `app/onboarding/success/page.tsx`

- [ ] **Step 1: Rewrite success page**

Replace the current success page (which tries to publish) with a simple confirmation message:

```typescript
"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const name = searchParams.get("name") || "Sua Loja";

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle className="h-8 w-8 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Cadastro realizado!</h2>
          <p className="text-zinc-400 text-sm">
            Sua loja <strong className="text-white">{name}</strong> foi registrada com sucesso.
            Nossa equipe entrará em contato em breve para finalizar a configuração.
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          className="text-zinc-500 hover:text-zinc-300"
        >
          Ir para o Dashboard
        </Button>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <SuccessContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/onboarding/success/page.tsx
git commit -m "feat: update success page to waiting message"
```

---

### Task 5: Create admin provisioning API

**Files:**
- Create: `app/api/admin/provisioning/route.ts`

This endpoint lists pending stores (GET) and triggers product injection (POST).

- [ ] **Step 1: Create the provisioning API route**

```typescript
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabase } from "@/lib/supabase";
import { fetchTorcedorProductIds } from "@/lib/externalCatalog";

// GET: list stores by status
export async function GET(request: Request) {
  const token = await getToken({
    req: request as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.id || token.role !== "super_admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending";

  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST: save Wix credentials and trigger product injection
export async function POST(request: Request) {
  const token = await getToken({
    req: request as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.id || token.role !== "super_admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { storeId, wixApiKey, wixSiteId } = body;

    if (!storeId || !wixApiKey || !wixSiteId) {
      return NextResponse.json(
        { error: "storeId, wixApiKey e wixSiteId são obrigatórios" },
        { status: 400 }
      );
    }

    // Update store with Wix credentials
    const { error: updateError } = await supabase
      .from("stores")
      .update({
        wix_api_key: wixApiKey,
        wix_site_id: wixSiteId,
        status: "provisioning",
      })
      .eq("id", storeId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Fetch all product IDs from external catalog
    const productIds = await fetchTorcedorProductIds();

    if (productIds.length === 0) {
      return NextResponse.json({ error: "Nenhum produto encontrado no catálogo" }, { status: 400 });
    }

    // Trigger product sync using user's API Key
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const syncRes = await fetch(`${baseUrl}/api/products/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        siteId: wixSiteId,
        apiKey: wixApiKey,
        totalProductIds: productIds,
        initialOffset: 0,
      }),
    });

    const syncData = await syncRes.json();

    if (!syncRes.ok) {
      await supabase.from("stores").update({ status: "error" }).eq("id", storeId);
      return NextResponse.json({ error: syncData.error || "Falha ao iniciar sync" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      jobId: syncData.jobId,
      totalProducts: productIds.length,
    });
  } catch (err) {
    console.error("Provisioning error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao provisionar" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/admin/provisioning/route.ts
git commit -m "feat: add admin provisioning API (list pending + inject products)"
```

---

### Task 6: Create admin provisioning page

**Files:**
- Create: `app/admin/provisioning/page.tsx`

- [ ] **Step 1: Create the provisioning page**

```typescript
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TEMPLATES } from "@/components/TemplateSelector";
import { Shield, Loader2, Rocket, ExternalLink } from "lucide-react";

interface PendingStore {
  id: string;
  name: string;
  owner_email: string | null;
  template_id: string | null;
  status: string;
  created_at: string;
  wix_site_id: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400",
  provisioning: "bg-blue-500/10 text-blue-400",
  provisioned: "bg-emerald-500/10 text-emerald-400",
  error: "bg-red-500/10 text-red-400",
};

export default function ProvisioningPage() {
  const [stores, setStores] = useState<PendingStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [credentials, setCredentials] = useState<Record<string, { apiKey: string; siteId: string }>>({});
  const [provisioning, setProvisioning] = useState<Record<string, boolean>>({});

  const loadStores = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/provisioning?status=${filter}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStores(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar lojas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const getTemplateName = (templateId: string | null) => {
    if (!templateId) return "Não selecionado";
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    return tpl?.name || templateId;
  };

  const handleProvision = async (storeId: string) => {
    const creds = credentials[storeId];
    if (!creds?.apiKey || !creds?.siteId) {
      toast.error("Preencha API Key e Site ID");
      return;
    }

    setProvisioning((prev) => ({ ...prev, [storeId]: true }));
    try {
      const res = await fetch("/api/admin/provisioning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          wixApiKey: creds.apiKey,
          wixSiteId: creds.siteId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Injeção iniciada! ${data.totalProducts} produtos. Job: ${data.jobId}`);
      await loadStores();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao provisionar");
    } finally {
      setProvisioning((prev) => ({ ...prev, [storeId]: false }));
    }
  };

  const updateCreds = (storeId: string, field: "apiKey" | "siteId", value: string) => {
    setCredentials((prev) => ({
      ...prev,
      [storeId]: { ...prev[storeId], [field]: value },
    }));
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10">
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Provisioning</h1>
            <p className="text-sm text-zinc-400">Gerencie lojas pendentes e injete produtos</p>
          </div>
        </div>

        <div className="flex gap-2">
          {["pending", "provisioning", "provisioned", "error"].map((s) => (
            <Button
              key={s}
              variant={filter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(s)}
              className={filter === s ? "bg-emerald-500 text-black" : "border-zinc-700 text-zinc-300"}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
        ) : stores.length === 0 ? (
          <p className="text-center text-zinc-500 py-12">Nenhuma loja com status &quot;{filter}&quot;</p>
        ) : (
          <div className="space-y-4">
            {stores.map((store) => (
              <Card key={store.id} className="border-zinc-800 bg-zinc-900">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-lg">{store.name}</CardTitle>
                    <Badge className={STATUS_COLORS[store.status] || ""}>{store.status}</Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-zinc-500">
                    <span>Template: {getTemplateName(store.template_id)}</span>
                    <span>{new Date(store.created_at).toLocaleDateString("pt-BR")}</span>
                    {store.owner_email && <span>{store.owner_email}</span>}
                  </div>
                </CardHeader>
                {store.status === "pending" && (
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        placeholder="API Key do Wix do usuário"
                        value={credentials[store.id]?.apiKey || ""}
                        onChange={(e) => updateCreds(store.id, "apiKey", e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white text-sm"
                      />
                      <Input
                        placeholder="Site ID do Wix do usuário"
                        value={credentials[store.id]?.siteId || ""}
                        onChange={(e) => updateCreds(store.id, "siteId", e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => handleProvision(store.id)}
                        disabled={provisioning[store.id]}
                        className="bg-emerald-500 text-black font-bold hover:bg-emerald-400"
                      >
                        {provisioning[store.id] ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Injetando...</>
                        ) : (
                          <><Rocket className="mr-2 h-4 w-4" /> Injetar Produtos</>
                        )}
                      </Button>
                      <a
                        href="https://dev.wix.com/docs/rest/account-level-apis/api-keys/about-api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" /> Como gerar API Key
                      </a>
                    </div>
                  </CardContent>
                )}
                {store.status === "provisioned" && store.wix_site_id && store.wix_site_id !== "pending" && (
                  <CardContent>
                    <a
                      href={`https://manage.wix.com/dashboard/${store.wix_site_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" /> Abrir Dashboard Wix
                    </a>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/provisioning/page.tsx
git commit -m "feat: add admin provisioning page for product injection"
```

---

### Task 7: Final commit and push

- [ ] **Step 1: Push all changes**

```bash
git push
```

- [ ] **Step 2: Verify on Vercel**

Test the flow:
1. Go to `/onboarding` — should show 2 steps (name + template)
2. Fill in and submit — should redirect to success page with waiting message
3. Go to `/admin/provisioning` — should show the pending store
4. Fill in API Key + Site ID — click "Injetar Produtos"
5. Verify products appear on the Wix site

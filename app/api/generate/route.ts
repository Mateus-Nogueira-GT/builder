import { NextResponse } from "next/server";
import type { StoreContent } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeName, focus, city, state, activePromotion, whatsapp } = body.onboarding || body;

    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openaiKey) {
      // Fallback: gera conteúdo padrão sem IA
      return NextResponse.json(generateFallbackContent({
        storeName,
        focus,
        city,
        state,
        activePromotion,
        whatsapp,
      }));
    }

    // Gera com OpenAI
    const prompt = buildPrompt({ storeName, focus, city, state, activePromotion, whatsapp });

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Você é um copywriter especializado em e-commerce de camisas de futebol. Gere conteúdo persuasivo em português brasileiro. Responda APENAS com JSON válido, sem markdown.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!res.ok) {
      console.error("OpenAI error:", await res.text());
      return NextResponse.json(
        generateFallbackContent({ storeName, focus, city, state, activePromotion, whatsapp })
      );
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "";

    try {
      const content: StoreContent = JSON.parse(raw);
      return NextResponse.json(content);
    } catch {
      // Se o JSON for inválido, usa fallback
      return NextResponse.json(
        generateFallbackContent({ storeName, focus, city, state, activePromotion, whatsapp })
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao gerar conteúdo" },
      { status: 500 }
    );
  }
}

interface ContentParams {
  storeName: string;
  focus: string;
  city: string;
  state: string;
  activePromotion: string;
  whatsapp: string;
}

function buildPrompt(params: ContentParams): string {
  return `Gere o conteúdo para uma loja de camisas de futebol com as seguintes informações:
- Nome: ${params.storeName || "Kit Store"}
- Foco: ${params.focus || "todos os estilos"}
- Localização: ${params.city || "Brasil"}, ${params.state || ""}
- Promoção ativa: ${params.activePromotion || "Compre 2 Leve 3"}
- WhatsApp: ${params.whatsapp || ""}

Retorne um JSON com esta estrutura exata:
{
  "topbar": "mensagem curta para o topo do site (max 60 chars)",
  "whatsappGreeting": "mensagem de saudação para WhatsApp",
  "trustBar": [
    {"icon": "shield", "text": "texto do item 1"},
    {"icon": "truck", "text": "texto do item 2"},
    {"icon": "creditcard", "text": "texto do item 3"}
  ],
  "promoBanner": {
    "title": "título do banner promocional",
    "subtitle": "subtítulo",
    "ctaLabel": "texto do botão",
    "ctaLink": "/colecao"
  },
  "testimonials": [
    {"name": "Nome", "city": "Cidade", "rating": 5, "text": "depoimento"},
    {"name": "Nome", "city": "Cidade", "rating": 5, "text": "depoimento"},
    {"name": "Nome", "city": "Cidade", "rating": 4, "text": "depoimento"},
    {"name": "Nome", "city": "Cidade", "rating": 5, "text": "depoimento"}
  ],
  "categories": [
    {"name": "Categoria 1", "image": ""},
    {"name": "Categoria 2", "image": ""},
    {"name": "Categoria 3", "image": ""},
    {"name": "Categoria 4", "image": ""}
  ],
  "footer": {
    "tagline": "tagline da loja",
    "aboutText": "texto sobre a loja (2-3 frases)"
  }
}`;
}

function generateFallbackContent(params: ContentParams): StoreContent {
  const name = params.storeName || "Kit Store";
  return {
    topbar: `${params.activePromotion || "Compre 2 Leve 3"} | Frete grátis acima de R$199`,
    whatsappGreeting: `Olá! Vi seu site ${name} e quero saber mais sobre as camisas!`,
    trustBar: [
      { icon: "shield", text: "Qualidade garantida" },
      { icon: "truck", text: "Entrega para todo Brasil" },
      { icon: "creditcard", text: "Parcele em até 12x" },
    ],
    promoBanner: {
      title: params.activePromotion || "Compre 2 Leve 3",
      subtitle: "Aproveite nossa promoção por tempo limitado",
      ctaLabel: "Ver Ofertas",
      ctaLink: "/colecao",
    },
    testimonials: [
      { name: "Carlos Silva", city: params.city || "São Paulo", rating: 5, text: "Qualidade incrível! A camisa é idêntica à original." },
      { name: "Ana Souza", city: "Rio de Janeiro", rating: 5, text: "Entrega rápida e produto excelente. Recomendo!" },
      { name: "Pedro Santos", city: "Belo Horizonte", rating: 4, text: "Ótimo custo-benefício. Já comprei 3 vezes." },
      { name: "Julia Lima", city: "Curitiba", rating: 5, text: "Atendimento nota 10 pelo WhatsApp. Tiram todas as dúvidas." },
    ],
    categories: [
      { name: "Brasileirão", image: "" },
      { name: "Seleções", image: "" },
      { name: "Europa", image: "" },
      { name: "Retrô", image: "" },
    ],
    footer: {
      tagline: `${name} — Vista a camisa do seu time.`,
      aboutText: `A ${name} é referência em camisas de futebol em ${params.city || "todo o Brasil"}. Trabalhamos com as melhores réplicas do mercado, garantindo qualidade e satisfação.`,
    },
  };
}

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

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

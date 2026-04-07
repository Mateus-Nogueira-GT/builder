/**
 * Opções de cor para o catálogo de banners hero.
 * Usadas no admin para categorizar e no onboarding para filtrar.
 */
export const BANNER_COLOR_OPTIONS = [
  "VERMELHO",
  "AZUL",
  "VERDE",
  "AMARELO",
  "PRETO",
  "BRANCO",
  "ROXO",
  "LARANJA",
] as const;

export type BannerColor = (typeof BANNER_COLOR_OPTIONS)[number];

/**
 * IDs das collections CMS no Wix.
 * Cada collection armazena uma seção do conteúdo da loja.
 *
 * Esses IDs devem corresponder às collections criadas no template Wix.
 * Se você alterar o template, atualize os IDs aqui.
 */
export const COLLECTIONS = {
  storeConfig: "StoreConfig",
  banners: "Banners",
  trustBar: "TrustBar",
  testimonials: "Testimonials",
  categories: "Categories",
  promoBanner: "PromoBanner",
} as const;

export type CollectionId = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

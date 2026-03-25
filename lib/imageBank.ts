/**
 * Banco de imagens pré-definidas para seleção no builder.
 * Em produção, essas URLs apontariam para um bucket Supabase ou CDN.
 */

export interface ImageItem {
  id: string;
  url: string;
  label: string;
}

const PROMO_BANNER_IMAGES: ImageItem[] = [
  {
    id: "promo-1",
    url: "https://placehold.co/1200x400/10b981/ffffff?text=Promo+Banner+1",
    label: "Promoção Verde",
  },
  {
    id: "promo-2",
    url: "https://placehold.co/1200x400/dc2626/ffffff?text=Promo+Banner+2",
    label: "Promoção Vermelha",
  },
  {
    id: "promo-3",
    url: "https://placehold.co/1200x400/2563eb/ffffff?text=Promo+Banner+3",
    label: "Promoção Azul",
  },
  {
    id: "promo-4",
    url: "https://placehold.co/1200x400/18181b/ffffff?text=Promo+Banner+4",
    label: "Promoção Dark",
  },
];

const TESTIMONIAL_IMAGES: ImageItem[] = [
  {
    id: "test-1",
    url: "https://placehold.co/400x500/374151/ffffff?text=Cliente+1",
    label: "Cliente 1",
  },
  {
    id: "test-2",
    url: "https://placehold.co/400x500/374151/ffffff?text=Cliente+2",
    label: "Cliente 2",
  },
  {
    id: "test-3",
    url: "https://placehold.co/400x500/374151/ffffff?text=Cliente+3",
    label: "Cliente 3",
  },
  {
    id: "test-4",
    url: "https://placehold.co/400x500/374151/ffffff?text=Cliente+4",
    label: "Cliente 4",
  },
  {
    id: "test-5",
    url: "https://placehold.co/400x500/374151/ffffff?text=Cliente+5",
    label: "Cliente 5",
  },
  {
    id: "test-6",
    url: "https://placehold.co/400x500/374151/ffffff?text=Cliente+6",
    label: "Cliente 6",
  },
];

export function getPromoBannerImages(): ImageItem[] {
  return PROMO_BANNER_IMAGES;
}

export function getTestimonialImages(): ImageItem[] {
  return TESTIMONIAL_IMAGES;
}

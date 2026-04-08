/* ───────────────────────────── Store (Supabase) ───────────────────────────── */

export interface Store {
  id: string;
  name: string;
  wix_site_id: string | null;
  wix_api_key: string | null;
  wix_site_url: string | null;
  wix_refresh_token: string | null;
  owner_name: string | null;
  owner_email: string | null;
  whatsapp: string | null;
  instagram: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string | null;
  layout_type: string | null;
  banner_bg_color: string | null;
  banner_text_color: string | null;
  banner_cta_color: string | null;
  logo_variant: string | null;
  logo_svg: string | null;
  // wix_refresh_token → used as template_id
  // layout_type → used as status (pending/provisioning/provisioned/error)
  created_at: string;
}

/* ──────────────────────────── Onboarding Data ─────────────────────────────── */

export interface OnboardingData {
  connectionMethod: "api_key" | "oauth";
  apiKey: string;
  siteId: string;
  storeName: string;
  siteUrl: string;
  email: string;
  whatsapp: string;
  instagram: string;
  city: string;
  state: string;
  focus: "brasileirao" | "copa" | "retro" | "todos";
  featuredTeams: string[];
  activePromotion: string;
  primaryColor: string;
  secondaryColor: string;
  heroBannerColor: string;
  heroBannerId: string;
  heroBannerDesktopUrl: string;
  heroBannerMobileUrl: string;
  heroBannerThumbnailUrl: string;
  siteName: string;
  instanceId: string;
  accentColor?: string;
  layoutType?: "classic" | "modern";
  bannerBgColor?: string;
  bannerTextColor?: string;
  bannerCtaColor?: string;
  logoSvg?: string;
  logoVariant?: string;
}

/* ────────────────────────── Store Content (IA) ────────────────────────────── */

export interface TrustBarItem {
  icon: string;
  text: string;
}

export interface PromoBanner {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaLink: string;
}

export interface Testimonial {
  name: string;
  city: string;
  rating: number;
  text: string;
  photo?: string;
}

export interface Category {
  name: string;
  image: string;
  link?: string;
}

export interface FooterContent {
  tagline: string;
  aboutText: string;
}

export interface StoreContent {
  topbar: string;
  whatsappGreeting: string;
  trustBar: TrustBarItem[];
  promoBanner: PromoBanner;
  testimonials: Testimonial[];
  categories: Category[];
  footer: FooterContent;
}

/* ──────────────────────────── Session Data ─────────────────────────────────── */

export interface SessionImages {
  promoBanner?: string;
  testimonial1?: string;
  testimonial2?: string;
  logo?: string;
}

export interface SessionData {
  onboarding?: OnboardingData;
  content?: StoreContent;
  images?: SessionImages;
  storeId?: string;
}

/* ──────────────────────────── Provision Run ────────────────────────────────── */

export interface ProvisionLog {
  message: string;
  status: "running" | "success" | "warning" | "error";
  step?: string;
  timestamp: string;
}

export interface ProvisionRun {
  id: string;
  store_id: string | null;
  site_id: string;
  payload: Record<string, unknown>;
  status: "pending" | "running" | "success" | "error";
  result: {
    logs: ProvisionLog[];
    siteUrl?: string;
    lastError?: string;
    currentStep?: string | null;
    completedAt?: string;
    storage?: string;
  } | null;
  created_at: string;
}

/* ──────────────────────────── Wix Types ───────────────────────────────────── */

export interface WixCollectionField {
  key: string;
  type: "TEXT" | "RICH_TEXT" | "NUMBER" | "URL" | "IMAGE" | "BOOLEAN";
}

export interface PreflightCheck {
  label: string;
  status: "success" | "warning" | "error";
  details: string;
}

export interface PreflightResult {
  ok: boolean;
  checks: PreflightCheck[];
  siteUrl?: string;
}

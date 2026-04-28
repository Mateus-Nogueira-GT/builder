import type { CatalogProduct } from "./externalCatalog";
import { buildSizeProductOptions, type WixProductOption } from "./sizes";

export interface WixProduct {
  name: string;
  description: string;
  productType: string;
  priceData: { price: number; currency: string };
  sku: string;
  media: { items: Array<{ image: { url: string } }> };
  visible: boolean;
  productOptions?: WixProductOption[];
  manageVariants?: boolean;
}

export function mapToWixProduct(product: CatalogProduct): WixProduct {
  const imageUrls = (product.images || [])
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((img) => img.src)
    .filter(Boolean);

  const rawPrice = parseFloat(product.variants?.[0]?.price || "0");
  const price = Number.isFinite(rawPrice) ? rawPrice : 0;

  const productOptions = buildSizeProductOptions(product.sizes);
  const hasOptions = productOptions.length > 0;

  return {
    name: (product.name?.pt || "Produto sem nome").slice(0, 80),
    description: (product.description?.pt || "").slice(0, 7999),
    productType: "physical",
    priceData: { price, currency: "BRL" },
    sku: product.sku || "",
    media: { items: imageUrls.map((url) => ({ image: { url } })) },
    visible: product.is_published ?? true,
    ...(hasOptions ? { productOptions, manageVariants: true } : {}),
  };
}

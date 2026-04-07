import type { CatalogProduct } from "./externalCatalog";

export interface WixProduct {
  name: string;
  description: string;
  productType: "physical";
  priceData: { price: number; currency: string };
  sku: string;
  imageUrls: string[];
  visible: boolean;
}

export function mapToWixProduct(product: CatalogProduct): WixProduct {
  const imageUrls = (product.images || [])
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((img) => img.src)
    .filter(Boolean);

  const rawPrice = parseFloat(product.variants?.[0]?.price || "0");
  const price = Number.isFinite(rawPrice) ? rawPrice : 0;

  return {
    name: (product.name?.pt || "Produto sem nome").slice(0, 80),
    description: (product.description?.pt || "").slice(0, 7999),
    productType: "physical",
    priceData: { price, currency: "BRL" },
    sku: product.sku || "",
    imageUrls,
    visible: product.is_published ?? true,
  };
}

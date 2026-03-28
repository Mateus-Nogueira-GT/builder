import type { CatalogProduct } from "./externalCatalog";

export interface WixProduct {
  name: string;
  description: string;
  productType: "physical";
  priceData: { price: number; currency: string };
  sku: string;
  media: { items: Array<{ image: { url: string } }> };
  visible: boolean;
}

export function mapToWixProduct(product: CatalogProduct): WixProduct {
  const images = (product.images || [])
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((img) => ({ image: { url: img.src } }));

  const price = parseFloat(product.variants?.[0]?.price || "0");

  return {
    name: product.name?.pt || "Produto sem nome",
    description: product.description?.pt || "",
    productType: "physical",
    priceData: { price, currency: "BRL" },
    sku: product.sku || "",
    media: { items: images },
    visible: product.is_published ?? true,
  };
}

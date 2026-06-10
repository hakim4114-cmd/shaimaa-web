import { products } from "@/data/products";
import { getSiteUrl } from "@/lib/siteUrl";

export default function sitemap() {
  const siteUrl = getSiteUrl();
  const staticPaths = ["", "/products", "/order", "/track-order", "/size-guide", "/about", "/europe"];
  const productPaths = products.map((product) => `/products/${product.slug}`);

  return [...staticPaths, ...productPaths].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "weekly"
  }));
}

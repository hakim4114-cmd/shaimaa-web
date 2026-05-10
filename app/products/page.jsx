import { ProductListingPage } from "@/components/products/ProductListingPage";

export const metadata = {
  title: "Collection | Maison Shaimaa",
  description:
    "Browse Maison Shaimaa premium Moroccan djellabas and traditional fashion pieces with cash on delivery in Morocco.",
  alternates: {
    canonical: "/products"
  }
};

export default function ProductsPage() {
  return <ProductListingPage />;
}

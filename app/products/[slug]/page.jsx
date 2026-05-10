import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CODTrust } from "@/components/home/CODTrust";
import { FAQ } from "@/components/home/FAQ";
import { ProductDetailHeader, ProductOrderSection } from "@/components/products/ProductDetailPageCopy";
import { ProductGallery } from "@/components/products/ProductGallery";
import { ProductInfo } from "@/components/products/ProductInfo";
import { ProductObjectionLayer, ProductRelatedAndFAQ } from "@/components/products/ProductObjectionSections";
import { ProductPersuasionBlock } from "@/components/products/ProductPersuasionSections";
import { products } from "@/data/products";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);

  if (!product) {
    return {
      title: "Product not found | Maison Shaimaa"
    };
  }

  const title = `${product.name} | Maison Shaimaa`;
  const description = product.description;
  const productUrl = `/products/${product.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: productUrl
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: productUrl,
      siteName: "Maison Shaimaa",
      images: product.hasFinalImage
        ? [
            {
              url: product.image,
              alt: product.name
            }
          ]
        : undefined
    }
  };
}

export default async function ProductDetailPage({ params }) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);

  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen overflow-x-hidden pt-16 sm:pt-20">
      <Header />
      <ProductDetailHeader />

      <section className="px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2 lg:items-center">
          <ProductGallery product={product} />
          <ProductInfo product={product} />
        </div>
      </section>

      <ProductObjectionLayer product={product} />
      <ProductPersuasionBlock product={product} />
      <ProductOrderSection productSlug={product.slug} />
      <ProductRelatedAndFAQ product={product} />

      <CODTrust />
      <FAQ />
      <Footer />
    </main>
  );
}

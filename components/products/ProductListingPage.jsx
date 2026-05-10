"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StickyWhatsAppButton } from "@/components/layout/StickyWhatsAppButton";
import { useSelectedLanguage } from "@/components/layout/LanguageSwitcher";
import { ProductCard } from "@/components/products/ProductCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { products } from "@/data/products";
import { getLanguageDirection, getTranslation } from "@/data/translations";

const categoryLinks = [
  { key: "djellabas", href: "/products?category=djellabas" },
  { key: "sets", href: "/products?category=sets" },
  { key: "limitedPieces", href: "/products?category=limited-pieces" }
];

export function ProductListingPage() {
  const language = useSelectedLanguage();
  const direction = getLanguageDirection(language);
  const translation = getTranslation(language);
  const productsPage = translation.productsPage;
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";

  return (
    <main className="min-h-screen overflow-x-hidden pt-16 sm:pt-20">
      <Header />
      <section dir={direction} className="px-4 pb-12 pt-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <SectionTitle label={productsPage.label} title={productsPage.title} text={productsPage.text} />
        <div className={`mx-auto mt-8 grid max-w-7xl gap-3 sm:grid-cols-3 ${textAlignment}`}>
          {categoryLinks.map((category) => (
            <Link
              key={category.href}
              href={category.href}
              className="border border-brass/25 bg-ivory px-5 py-4 text-sm font-bold uppercase tracking-[0.12em] text-cedar shadow-soft outline-none transition hover:border-henna hover:text-henna focus-visible:border-henna focus-visible:text-henna focus-visible:ring-2 focus-visible:ring-henna focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
            >
              {productsPage.categories[category.key]}
            </Link>
          ))}
        </div>
        <div className="mx-auto mt-10 grid max-w-7xl gap-5 md:grid-cols-3">
          {products.map((product) => {
            const productCopy = translation.productDetail.products?.[product.slug] || product;

            return (
              <ProductCard
                key={product.slug}
                product={product}
                productCopy={productCopy}
                direction={direction}
                labels={translation.productCard}
              />
            );
          })}
        </div>
      </section>
      <Footer />
      <StickyWhatsAppButton />
    </main>
  );
}

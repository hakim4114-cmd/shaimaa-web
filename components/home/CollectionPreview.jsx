"use client";

import { products } from "@/data/products";
import { ProductCard } from "@/components/products/ProductCard";
import { useSelectedLanguage } from "@/components/layout/LanguageSwitcher";
import { getLanguageDirection, getTranslation } from "@/data/translations";

export function CollectionPreview() {
  const language = useSelectedLanguage();
  const direction = getLanguageDirection(language);
  const translation = getTranslation(language);
  const collection = translation.collectionPreview;
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";
  const headerDirection = direction === "rtl" ? "md:flex-row-reverse" : "md:flex-row";

  return (
    <section id="collection" dir={direction} className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className={`mb-10 flex flex-col justify-between gap-5 md:items-end ${headerDirection}`}>
          <div>
            <p className={`text-sm font-bold uppercase tracking-[0.18em] text-henna ${textAlignment}`}>
              {collection.label}
            </p>
            <h2 className="mt-3 font-display text-4xl font-bold text-cedar sm:text-5xl">
              {collection.title}
            </h2>
          </div>
          <p className={`max-w-md leading-7 text-coffee ${textAlignment}`}>{collection.text}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
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
      </div>
    </section>
  );
}

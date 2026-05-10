"use client";

import Link from "next/link";
import { Check, PackageCheck, Palette, Scissors, Shirt, Truck, WalletCards } from "lucide-react";
import { useSelectedLanguage } from "@/components/layout/LanguageSwitcher";
import { getLanguageDirection, getTranslation } from "@/data/translations";
import { products } from "@/data/products";

const trustIcons = [Palette, WalletCards, Truck, PackageCheck];

function formatText(template, values) {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
}

function getProductCopy(product, productDetail) {
  return productDetail.products?.[product.slug] || product;
}

function getTranslatedColorList(product, productCopy) {
  return product.colors.map((color) => productCopy.colors?.[color] || color).join(", ");
}

export function ProductTrustBox({ product, productCopy, productDetail, direction }) {
  const objections = productDetail.objections;
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";
  const trustCards = [
    {
      title: objections.availableColorsTitle,
      text: formatText(objections.availableColorsText, {
        colors: getTranslatedColorList(product, productCopy)
      })
    },
    {
      title: objections.priceTitle,
      text: formatText(objections.priceText, {
        price: product.price
      })
    },
    {
      title: objections.deliveryTitle,
      text: objections.deliveryText
    },
    {
      title: objections.codTitle,
      text: objections.codText
    }
  ];

  return (
    <section dir={direction} className="bg-ivory px-4 pb-8 sm:px-6 lg:px-8">
      <div className={`mx-auto max-w-7xl ${textAlignment}`}>
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-henna">{objections.trustIntro}</p>
        <div className="grid gap-3 md:grid-cols-4">
          {trustCards.map(({ title, text }, index) => {
            const Icon = trustIcons[index];
            return (
              <div key={title} className="border border-brass/25 bg-pearl p-4">
                <Icon className="mb-3 text-henna" size={20} />
                <h2 className="font-display text-2xl font-semibold text-cedar">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-coffee">{text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function ProductCraftBlock({ productCopy, productDetail, direction }) {
  const objections = productDetail.objections;
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";

  return (
    <section dir={direction} className="px-4 pb-8 sm:px-6 lg:px-8">
      <div className={`mx-auto grid max-w-7xl gap-4 md:grid-cols-[0.9fr_1.1fr] ${textAlignment}`}>
        <div className="bg-cedar p-6 text-ivory shadow-soft">
          <Scissors className="mb-4 text-brass" size={24} />
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-brass">{objections.craftLabel}</p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-tight">{objections.craftTitle}</h2>
          <p className="mt-4 leading-7 text-pearl/80">{objections.craftText}</p>
        </div>

        <div className="grid gap-4 bg-ivory p-6 shadow-soft">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <Shirt className="text-henna" size={20} />
              <h3 className="font-display text-2xl font-semibold text-cedar">{productDetail.fabric}</h3>
            </div>
            <p className="text-sm leading-7 text-coffee">{productCopy.fabric}</p>
          </div>

          <div className="border-t border-brass/20 pt-4">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-henna">
              {productDetail.craftsmanship}
            </p>
            <div className="grid gap-2">
              {productCopy.craftsmanship.map((item) => (
                <div key={item} className="flex gap-3 text-sm leading-6 text-coffee">
                  <Check className="mt-1 shrink-0 text-brass" size={16} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function RelatedProducts({ currentProduct, productDetail, direction }) {
  const objections = productDetail.objections;
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";
  const relatedProducts = products.filter((product) => product.slug !== currentProduct.slug).slice(0, 2);

  return (
    <section dir={direction} className="px-4 pb-8 sm:px-6 lg:px-8">
      <div className={`mx-auto max-w-7xl ${textAlignment}`}>
        <div className="mb-5">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-henna">{objections.relatedLabel}</p>
          <h2 className="mt-2 font-display text-4xl font-bold text-cedar">{objections.relatedTitle}</h2>
          <p className="mt-3 max-w-2xl leading-7 text-coffee">{objections.relatedText}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {relatedProducts.map((product) => {
            const relatedCopy = getProductCopy(product, productDetail);
            return (
              <Link
                key={product.slug}
                href={`/products/${product.slug}`}
                className="group grid gap-4 border border-brass/25 bg-ivory p-5 shadow-soft transition hover:border-henna md:grid-cols-[0.7fr_1fr]"
              >
                <div className="relative min-h-40 overflow-hidden bg-pearl">
                  <div className="absolute inset-0" style={{ background: product.placeholderGradient }}>
                    <div className="absolute inset-x-8 bottom-0 top-8 rounded-t-[5rem] bg-ivory/70 transition group-hover:-translate-y-1" />
                    <div className="absolute left-1/2 top-12 h-24 w-16 -translate-x-1/2 rounded-t-[4rem] border border-brass/60 bg-pearl/80" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.12em] text-henna">{relatedCopy.tag}</p>
                  <h3 className="mt-2 font-display text-3xl font-semibold text-cedar">{relatedCopy.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-coffee">{relatedCopy.color}</p>
                  <p dir="ltr" className="mt-3 font-bold text-henna">{product.price}</p>
                  <span className="mt-4 inline-flex text-sm font-bold text-cedar underline-offset-4 group-hover:text-henna group-hover:underline">
                    {objections.relatedCta}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function ProductFAQ({ product, productCopy, productDetail, direction }) {
  const objections = productDetail.objections;
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";
  const faqItems = objections.faqItems.map((item) => ({
    question: item.question,
    answer: formatText(item.answer, {
      colors: getTranslatedColorList(product, productCopy),
      price: product.price
    })
  }));

  return (
    <section dir={direction} className="px-4 pb-16 sm:px-6 lg:px-8">
      <div className={`mx-auto max-w-4xl ${textAlignment}`}>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-henna">{objections.faqLabel}</p>
        <h2 className="mt-2 font-display text-4xl font-bold text-cedar">{objections.faqTitle}</h2>
        <div className="mt-6 divide-y divide-brass/20 border-y border-brass/30">
          {faqItems.map((item) => (
            <details key={item.question} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-2xl font-semibold text-cedar">
                {item.question}
                <span className="text-henna transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-7 text-coffee">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProductObjectionLayer({ product }) {
  const language = useSelectedLanguage();
  const direction = getLanguageDirection(language);
  const productDetail = getTranslation(language).productDetail;
  const productCopy = getProductCopy(product, productDetail);

  return (
    <>
      <ProductTrustBox product={product} productCopy={productCopy} productDetail={productDetail} direction={direction} />
      <ProductCraftBlock productCopy={productCopy} productDetail={productDetail} direction={direction} />
    </>
  );
}

export function ProductRelatedAndFAQ({ product }) {
  const language = useSelectedLanguage();
  const direction = getLanguageDirection(language);
  const productDetail = getTranslation(language).productDetail;
  const productCopy = getProductCopy(product, productDetail);

  return (
    <>
      <ProductFAQ product={product} productCopy={productCopy} productDetail={productDetail} direction={direction} />
      <RelatedProducts currentProduct={product} productDetail={productDetail} direction={direction} />
    </>
  );
}

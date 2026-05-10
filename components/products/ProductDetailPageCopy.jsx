"use client";

import Link from "next/link";
import { CODOrderForm } from "@/components/forms/CODOrderForm";
import { useSelectedLanguage } from "@/components/layout/LanguageSwitcher";
import { getLanguageDirection, getTranslation } from "@/data/translations";

export function ProductDetailHeader() {
  const language = useSelectedLanguage();
  const direction = getLanguageDirection(language);
  const productDetail = getTranslation(language).productDetail;
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";
  const maxWidthAlignment = direction === "rtl" ? "me-auto" : "";

  return (
    <section dir={direction} className="px-4 pb-6 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
      <div className={`mx-auto max-w-7xl ${textAlignment}`}>
        <Link href="/products" className="text-sm font-bold uppercase tracking-[0.12em] text-coffee hover:text-henna">
          {productDetail.backToCollection}
        </Link>
        <p className="mt-4 text-sm font-bold uppercase tracking-[0.18em] text-henna">{productDetail.eyebrow}</p>
        <h1
          className={`mt-3 max-w-3xl font-display text-4xl font-bold leading-tight text-cedar sm:text-5xl ${maxWidthAlignment}`}
        >
          {productDetail.title}
        </h1>
        <p className={`mt-4 max-w-2xl leading-7 text-coffee ${maxWidthAlignment}`}>{productDetail.text}</p>
      </div>
    </section>
  );
}

export function ProductOrderSection({ productSlug }) {
  const language = useSelectedLanguage();
  const direction = getLanguageDirection(language);
  const productDetail = getTranslation(language).productDetail;
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";
  const maxWidthAlignment = direction === "rtl" ? "me-auto" : "";

  return (
    <section id="order-form" dir={direction} className="scroll-mt-24 px-4 pb-12 sm:px-6 lg:px-8 lg:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className={`mb-7 max-w-2xl ${textAlignment} ${maxWidthAlignment}`}>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-henna">{productDetail.orderLabel}</p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-cedar sm:text-5xl">
            {productDetail.orderTitle}
          </h2>
          <p className="mt-4 leading-7 text-coffee">{productDetail.orderText}</p>
        </div>
        <CODOrderForm
          initialProductSlug={productSlug}
          lockProduct
          intro={productDetail.orderIntro}
          source="Product Page COD Form"
        />
      </div>
    </section>
  );
}

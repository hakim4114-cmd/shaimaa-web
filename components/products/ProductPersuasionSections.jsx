"use client";

import Link from "next/link";
import { CheckCircle2, Heart, Palette, PenLine, Ruler, ShieldCheck, Sparkles, Truck, WalletCards } from "lucide-react";
import { useSelectedLanguage } from "@/components/layout/LanguageSwitcher";
import { getLanguageDirection, getTranslation } from "@/data/translations";

const valueIcons = [PenLine, Sparkles, Heart];
const reassuranceIcons = [WalletCards, Truck, Ruler, ShieldCheck];

function formatText(template, values) {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
}

function getProductCopy(product, productDetail) {
  return productDetail.products?.[product.slug] || product;
}

function getTranslatedColorList(product, productCopy) {
  return product.colors.map((color) => productCopy.colors?.[color] || color).join(", ");
}

export function ProductValueStack({ persuasion, product, productCopy, direction }) {
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";
  const valueCards = persuasion.valueCards.map((card, index) => ({
    ...card,
    Icon: valueIcons[index]
  }));

  return (
    <div className={`grid gap-4 lg:grid-cols-[0.9fr_1.1fr] ${textAlignment}`}>
      <div className="bg-cedar p-6 text-ivory shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-brass">{persuasion.valueLabel}</p>
        <h2 className="mt-3 font-display text-4xl font-bold leading-tight">{persuasion.valueTitle}</h2>
        <p className="mt-4 leading-7 text-pearl/80">
          {formatText(persuasion.valueDescription, {
            price: product.price,
            colors: getTranslatedColorList(product, productCopy)
          })}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {valueCards.map(({ title, text, Icon }) => (
          <div key={title} className="bg-ivory p-5 shadow-soft">
            <Icon className="mb-4 text-henna" size={22} />
            <h3 className="font-display text-2xl font-semibold text-cedar">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-coffee">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductSoftUrgency({ persuasion, product, productCopy, direction }) {
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";

  return (
    <div className={`grid gap-4 border-y border-brass/25 py-6 md:grid-cols-[0.9fr_1.1fr] ${textAlignment}`}>
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-henna">{persuasion.urgencyLabel}</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-cedar">{persuasion.urgencyTitle}</h2>
      </div>
      <p className="leading-7 text-coffee">
        {formatText(persuasion.urgencyDescription, {
          colors: getTranslatedColorList(product, productCopy)
        })}
      </p>
    </div>
  );
}

export function ProductDecisionSteps({ persuasion, direction }) {
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";
  const iconDirection = direction === "rtl" ? "flex-row-reverse" : "";
  const stepIcons = [Palette, Ruler, Truck, CheckCircle2];

  return (
    <div className={textAlignment}>
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-henna">{persuasion.stepsLabel}</p>
      <h2 className="mt-2 font-display text-3xl font-bold text-cedar">{persuasion.stepsTitle}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {persuasion.steps.map((step, index) => {
          const Icon = stepIcons[index];
          return (
            <div key={step.title} className="bg-pearl p-4">
              <div className={`mb-3 flex items-center gap-3 ${iconDirection}`}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-henna text-sm font-bold text-ivory">
                  {index + 1}
                </span>
                <Icon className="text-henna" size={18} />
              </div>
              <h3 className="font-display text-2xl font-semibold text-cedar">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-coffee">{step.text}</p>
            </div>
          );
        })}
      </div>
      <Link
        href="/track-order"
        className="mt-4 inline-flex text-sm font-bold text-henna underline-offset-4 hover:underline"
      >
        {persuasion.trackOrderCta}
      </Link>
    </div>
  );
}

export function ProductOrderReassurance({ persuasion, direction }) {
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";
  const iconDirection = direction === "rtl" ? "flex-row-reverse" : "";

  return (
    <div className={`bg-ivory p-5 shadow-soft ${textAlignment}`}>
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-henna">{persuasion.reassuranceLabel}</p>
      <h2 className="mt-2 font-display text-3xl font-bold text-cedar">{persuasion.reassuranceTitle}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {persuasion.reassuranceItems.map((item, index) => {
          const Icon = reassuranceIcons[index];
          return (
            <div key={item} className={`flex gap-3 text-sm font-semibold leading-6 text-cedar ${iconDirection}`}>
              <Icon className="mt-1 shrink-0 text-henna" size={18} />
              <span>{item}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProductPersuasionBlock({ product }) {
  const language = useSelectedLanguage();
  const direction = getLanguageDirection(language);
  const translation = getTranslation(language);
  const productDetail = translation.productDetail;
  const persuasion = productDetail.productPersuasion;
  const productCopy = getProductCopy(product, productDetail);
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";

  return (
    <section dir={direction} className="px-4 pb-12 sm:px-6 lg:px-8">
      <div className={`mx-auto grid max-w-7xl gap-7 ${textAlignment}`}>
        <ProductValueStack
          persuasion={persuasion}
          product={product}
          productCopy={productCopy}
          direction={direction}
        />
        <div className="bg-ivory p-6 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-henna">{persuasion.identityLabel}</p>
          <h2 className="mt-2 font-display text-4xl font-bold text-cedar">{persuasion.identityTitle}</h2>
          <p className="mt-4 max-w-3xl leading-7 text-coffee">{persuasion.identityDescription}</p>
        </div>
        <ProductSoftUrgency
          persuasion={persuasion}
          product={product}
          productCopy={productCopy}
          direction={direction}
        />
        <ProductDecisionSteps persuasion={persuasion} direction={direction} />
        <ProductOrderReassurance persuasion={persuasion} direction={direction} />
      </div>
    </section>
  );
}

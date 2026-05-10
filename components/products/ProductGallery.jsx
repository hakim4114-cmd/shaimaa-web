"use client";

import Image from "next/image";
import { useSelectedLanguage } from "@/components/layout/LanguageSwitcher";
import { getLanguageDirection, getTranslation } from "@/data/translations";

export function ProductGallery({ product }) {
  const language = useSelectedLanguage();
  const direction = getLanguageDirection(language);
  const productDetail = getTranslation(language).productDetail;
  const productCopy = productDetail.products[product.slug] || product;
  const badgePosition = direction === "rtl" ? "right-5" : "left-5";
  const thumbTextAlignment = direction === "rtl" ? "text-right" : "text-left";

  return (
    <div dir={direction} className="grid gap-3">
      <div className="luxury-border relative min-h-[520px] overflow-hidden bg-pearl shadow-soft">
        {product.hasFinalImage ? (
          <Image
            src={product.image}
            alt={productCopy.name}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: product.placeholderGradient }}>
            <div className="absolute inset-x-10 bottom-0 top-16 rounded-t-[9rem] bg-ivory/70" />
            <div className="absolute left-1/2 top-24 h-64 w-36 -translate-x-1/2 rounded-t-[6rem] border border-brass/70 bg-pearl/80" />
            <div className="absolute left-1/2 top-36 h-28 w-28 -translate-x-1/2 rounded-full bg-cedar/90" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/20 via-transparent to-transparent" />
        <div
          className={`absolute bottom-5 ${badgePosition} rounded-full bg-ivory/95 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-cedar`}
        >
          {product.hasFinalImage ? productDetail.galleryStatusReady : productDetail.galleryStatusSoon}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {productDetail.galleryLabels.map((label, index) => (
          <div key={label} className="relative h-28 overflow-hidden bg-pearl">
            {product.hasFinalImage ? (
              <Image
                src={product.image}
                alt={`${productCopy.name} ${label}`}
                fill
                sizes="33vw"
                className="object-cover"
                style={{ objectPosition: index === 0 ? "center" : index === 1 ? "45% 35%" : "55% 20%" }}
              />
            ) : (
              <div className="absolute inset-0" style={{ background: product.placeholderGradient }}>
                <div className="absolute inset-4 border border-brass/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-cedar/15" />
            <span
              className={`absolute bottom-2 left-2 right-2 text-xs font-bold uppercase tracking-[0.1em] text-ivory ${thumbTextAlignment}`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

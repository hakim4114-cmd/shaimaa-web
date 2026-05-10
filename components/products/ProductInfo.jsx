import Link from "next/link";
import { Check, MessageCircle, PhoneCall, Ruler, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { ColorSelector } from "./ColorSelector";
import { LazySizeAdvisor } from "./LazySizeAdvisor";
import { SizeSelector } from "./SizeSelector";
import { IconTextRow } from "@/components/ui/IconTextRow";
import { defaultLanguage, getLanguageDirection, getTranslation } from "@/data/translations";
import { whatsappHref } from "@/lib/constants";

const trustIcons = [ShieldCheck, PhoneCall, Ruler, Sparkles];

export function ProductInfo({ product }) {
  const language = defaultLanguage;
  const direction = getLanguageDirection(language);
  const translation = getTranslation(language);
  const productDetail = translation.productDetail;
  const productCopy = productDetail.products[product.slug] || product;
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";
  const iconAfterTextDirection = direction === "rtl" ? "flex-row-reverse" : "";
  const priceDirection = direction === "rtl" ? "sm:flex-row-reverse" : "sm:flex-row";
  const maxWidthAlignment = direction === "rtl" ? "me-auto" : "";

  return (
    <div dir={direction} lang={language} className={`space-y-7 ${textAlignment}`}>
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-henna">{productCopy.tag}</p>
        <h1 className="mt-3 font-display text-5xl font-bold leading-tight text-cedar sm:text-6xl">
          {productCopy.name}
        </h1>
        <p className={`mt-4 max-w-xl text-lg leading-8 text-coffee ${maxWidthAlignment}`}>{productCopy.valueCopy}</p>
      </div>

      <div className="border-y border-brass/25 py-5">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coffee">{productDetail.priceLabel}</p>
        <div className={`mt-2 flex flex-col gap-2 sm:items-end sm:justify-between ${priceDirection}`}>
          <p dir="ltr" className="font-display text-4xl font-bold text-henna">{product.price}</p>
          <p className="text-sm font-semibold text-cedar">{productCopy.offer}</p>
        </div>
        <p className="mt-3 text-sm leading-6 text-coffee">{productDetail.codNote}</p>
      </div>

      <ColorSelector colors={product.colors} label={productDetail.colorLabel} colorLabels={productCopy.colors} />
      <SizeSelector
        sizes={product.sizes}
        labels={{ size: productDetail.sizeLabel, sizeGuide: productDetail.sizeGuide }}
      />
      <LazySizeAdvisor availableSizes={product.sizes} />

      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href={whatsappHref}
          className={`inline-flex items-center justify-center gap-2 rounded-full bg-henna px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-ivory shadow-soft transition hover:bg-cedar ${iconAfterTextDirection}`}
        >
          {productDetail.askWhatsapp}
          <MessageCircle size={18} />
        </a>
        <Link
          href="#order-form"
          className={`inline-flex items-center justify-center gap-2 rounded-full border border-cedar/25 px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-cedar transition hover:border-henna hover:text-henna ${iconAfterTextDirection}`}
        >
          {productDetail.orderPiece}
          <Truck size={18} />
        </Link>
      </div>

      <div className="grid gap-3 rounded-none bg-pearl p-5">
        {productDetail.trustItems.map((text, index) => {
          const TrustIcon = trustIcons[index];
          return (
            <IconTextRow
              key={text}
              direction={direction}
              icon={<TrustIcon className="text-henna" size={18} />}
              className="text-sm font-semibold text-cedar"
            >
              {text}
            </IconTextRow>
          );
        })}
        <Link href="/size-guide" className="mt-1 text-sm font-bold text-henna underline-offset-4 hover:underline">
          {productDetail.openSizeGuide}
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-ivory p-5 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-henna">{productDetail.craftsmanship}</p>
          <div className="mt-4 grid gap-3">
            {productCopy.craftsmanship.map((item) => (
              <IconTextRow
                key={item}
                direction={direction}
                icon={<Check className="text-brass" size={16} />}
                className="text-sm leading-6 text-coffee"
              >
                {item}
              </IconTextRow>
            ))}
          </div>
        </div>

        <div className="bg-ivory p-5 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-henna">{productDetail.fabric}</p>
          <p className="mt-4 text-sm leading-7 text-coffee">{productCopy.fabric}</p>
        </div>
      </div>
    </div>
  );
}

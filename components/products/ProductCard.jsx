import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

function formatText(template, values) {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
}

export function ProductCard({
  product,
  productCopy = product,
  direction = "rtl",
  labels = {
    viewDetails: "View details",
    photosSoon: "Photos soon",
    detailsAriaLabel: "View {productName} details",
    previewAlt: "{productName} product preview"
  }
}) {
  const productHref = `/products/${product.slug}`;
  const detailsAriaLabel = formatText(labels.detailsAriaLabel, { productName: productCopy.name });
  const previewAlt = formatText(labels.previewAlt, { productName: productCopy.name });
  const iconAfterTextDirection = direction === "rtl" ? "flex-row-reverse" : "";

  return (
    <article className="group bg-ivory shadow-soft">
      <Link
        href={productHref}
        aria-label={detailsAriaLabel}
        className="relative block aspect-[4/5] w-full max-w-full overflow-hidden bg-pearl outline-none transition focus-visible:ring-2 focus-visible:ring-henna focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
      >
        {product.hasFinalImage ? (
          <Image
            src={product.image}
            alt={previewAlt}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: product.placeholderGradient }}>
            <div className="absolute inset-x-10 bottom-0 top-12 rounded-t-[7rem] bg-ivory/70 transition duration-500 group-hover:-translate-y-2" />
            <div className="absolute left-1/2 top-20 h-40 w-28 -translate-x-1/2 rounded-t-[5rem] border border-brass/60 bg-pearl/80" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/18 via-transparent to-transparent" />
        <div className="absolute left-5 top-5 rounded-full bg-cedar px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-ivory">
          {productCopy.tag}
        </div>
        {!product.hasFinalImage ? (
          <div className="absolute bottom-5 left-5 rounded-full bg-ivory/95 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-cedar">
            {labels.photosSoon}
          </div>
        ) : null}
      </Link>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href={productHref}
              className="outline-none transition hover:text-henna focus-visible:text-henna focus-visible:underline"
            >
              <h3 className="font-display text-3xl font-semibold text-cedar">{productCopy.name}</h3>
            </Link>
            <p className="mt-1 text-sm text-coffee">{productCopy.color}</p>
          </div>
          <p dir="ltr" className="font-bold text-henna">{product.price}</p>
        </div>

        <Link
          href={productHref}
          className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-brass/70 px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-cedar outline-none transition hover:bg-cedar hover:text-ivory focus-visible:bg-cedar focus-visible:text-ivory focus-visible:ring-2 focus-visible:ring-henna focus-visible:ring-offset-2 focus-visible:ring-offset-ivory ${iconAfterTextDirection}`}
        >
          {labels.viewDetails}
          <MessageCircle size={17} />
        </Link>
      </div>
    </article>
  );
}

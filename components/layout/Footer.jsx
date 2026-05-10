"use client";

import { ArrowRight, MessageCircle, PackageCheck, PhoneCall, Ruler, Truck } from "lucide-react";
import { useSelectedLanguage } from "./LanguageSwitcher";
import { getLanguageDirection, getTranslation } from "@/data/translations";
import { whatsappHref } from "@/lib/constants";

const footerIcons = [PhoneCall, Truck, Ruler];

export function Footer() {
  const language = useSelectedLanguage();
  const direction = getLanguageDirection(language);
  const footer = getTranslation(language).footer;
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";
  const iconAfterTextDirection = direction === "rtl" ? "flex-row-reverse" : "";
  const borderClass = direction === "rtl" ? "border-r pr-4" : "border-l pl-4";

  return (
    <>
      <section dir={direction} lang={language} className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl bg-cedar px-6 py-14 text-center text-ivory shadow-soft sm:px-10">
          <PackageCheck className="mx-auto mb-5 text-brass" size={34} />
          <h2 className="mx-auto max-w-3xl font-display text-4xl font-bold sm:text-5xl">
            {footer.ctaTitle}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl leading-7 text-pearl/80">
            {footer.ctaText}
          </p>
          <a
            href={whatsappHref}
            className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-brass px-7 py-4 text-sm font-bold uppercase tracking-[0.12em] text-ink transition hover:bg-ivory ${iconAfterTextDirection}`}
          >
            {footer.ctaButton}
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      <footer dir={direction} lang={language} className="border-t border-brass/20 px-4 py-8 text-center text-sm text-coffee sm:px-6 lg:px-8">
        <div className={`mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_1.4fr] ${textAlignment}`}>
          <div>
            <p className="font-display text-2xl font-semibold text-cedar">Maison Shaimaa</p>
            <p className="mt-2 leading-6">{footer.brandText}</p>
            <a href={whatsappHref} className="mt-4 inline-flex items-center gap-2 font-bold text-henna">
              <MessageCircle size={18} />
              {footer.whatsappSupport}
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {footer.cards.map(([title, text], index) => {
              const FooterIcon = footerIcons[index];
              return (
                <div key={title} className={`${borderClass} border-brass/30`}>
                  <FooterIcon className="mb-2 text-henna" size={19} />
                  <p className="font-bold text-cedar">{title}</p>
                  <p className="mt-1 text-xs leading-5">{text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </footer>
    </>
  );
}

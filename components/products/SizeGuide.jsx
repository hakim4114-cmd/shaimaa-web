"use client";

import { sizes } from "@/data/products";
import { useSelectedLanguage } from "@/components/layout/LanguageSwitcher";
import { getLanguageDirection, getTranslation } from "@/data/translations";
import { SizeAdvisor } from "./SizeAdvisor";

const allAdvisorSizes = ["S", "M", "L", "XL", "XXL"];

export function SizeGuide() {
  const language = useSelectedLanguage();
  const direction = getLanguageDirection(language);
  const sizeGuide = getTranslation(language).sizeGuide;
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";
  const sizeRows = sizeGuide.rows || sizes;

  return (
    <section id="size-guide" dir={direction} className="bg-ivory px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className={textAlignment}>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-henna">{sizeGuide.label}</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-cedar">{sizeGuide.title}</h2>
          <p className="mt-5 leading-7 text-coffee">{sizeGuide.text}</p>
        </div>

        <div className="overflow-hidden border border-brass/30">
          {sizeRows.map(([size, range], index) => (
            <div
              key={size}
              className="grid grid-cols-[0.75fr_0.9fr_1.35fr] gap-2 border-b border-brass/20 bg-pearl/70 px-4 py-4 text-sm last:border-b-0 sm:text-base"
            >
              <strong className="text-cedar">{size}</strong>
              <span className="text-henna">{range}</span>
              <span className={`text-coffee ${textAlignment}`}>{sizeGuide.notes[index]}</span>
            </div>
          ))}
        </div>

        <div className={`lg:col-span-2 ${textAlignment}`}>
          <div className="mx-auto max-w-3xl">
            <p className="mb-4 text-base leading-7 text-coffee">{sizeGuide.advisorIntro}</p>
            <SizeAdvisor availableSizes={allAdvisorSizes} />
            <p className="mt-4 text-sm font-semibold leading-6 text-coffee">{sizeGuide.advisorNote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

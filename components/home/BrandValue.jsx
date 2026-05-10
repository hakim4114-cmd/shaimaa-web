"use client";

import { Star } from "lucide-react";
import { useSelectedLanguage } from "@/components/layout/LanguageSwitcher";
import { getLanguageDirection, getTranslation } from "@/data/translations";

export function BrandValue() {
  const language = useSelectedLanguage();
  const direction = getLanguageDirection(language);
  const cards = getTranslation(language).brandValue.cards;
  const borderClass = direction === "rtl" ? "border-r pr-5 text-right" : "border-l pl-5";

  return (
    <section dir={direction} className="bg-cedar px-4 py-16 text-ivory sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
        {cards.map(({ title, text }) => (
          <div key={title} className={`${borderClass} border-brass/60`}>
            <Star className="mb-5 text-brass" size={22} />
            <h2 className="font-display text-3xl font-semibold">{title}</h2>
            <p className="mt-3 leading-7 text-pearl/80">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

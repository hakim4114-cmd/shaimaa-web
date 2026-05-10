"use client";

import { MessageCircle, Ruler, Truck } from "lucide-react";
import { useSelectedLanguage } from "@/components/layout/LanguageSwitcher";
import { getLanguageDirection, getTranslation } from "@/data/translations";

const stepIcons = [MessageCircle, Ruler, Truck];

export function CODTrust() {
  const language = useSelectedLanguage();
  const direction = getLanguageDirection(language);
  const codTrust = getTranslation(language).codTrust;
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";

  return (
    <section dir={direction} className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
        <div className={textAlignment}>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-henna">{codTrust.label}</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-cedar">{codTrust.title}</h2>
          <p className="mt-4 leading-7 text-coffee">{codTrust.text}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 lg:col-span-2">
          {codTrust.steps.map(({ title, text }, index) => {
            const Icon = stepIcons[index];
            return (
            <div key={title} className="bg-pearl p-6">
              <Icon className="mb-5 text-henna" size={25} />
              <h3 className="font-display text-2xl font-semibold text-cedar">{title}</h3>
              <p className={`mt-3 text-sm leading-6 text-coffee ${textAlignment}`}>{text}</p>
            </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

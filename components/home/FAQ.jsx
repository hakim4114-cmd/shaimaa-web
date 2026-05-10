"use client";

import { useSelectedLanguage } from "@/components/layout/LanguageSwitcher";
import { getLanguageDirection, getTranslation } from "@/data/translations";

export function FAQ() {
  const language = useSelectedLanguage();
  const direction = getLanguageDirection(language);
  const faq = getTranslation(language).faq;
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";

  return (
    <section dir={direction} className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-4xl">
        <p className="text-center text-sm font-bold uppercase tracking-[0.18em] text-henna">{faq.label}</p>
        <h2 className="mt-3 text-center font-display text-4xl font-bold text-cedar">
          {faq.title}
        </h2>

        <div className="mt-10 divide-y divide-brass/20 border-y border-brass/30">
          {faq.items.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 font-display text-2xl font-semibold text-cedar ${textAlignment}`}>
                {item.question}
                <span className="text-henna transition group-open:rotate-45">+</span>
              </summary>
              <p className={`mt-3 leading-7 text-coffee ${textAlignment}`}>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

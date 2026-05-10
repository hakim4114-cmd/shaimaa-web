"use client";

import { useSelectedLanguage } from "@/components/layout/LanguageSwitcher";
import { getTranslation } from "@/data/translations";

export function EuropePreOrderForm() {
  const europePage = getTranslation(useSelectedLanguage()).europePage;

  return (
    <form className="grid gap-4 bg-ivory p-6 shadow-soft">
      <input
        aria-label={europePage.fullName}
        className="border border-brass/30 bg-pearl px-4 py-3"
        placeholder={europePage.fullName}
      />
      <input
        aria-label={europePage.email}
        className="border border-brass/30 bg-pearl px-4 py-3"
        placeholder={europePage.email}
      />
      <input
        aria-label={europePage.country}
        className="border border-brass/30 bg-pearl px-4 py-3"
        placeholder={europePage.country}
      />
      <textarea
        aria-label={europePage.note}
        className="min-h-28 border border-brass/30 bg-pearl px-4 py-3"
        placeholder={europePage.notePlaceholder}
      />
      <button className="rounded-full bg-cedar px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-ivory">
        {europePage.submit}
      </button>
    </form>
  );
}

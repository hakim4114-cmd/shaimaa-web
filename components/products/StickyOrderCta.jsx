"use client";

import { Truck } from "lucide-react";

const ctaLabel = "اطلبي هذه القطعة";

export function StickyOrderCta() {
  function handleClick() {
    document.getElementById("order-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-brass/25 bg-ivory/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 shadow-soft backdrop-blur md:hidden">
      <button
        type="button"
        aria-label={ctaLabel}
        onClick={handleClick}
        dir="rtl"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-henna px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-ivory shadow-soft transition active:scale-[0.99]"
      >
        <Truck className="shrink-0" size={18} />
        <span>{ctaLabel}</span>
      </button>
    </div>
  );
}

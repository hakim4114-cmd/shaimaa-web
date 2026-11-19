"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveDeliveryPricing } from "@/app/(app)/shipping/actions";
import { useI18n } from "@/lib/i18n/provider";

/** Organization default: delivery paid by the customer, or included in the product price. */
export function DeliveryPricingForm({ included }: { included: boolean }) {
  const { t } = useI18n();
  const ts = t.shipping;
  const router = useRouter();
  const [value, setValue] = useState(included);
  const [pending, startTransition] = useTransition();

  function choose(next: boolean) {
    if (next === value || pending) return;
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await saveDeliveryPricing(next);
      if (result.error) {
        setValue(previous);
        toast.error(t.errors[result.error]);
        return;
      }
      toast.success(ts.deliveryPricingSaved);
      router.refresh();
    });
  }

  return (
    <fieldset className="flex flex-col gap-2 rounded-xl border border-border p-3">
      <legend className="px-1 text-sm font-semibold">{ts.deliveryPricingTitle}</legend>
      <p className="text-sm text-muted-foreground">{ts.deliveryPricingHint}</p>
      {([false, true] as const).map((option) => (
        <label key={String(option)} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
          <input type="radio" name="delivery-pricing" checked={value === option} disabled={pending} onChange={() => choose(option)} className="size-4 accent-[var(--color-accent)]" />
          {option ? ts.deliveryPricingIncluded : ts.deliveryPricingPaid}
        </label>
      ))}
    </fieldset>
  );
}

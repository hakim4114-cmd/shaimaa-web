"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveShippingRates } from "@/app/(app)/shipping/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppErrorCode } from "@/lib/data/errors";
import { useI18n } from "@/lib/i18n/provider";

type City = { id: number; nameFr: string; nameAr: string };

/** One fee per city; empty = no default (typed on each order). */
export function ShippingRatesForm({ cities, fees }: { cities: City[]; fees: Record<number, number> }) {
  const { t, locale } = useI18n();
  const ts = t.shipping;
  const router = useRouter();
  const [values, setValues] = useState<Record<number, string>>(() =>
    Object.fromEntries(cities.map((c) => {
      const cents = fees[c.id];
      return [c.id, cents !== undefined ? String(cents / 100) : ""];
    }))
  );
  const [all, setAll] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AppErrorCode | null>(null);
  const sorted = useMemo(() => {
    const label = (c: City) => (locale === "ar" ? c.nameAr : c.nameFr);
    return [...cities].sort((a, b) => label(a).localeCompare(label(b), locale));
  }, [cities, locale]);

  return (
    <div className="flex flex-col gap-4">
      {error ? <FormAlert>{t.errors[error]}</FormAlert> : null}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{ts.rateAll}</span>
          <Input dir="ltr" inputMode="decimal" className="w-32" value={all} placeholder="35" onChange={(e) => setAll(e.target.value)} />
        </label>
        <Button variant="secondary" disabled={!all.trim()} onClick={() => setValues((v) => Object.fromEntries(Object.keys(v).map((k) => [k, v[Number(k)] || all])))}>
          {ts.rateFillEmpty}
        </Button>
      </div>
      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((city) => (
          <label key={city.id} className="flex items-center justify-between gap-3 rounded-md px-1 py-1 text-sm">
            <span className="min-w-0 truncate">{locale === "ar" ? city.nameAr : city.nameFr}</span>
            <Input
              dir="ltr"
              inputMode="decimal"
              className="w-24 shrink-0"
              value={values[city.id] ?? ""}
              placeholder="—"
              aria-label={locale === "ar" ? city.nameAr : city.nameFr}
              onChange={(e) => setValues((v) => ({ ...v, [city.id]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      <Button
        className="self-start"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await saveShippingRates(Object.entries(values).map(([cityId, fee]) => ({ cityId: Number(cityId), fee })));
            if (result.error) return setError(result.error);
            toast.success(ts.ratesSaved);
            router.refresh();
          })
        }
      >
        {pending ? t.common.loading : t.common.save}
      </Button>
    </div>
  );
}

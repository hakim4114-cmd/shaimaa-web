"use client";

import { Plus, Repeat, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { createExchange } from "@/app/(app)/orders/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import type { AppErrorCode } from "@/lib/data/errors";
import type { SellableVariant } from "@/lib/data/orders";
import { useI18n } from "@/lib/i18n/provider";
import { formatMoney } from "@/lib/money";

export function ExchangeDialog({ orderId, variants }: { orderId: string; variants: SellableVariant[] }) {
  const { t, locale } = useI18n();
  const tx = t.orders.exchange;
  const id = useId();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState([{ key: 0, variantId: "", quantity: 1 }]);
  const [difference, setDifference] = useState("");
  const [fee, setFee] = useState("");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AppErrorCode | null>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Repeat /> {tx.button}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={t.common.close} className="max-h-[85dvh] overflow-y-auto">
        <DialogTitle>{tx.title}</DialogTitle>
        <DialogDescription>{tx.description}</DialogDescription>
        <div className="mt-4 flex flex-col gap-3">
          {error ? <FormAlert>{t.errors[error]}</FormAlert> : null}
          {lines.map((line, index) => (
            <div key={line.key} className="grid grid-cols-[1fr_5rem_auto] items-end gap-2">
              <Field label={`${t.orders.product}${index ? ` ${index + 1}` : ""}`} htmlFor={`${id}-${line.key}`}>
                <NativeSelect id={`${id}-${line.key}`} value={line.variantId} onChange={(e) => setLines((ls) => ls.map((l) => (l.key === line.key ? { ...l, variantId: e.target.value } : l)))}>
                  <option value="">{t.orders.productPlaceholder}</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label} · {v.available}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={t.orders.quantity} htmlFor={`${id}-${line.key}-q`}>
                <Input id={`${id}-${line.key}-q`} type="number" min={1} dir="ltr" value={line.quantity} onChange={(e) => setLines((ls) => ls.map((l) => (l.key === line.key ? { ...l, quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) } : l)))} />
              </Field>
              <Button variant="ghost" size="icon" aria-label={t.orders.removeItem} disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}>
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="self-start" onClick={() => setLines((ls) => [...ls, { key: Date.now(), variantId: "", quantity: 1 }])}>
            <Plus /> {t.orders.addItem}
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tx.difference} htmlFor={`${id}-diff`} hint={tx.differenceHint}>
              <Input id={`${id}-diff`} dir="ltr" inputMode="decimal" placeholder="0" value={difference} onChange={(e) => setDifference(e.target.value)} />
            </Field>
            <Field label={t.orders.shippingFee} htmlFor={`${id}-fee`}>
              <Input id={`${id}-fee`} dir="ltr" inputMode="decimal" placeholder="0" value={fee} onChange={(e) => setFee(e.target.value)} />
            </Field>
          </div>
          <Field label={tx.reason} htmlFor={`${id}-reason`}>
            <Textarea id={`${id}-reason`} rows={2} className="min-h-16" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <p className="text-sm text-muted-foreground">
            {tx.toCollect}{" "}
            <span className="tabular font-semibold text-foreground">
              {formatMoney((Number(difference.replace(",", ".")) || 0) * 100 + (Number(fee.replace(",", ".")) || 0) * 100, locale)}
            </span>
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              disabled={pending || !lines.some((l) => l.variantId) || reason.trim().length < 2}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const result = await createExchange({
                    orderId,
                    items: lines.filter((l) => l.variantId).map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
                    priceDifference: difference,
                    shippingFee: fee,
                    reason
                  });
                  if (result.error) return setError(result.error);
                  router.push(`/orders/${result.orderId}`);
                  router.refresh();
                })
              }
            >
              {pending ? t.common.loading : tx.create}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

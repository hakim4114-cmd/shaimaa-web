"use client";

import { ArrowRightLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { recordStockMovement, type StockInput } from "@/app/(app)/inventory/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import type { AppErrorCode } from "@/lib/data/errors";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";

const types: StockInput["type"][] = ["receipt", "adjustment", "mark_damaged", "write_off"];

export function StockAction({ variantId, label }: { variantId: string; label: string }) {
  const { t } = useI18n();
  const ti = t.inventory;
  const id = useId();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<StockInput["type"]>("receipt");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const router = useRouter();
  const [error, setError] = useState<AppErrorCode | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const value = Number(quantity);
    startTransition(async () => {
      const result = await recordStockMovement({ variantId, type, quantity: Number.isInteger(value) ? value : 0, note });
      if (result.error) {
        setError(result.error);
        return;
      }
      // Receiving stock moves pieces, not money: remind to record what was paid,
      // or the cash and the capital floor would count the stock as free.
      if (type === "receipt") {
        toast.success(ti.done, { description: ti.receiptPaidHint, action: { label: ti.recordPurchase, onClick: () => router.push("/finance") }, duration: 8000 });
      } else {
        toast.success(ti.done);
      }
      setOpen(false);
      setQuantity("");
      setNote("");
      setType("receipt");
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <ArrowRightLeft /> <span className="sr-only sm:not-sr-only">{ti.move}</span>
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={t.common.close} aria-describedby={undefined}>
        <DialogTitle>{interpolate(ti.dialogTitle, { item: label })}</DialogTitle>
        <form
          className="mt-4 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          noValidate
        >
          {error ? <FormAlert>{t.errors[error]}</FormAlert> : null}
          <Field label={ti.type} htmlFor={`${id}-type`}>
            <NativeSelect id={`${id}-type`} value={type} onChange={(e) => setType(e.target.value as StockInput["type"])}>
              {types.map((value) => (
                <option key={value} value={value}>
                  {t.movementType[value]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={ti.quantity} htmlFor={`${id}-qty`} hint={type === "adjustment" ? ti.quantityHint : type === "receipt" ? ti.receiptPaidHint : undefined}>
            <Input id={`${id}-qty`} dir="ltr" type="number" inputMode="numeric" step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required autoFocus />
          </Field>
          <Field label={ti.note} htmlFor={`${id}-note`} hint={ti.noteHint}>
            <Textarea id={`${id}-note`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="min-h-16" />
          </Field>
          <DialogFooter>
            <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t.common.loading : ti.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

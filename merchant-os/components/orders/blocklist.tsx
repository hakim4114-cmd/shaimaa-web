"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { blockNumber, unblockNumber } from "@/app/(app)/orders/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input } from "@/components/ui/input";
import type { AppErrorCode } from "@/lib/data/errors";
import { useI18n } from "@/lib/i18n/provider";

export function BlockNumberForm() {
  const { t } = useI18n();
  const tc = t.customers;
  const id = useId();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AppErrorCode | null>(null);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await blockNumber(phone, reason);
          if (result.error) {
            setError(result.error);
            return;
          }
          setPhone("");
          setReason("");
          toast.success(t.orders.blocked);
          router.refresh();
        });
      }}
    >
      {error ? <FormAlert>{t.errors[error]}</FormAlert> : null}
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
        <Field label={tc.phone} htmlFor={`${id}-phone`}>
          <Input id={`${id}-phone`} type="tel" inputMode="tel" dir="ltr" value={phone} placeholder="06 12 34 56 78" onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label={tc.reason} htmlFor={`${id}-reason`}>
          <Input id={`${id}-reason`} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Button type="submit" disabled={pending || !phone.trim() || reason.trim().length < 2}>
          {tc.add}
        </Button>
      </div>
    </form>
  );
}

export function UnblockButton({ id, phone }: { id: string; phone: string }) {
  const { t } = useI18n();
  const tc = t.customers;
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`${tc.remove} ${phone}`}>
          <Trash2 />
        </Button>
      }
      title={tc.remove}
      description={tc.removeConfirm}
      confirmLabel={tc.remove}
      cancelLabel={t.common.cancel}
      onConfirm={async () => {
        const result = await unblockNumber(id);
        if (result.error) {
          toast.error(t.errors[result.error]);
          return;
        }
        router.refresh();
      }}
    />
  );
}

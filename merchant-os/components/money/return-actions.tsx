"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { closeReturn, inspectReturnItem, receiveReturn } from "@/app/(app)/returns/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppErrorCode } from "@/lib/data/errors";
import type { ReturnRow } from "@/lib/data/money";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export function ReturnActions({ row, canReceive }: { row: ReturnRow; canReceive: boolean }) {
  const { t } = useI18n();
  const tr = t.money.returns;
  const id = useId();
  const router = useRouter();
  const [fee, setFee] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AppErrorCode | null>(null);

  function run(action: () => Promise<{ error?: AppErrorCode }>, message: string) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(message);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <FormAlert>{t.errors[error]}</FormAlert> : null}
      <ul className="flex flex-col gap-2">
        {row.items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-muted px-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="font-medium">{item.productName}</span>
              {item.variantTitle ? <span className="text-muted-foreground"> · {item.variantTitle}</span> : null}
              <span className="tabular text-muted-foreground"> × {item.quantity}</span>
            </span>
            {row.status === "received" && item.condition === "pending" && canReceive ? (
              <span className="flex flex-wrap gap-1">
                {(["resellable", "damaged", "missing"] as const).map((condition) => (
                  <Button
                    key={condition}
                    size="sm"
                    variant={condition === "resellable" ? "primary" : "secondary"}
                    disabled={pending}
                    onClick={() => run(() => inspectReturnItem(item.id, condition), tr.conditions[condition])}
                  >
                    {tr.conditions[condition]}
                  </Button>
                ))}
              </span>
            ) : (
              <span className={cn("text-xs font-medium", item.condition === "resellable" ? "text-success" : item.condition === "pending" ? "text-muted-foreground" : "text-danger")}>
                {tr.conditions[item.condition]}
              </span>
            )}
          </li>
        ))}
      </ul>
      {row.status === "awaiting_receipt" && canReceive ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-fee`}>
            <span className="font-medium">{tr.returnFee}</span>
            <Input id={`${id}-fee`} dir="ltr" inputMode="decimal" className="w-32" value={fee} placeholder="0" onChange={(e) => setFee(e.target.value)} />
          </label>
          <Button disabled={pending} onClick={() => run(() => receiveReturn(row.id, fee), tr.receivedToast)}>
            {tr.receive}
          </Button>
        </div>
      ) : null}
      {row.status === "inspected" ? (
        <Button variant="secondary" className="self-start" disabled={pending} onClick={() => run(() => closeReturn(row.id), tr.closedToast)}>
          {tr.close}
        </Button>
      ) : null}
    </div>
  );
}

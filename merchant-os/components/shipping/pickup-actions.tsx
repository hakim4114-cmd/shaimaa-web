"use client";

import { Printer, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { requestSenditPickup, senditLabels } from "@/app/(app)/shipping/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import type { AppErrorCode } from "@/lib/data/errors";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";

/** Bulk actions for parcels still at the merchant's: labels and one pickup request. */
export function PickupActions({ codes }: { codes: string[] }) {
  const { t } = useI18n();
  const ts = t.shipping;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<{ code: AppErrorCode; detail?: string } | null>(null);

  function labels(thermal: boolean) {
    setError(null);
    const tab = window.open("about:blank", "_blank");
    startTransition(async () => {
      const result = await senditLabels(codes, thermal);
      if (result.error || !result.data) {
        tab?.close();
        setError({ code: result.error ?? "UNKNOWN", detail: result.detail });
        return;
      }
      if (tab) tab.location.href = result.data;
      else window.location.href = result.data;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <FormAlert>
          {t.errors[error.code]}
          {error.detail ? ` (${error.detail})` : ""}
        </FormAlert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => labels(true)} disabled={pending || codes.length === 0}>
          <Printer /> {interpolate(ts.printAll, { count: codes.length })}
        </Button>
        <Button
          size="sm"
          disabled={pending || codes.length === 0}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await requestSenditPickup();
              if (result.error) {
                setError({ code: result.error, detail: result.detail });
                return;
              }
              toast.success(interpolate(ts.pickupRequested, { count: result.data?.count ?? 0 }));
              router.refresh();
            })
          }
        >
          <Truck /> {ts.requestPickup}
        </Button>
      </div>
    </div>
  );
}

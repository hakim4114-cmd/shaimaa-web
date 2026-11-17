"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { createCampaign, endCampaign, setOrderCampaign } from "@/app/(app)/finance/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import type { AppErrorCode } from "@/lib/data/errors";
import type { MarketingPlatform } from "@/lib/data/money";
import { useI18n } from "@/lib/i18n/provider";

export function CampaignForm({ platforms, today }: { platforms: readonly MarketingPlatform[]; today: string }) {
  const { t } = useI18n();
  const tm = t.money;
  const id = useId();
  const router = useRouter();
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<MarketingPlatform>("meta");
  const [startsOn, setStartsOn] = useState(today);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AppErrorCode | null>(null);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createCampaign({ name, platform, startsOn: startsOn || null });
          if (result.error) {
            setError(result.error);
            return;
          }
          setName("");
          toast.success(tm.saved);
          router.refresh();
        });
      }}
    >
      {error ? <FormAlert>{t.errors[error]}</FormAlert> : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_10rem_auto] sm:items-end">
        <Field label={tm.campaignName} htmlFor={`${id}-name`}>
          <Input id={`${id}-name`} value={name} maxLength={160} placeholder={tm.campaignNameHint} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={tm.platform} htmlFor={`${id}-platform`}>
          <NativeSelect id={`${id}-platform`} value={platform} onChange={(e) => setPlatform(e.target.value as MarketingPlatform)}>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {tm.platforms[p]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={tm.startsOn} htmlFor={`${id}-start`}>
          <Input id={`${id}-start`} type="date" dir="ltr" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
        </Field>
        <Button type="submit" disabled={pending || !name.trim()}>
          {tm.addCampaign}
        </Button>
      </div>
    </form>
  );
}

export function EndCampaignButton({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await endCampaign(id);
          if (result.error) toast.error(t.errors[result.error]);
          router.refresh();
        })
      }
    >
      {t.money.endCampaign}
    </Button>
  );
}

/** Order page: which campaign brought this order. */
export function OrderCampaignSelect({ orderId, value, campaigns }: { orderId: string; value: string | null; campaigns: { id: string; name: string }[] }) {
  const { t } = useI18n();
  const id = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Field label={t.money.campaign} htmlFor={`${id}-camp`} hint={t.money.attributionHint}>
      <NativeSelect
        id={`${id}-camp`}
        value={value ?? ""}
        disabled={pending}
        onChange={(e) =>
          startTransition(async () => {
            const result = await setOrderCampaign(orderId, e.target.value || null);
            if (result.error) toast.error(t.errors[result.error]);
            router.refresh();
          })
        }
      >
        <option value="">{t.money.noCampaign}</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </NativeSelect>
    </Field>
  );
}

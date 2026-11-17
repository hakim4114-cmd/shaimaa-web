"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { addExpense, deleteExpense } from "@/app/(app)/finance/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import type { AppErrorCode } from "@/lib/data/errors";
import type { ExpenseCategory } from "@/lib/data/money";
import { useI18n } from "@/lib/i18n/provider";

/** Adds an expense. With `adsOnly`, it records ad spend for a campaign. */
export function ExpenseForm({
  today,
  categories,
  campaigns,
  adsOnly = false
}: {
  today: string;
  categories: readonly ExpenseCategory[];
  campaigns: { id: string; name: string }[];
  adsOnly?: boolean;
}) {
  const { t } = useI18n();
  const tm = t.money;
  const id = useId();
  const router = useRouter();
  const [category, setCategory] = useState<ExpenseCategory>(adsOnly ? "advertising" : "packaging");
  const [amount, setAmount] = useState("");
  const [incurredOn, setIncurredOn] = useState(today);
  const [description, setDescription] = useState("");
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AppErrorCode | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await addExpense({ category, amount, incurredOn, description, campaignId: category === "advertising" && campaignId ? campaignId : null });
          if (result.error) {
            setError(result.error);
            return;
          }
          setAmount("");
          setDescription("");
          toast.success(tm.saved);
          router.refresh();
        });
      }}
    >
      {error ? <FormAlert>{t.errors[error]}</FormAlert> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {adsOnly ? null : (
          <Field label={tm.category} htmlFor={`${id}-cat`}>
            <NativeSelect id={`${id}-cat`} value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {tm.categories[value]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
        {category === "advertising" ? (
          <Field label={tm.campaign} htmlFor={`${id}-camp`}>
            <NativeSelect id={`${id}-camp`} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
              <option value="">{tm.noCampaign}</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
        <Field label={tm.amount} htmlFor={`${id}-amount`}>
          <Input id={`${id}-amount`} dir="ltr" inputMode="decimal" value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label={tm.date} htmlFor={`${id}-date`}>
          <Input id={`${id}-date`} type="date" dir="ltr" max={today} value={incurredOn} onChange={(e) => setIncurredOn(e.target.value)} />
        </Field>
        <div className={adsOnly ? "sm:col-span-2 lg:col-span-1" : "sm:col-span-2 lg:col-span-3"}>
          <Field label={tm.description} htmlFor={`${id}-desc`}>
            <Input id={`${id}-desc`} value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending || !amount.trim()} className="w-full">
            {pending ? t.common.loading : adsOnly ? tm.addSpend : tm.addExpense}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function DeleteExpenseButton({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={t.common.delete}>
          <Trash2 />
        </Button>
      }
      title={t.money.deleteExpense}
      description={t.money.deleteExpenseHint}
      confirmLabel={t.common.delete}
      cancelLabel={t.common.cancel}
      onConfirm={async () => {
        const result = await deleteExpense(id);
        if (result.error) toast.error(t.errors[result.error]);
        router.refresh();
      }}
    />
  );
}

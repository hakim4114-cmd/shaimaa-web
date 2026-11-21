"use client";

import { Check, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import type { AppErrorCode } from "@/lib/data/errors";
import type { ExpenseCategory } from "@/lib/data/money";
import { useI18n } from "@/lib/i18n/provider";
import { addCashEntry, addPayable, deletePayable, payPayable, saveCashSettings, withdraw, type PayResult } from "./actions";

function useRun() {
  const router = useRouter();
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<{ code: AppErrorCode; detail?: string } | null>(null);
  const run = (fn: () => Promise<PayResult>, onOk?: () => void) =>
    start(async () => {
      setError(null);
      const result = await fn();
      if (result.error) return setError({ code: result.error, detail: result.detail });
      toast.success(t.money.saved);
      onOk?.();
      router.refresh();
    });
  return { pending, error, run };
}

export function WithdrawForm({ safeCents, today }: { safeCents: number; today: string }) {
  const { t, locale } = useI18n();
  const tp = t.pay;
  const id = useId();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const { pending, error, run } = useRun();
  const cents = Math.round((Number(amount.replace(",", ".")) || 0) * 100);
  const over = cents > safeCents;
  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <FormAlert>
          {error.code === "OVER_SAFE_LIMIT" ? tp.overLimit : t.errors[error.code]}
        </FormAlert>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tp.amount} htmlFor={`${id}-a`}>
          <Input id={`${id}-a`} dir="ltr" inputMode="decimal" value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label={over ? tp.reasonRequired : tp.note} htmlFor={`${id}-n`}>
          <Input id={`${id}-n`} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      {over && cents > 0 ? (
        <p className="rounded-md bg-danger-soft p-3 text-sm text-danger">
          {tp.overWarning.replace("{safe}", new Intl.NumberFormat(locale === "ar" ? "ar-MA" : "fr-MA", { numberingSystem: "latn", minimumFractionDigits: 2 }).format(safeCents / 100))}
        </p>
      ) : null}
      <Button
        variant={over ? "danger" : "primary"}
        className="self-start"
        disabled={pending || cents <= 0 || (over && note.trim().length < 10)}
        onClick={() => run(() => withdraw({ amount, date: today, note }), () => { setAmount(""); setNote(""); })}
      >
        {over ? tp.withdrawAnyway : tp.withdraw}
      </Button>
    </div>
  );
}

export function SettingsForm({ initial, funds }: { initial: { openingDate: string; reserveFloor: string; ownerFundName: string }; funds: { name: string; percent: number }[] }) {
  const { t } = useI18n();
  const tp = t.pay;
  const id = useId();
  const [v, setV] = useState(initial);
  const { pending, error, run } = useRun();
  return (
    <div className="flex flex-col gap-3">
      {error ? <FormAlert>{t.errors[error.code]}</FormAlert> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={tp.openingDate} htmlFor={`${id}-d`} hint={tp.openingDateHint}>
          <Input id={`${id}-d`} type="date" dir="ltr" value={v.openingDate} onChange={(e) => setV({ ...v, openingDate: e.target.value })} />
        </Field>
        <Field label={tp.reserveFloor} htmlFor={`${id}-r`} hint={tp.reserveFloorHint}>
          <Input id={`${id}-r`} dir="ltr" inputMode="decimal" value={v.reserveFloor} onChange={(e) => setV({ ...v, reserveFloor: e.target.value })} />
        </Field>
        <Field label={tp.ownerFund} htmlFor={`${id}-f`} hint={funds.length ? tp.ownerFundHint : tp.noFunds}>
          <NativeSelect id={`${id}-f`} value={v.ownerFundName} onChange={(e) => setV({ ...v, ownerFundName: e.target.value })}>
            <option value="">—</option>
            {funds.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name} ({f.percent}%)
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Button className="self-start" disabled={pending} onClick={() => run(() => saveCashSettings(v))}>
        {t.common.save}
      </Button>
    </div>
  );
}

export function CashEntryForm({ today, hasOpening }: { today: string; hasOpening: boolean }) {
  const { t } = useI18n();
  const tp = t.pay;
  const id = useId();
  const [kind, setKind] = useState<"opening" | "capital_in" | "adjustment">(hasOpening ? "capital_in" : "opening");
  const [amount, setAmount] = useState("");
  const [negative, setNegative] = useState(false);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const { pending, error, run } = useRun();
  return (
    <div className="flex flex-col gap-3">
      {error ? <FormAlert>{t.errors[error.code]}</FormAlert> : null}
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label={tp.entryKind} htmlFor={`${id}-k`}>
          <NativeSelect id={`${id}-k`} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            {(["opening", "capital_in", "adjustment"] as const).map((k) => (
              <option key={k} value={k}>
                {tp.kinds[k]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={tp.amount} htmlFor={`${id}-a`}>
          <Input id={`${id}-a`} dir="ltr" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label={t.money.date} htmlFor={`${id}-d`}>
          <Input id={`${id}-d`} type="date" dir="ltr" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={kind === "adjustment" ? tp.reasonRequired : tp.note} htmlFor={`${id}-n`}>
          <Input id={`${id}-n`} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      {kind === "adjustment" ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={negative} onChange={(e) => setNegative(e.target.checked)} />
          {tp.adjustmentOut}
        </label>
      ) : null}
      <Button className="self-start" variant="secondary" disabled={pending || !amount} onClick={() => run(() => addCashEntry({ kind, amount, date, note, negative }), () => { setAmount(""); setNote(""); })}>
        {tp.addEntry}
      </Button>
    </div>
  );
}

export function PayableForm({ categories, today }: { categories: readonly ExpenseCategory[]; today: string }) {
  const { t } = useI18n();
  const tp = t.pay;
  const id = useId();
  const [v, setV] = useState({ counterparty: "", description: "", category: "inventory_purchase" as string, amount: "", dueOn: today, recurrence: "none" });
  const { pending, error, run } = useRun();
  return (
    <div className="flex flex-col gap-3">
      {error ? <FormAlert>{t.errors[error.code]}</FormAlert> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={tp.counterparty} htmlFor={`${id}-c`}>
          <Input id={`${id}-c`} value={v.counterparty} maxLength={120} onChange={(e) => setV({ ...v, counterparty: e.target.value })} />
        </Field>
        <Field label={t.money.category} htmlFor={`${id}-cat`}>
          <NativeSelect id={`${id}-cat`} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {t.money.categories[c]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={tp.amount} htmlFor={`${id}-a`}>
          <Input id={`${id}-a`} dir="ltr" inputMode="decimal" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} />
        </Field>
        <Field label={tp.dueOn} htmlFor={`${id}-d`}>
          <Input id={`${id}-d`} type="date" dir="ltr" value={v.dueOn} onChange={(e) => setV({ ...v, dueOn: e.target.value })} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <Field label={tp.recurrence} htmlFor={`${id}-rec`} hint={v.recurrence !== "none" ? tp.recurrenceHint : undefined}>
          <NativeSelect id={`${id}-rec`} value={v.recurrence} onChange={(e) => setV({ ...v, recurrence: e.target.value })}>
            {(["none", "monthly", "weekly", "yearly"] as const).map((r) => (
              <option key={r} value={r}>
                {tp.recurrences[r]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={tp.note} htmlFor={`${id}-n`}>
          <Textarea id={`${id}-n`} rows={2} className="min-h-14" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
        </Field>
      </div>
      <Button className="self-start" variant="secondary" disabled={pending || !v.counterparty || !v.amount} onClick={() => run(() => addPayable(v), () => setV({ ...v, counterparty: "", description: "", amount: "" }))}>
        {tp.addPayable}
      </Button>
    </div>
  );
}

export function PayableActions({ id }: { id: string }) {
  const { t } = useI18n();
  const tp = t.pay;
  const { pending, run } = useRun();
  return (
    <span className="flex shrink-0 gap-1">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => payPayable(id))}>
        <Check /> {tp.markPaid}
      </Button>
      <ConfirmDialog
        trigger={
          <Button size="icon-sm" variant="ghost" aria-label={t.common.delete}>
            <Trash2 />
          </Button>
        }
        title={t.common.delete}
        description={tp.deletePayableHint}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        onConfirm={async () => {
          await deletePayable(id);
        }}
      />
    </span>
  );
}

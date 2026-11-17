import { redirect } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrganization } from "@/lib/data/context";
import { expenseCategories } from "@/lib/data/money";
import { getFundPlan } from "@/lib/data/routines";
import { businessDay } from "@/lib/datetime";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { CashEntryForm, PayableActions, PayableForm, SettingsForm, WithdrawForm } from "./pay-forms";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.pay.title };
}

type Safe = {
  configured: boolean;
  safe_cents?: number;
  reason?: string;
  cash_balance_cents?: number;
  obligations_30d_cents?: number;
  reserve_floor_cents?: number;
  free_cash_cents?: number;
  pay_earned_cents?: number;
  withdrawn_cents?: number;
  pay_left_cents?: number;
  opening_date?: string;
  owner_fund_name?: string;
};

export default async function PayPage() {
  const { t, locale } = await getI18n();
  const tp = t.pay;
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.seeMoney) redirect("/");
  const [{ data: safeRaw }, funds, { data: entries }, { data: payables }] = await Promise.all([
    supabase.rpc("safe_withdrawal", { p_organization_id: organizationId }),
    getFundPlan(supabase, organizationId),
    supabase.from("cash_entries").select("id, kind, amount_cents, entry_date, note, over_limit").eq("organization_id", organizationId).order("entry_date", { ascending: false }).limit(50),
    supabase.from("payables").select("id, counterparty, description, category, amount_cents, due_on, paid_on, recurrence").eq("organization_id", organizationId).order("due_on").limit(100)
  ]);
  const s = (safeRaw ?? { configured: false }) as Safe;
  const today = businessDay(new Date());
  const m = (c: number | undefined) => formatMoney(c ?? 0, locale);
  const open = (payables ?? []).filter((p) => !p.paid_on);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={tp.title} description={tp.description} />

      {s.configured ? (
        <Card className="overflow-hidden">
          <div className={cn("p-6", (s.safe_cents ?? 0) > 0 ? "bg-accent text-accent-foreground" : "bg-sidebar text-sidebar-foreground")}>
            <p className="text-sm opacity-85">{tp.safeTitle}</p>
            <p className="tabular mt-1 text-4xl font-bold">{m(s.safe_cents)}</p>
            <p className="mt-2 text-sm opacity-90">{tp.reasons[(s.reason ?? "ok") as keyof typeof tp.reasons]}</p>
          </div>
          <CardBody className="grid gap-6 sm:grid-cols-2">
            <dl className="grid gap-1.5 text-sm">
              <dt className="font-semibold">{tp.side1}</dt>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{tp.earned}</dt><dd className="tabular">{m(s.pay_earned_cents)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">− {tp.withdrawn}</dt><dd className="tabular">{m(s.withdrawn_cents)}</dd></div>
              <div className="flex justify-between gap-3 border-t border-border pt-1.5 font-medium"><dt>= {tp.payLeft}</dt><dd className="tabular">{m(s.pay_left_cents)}</dd></div>
            </dl>
            <dl className="grid gap-1.5 text-sm">
              <dt className="font-semibold">{tp.side2}</dt>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{tp.balance}</dt><dd className="tabular">{m(s.cash_balance_cents)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">− {tp.obligations}</dt><dd className="tabular">{m(s.obligations_30d_cents)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">− {tp.reserve}</dt><dd className="tabular">{m(s.reserve_floor_cents)}</dd></div>
              <div className="flex justify-between gap-3 border-t border-border pt-1.5 font-medium"><dt>= {tp.freeCash}</dt><dd className={cn("tabular", (s.free_cash_cents ?? 0) < 0 && "text-danger")}>{m(s.free_cash_cents)}</dd></div>
            </dl>
            <p className="text-xs text-muted-foreground sm:col-span-2">{tp.rule}</p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader title={tp.setupTitle} description={tp.setupDescription} />
        </Card>
      )}

      {s.configured && can.overrideBlocklist ? (
        <Card>
          <CardHeader title={tp.withdrawTitle} description={tp.withdrawDescription} />
          <CardBody>
            <WithdrawForm safeCents={s.safe_cents ?? 0} today={today} />
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title={tp.obligationsTitle} description={tp.obligationsDescription} />
          <CardBody className="flex flex-col gap-4">
            <PayableForm categories={expenseCategories} today={today} />
            <ul className="divide-y divide-border">
              {open.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium">{p.counterparty}</span>
                    {p.recurrence !== "none" ? <span className="ms-2 rounded bg-accent-soft px-1.5 text-xs text-accent-soft-foreground">{tp.recurrences[p.recurrence as keyof typeof tp.recurrences]}</span> : null}
                    <span className={cn("tabular block text-xs", p.due_on < today ? "font-medium text-danger" : "text-muted-foreground")}>
                      {p.due_on} · {t.money.categories[p.category as keyof typeof t.money.categories]}
                      {p.description ? ` · ${p.description}` : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular font-medium">{m(p.amount_cents)}</span>
                    <PayableActions id={p.id} />
                  </span>
                </li>
              ))}
              {open.length === 0 ? <li className="py-2 text-sm text-muted-foreground">{tp.noObligations}</li> : null}
            </ul>
          </CardBody>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title={tp.cashTitle} description={tp.cashDescription} />
          <CardBody className="flex flex-col gap-4">
            {can.overrideBlocklist ? <CashEntryForm today={today} hasOpening={(entries ?? []).some((e) => e.kind === "opening")} /> : null}
            <ul className="divide-y divide-border">
              {(entries ?? []).map((e) => (
                <li key={e.id} className="flex justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium">{tp.kinds[e.kind as keyof typeof tp.kinds]}</span>
                    {e.over_limit ? <span className="ms-2 rounded bg-danger-soft px-1.5 text-xs text-danger">{tp.overLimitBadge}</span> : null}
                    <span className="tabular block text-xs text-muted-foreground">
                      {e.entry_date}
                      {e.note ? ` · ${e.note}` : ""}
                    </span>
                  </span>
                  <span className={cn("tabular shrink-0 font-medium", e.amount_cents < 0 ? "text-danger" : "text-success")}>{m(e.amount_cents)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      {can.overrideBlocklist ? (
        <Card>
          <CardHeader title={tp.settingsTitle} description={tp.settingsDescription} />
          <CardBody>
            <SettingsForm
              funds={funds.map((f) => f.name)}
              initial={{
                openingDate: s.opening_date ?? today,
                reserveFloor: s.reserve_floor_cents !== undefined ? String(s.reserve_floor_cents / 100) : "0",
                ownerFundName: s.owner_fund_name ?? funds.find((f) => /pay|أجرة|rémun/i.test(f.name))?.name ?? ""
              }}
            />
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

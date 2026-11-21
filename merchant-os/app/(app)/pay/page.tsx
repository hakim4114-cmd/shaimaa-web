import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrganization } from "@/lib/data/context";
import { expenseCategories } from "@/lib/data/money";
import { getFundPlan } from "@/lib/data/routines";
import { businessDay } from "@/lib/datetime";
import { interpolate } from "@/lib/i18n/dictionaries";
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
  closed_months?: number;
};

export default async function PayPage() {
  const { t, locale } = await getI18n();
  const tp = t.pay;
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.seeMoney) redirect("/");
  const [{ data: safeRaw }, funds, { data: entries }, { data: payables }, { data: capitalRaw }, { data: rules }] = await Promise.all([
    supabase.rpc("safe_withdrawal", { p_organization_id: organizationId }),
    getFundPlan(supabase, organizationId),
    supabase.from("cash_entries").select("id, kind, amount_cents, entry_date, note, over_limit").eq("organization_id", organizationId).order("entry_date", { ascending: false }).limit(50),
    supabase.from("payables").select("id, counterparty, description, category, amount_cents, due_on, paid_on, recurrence").eq("organization_id", organizationId).order("due_on").limit(100),
    supabase.rpc("capital_status", { p_organization_id: organizationId }),
    supabase.from("cash_settings").select("capital_floor_pct, ad_budget_cents, ad_budget_revenue_pct, stock_cash_pct, reserve_floor_cents, reserve_pct, ad_budget_capital_pct, loss_cap_pct").eq("organization_id", organizationId).maybeSingle()
  ]);
  const capital = (capitalRaw ?? {}) as {
    configured?: boolean; cash_cents?: number; capital_cents?: number; stock_value_cents?: number; receivable_cents?: number;
    business_value_cents?: number; floor_pct?: number; floor_cents?: number; below_floor?: boolean;
    reserve_cents?: number; ad_budget_cents?: number; loss_cap_cents?: number;
  };
  const s = (safeRaw ?? { configured: false }) as Safe;
  const today = businessDay(new Date());
  const m = (c: number | undefined) => formatMoney(c ?? 0, locale);
  const open = (payables ?? []).filter((p) => !p.paid_on);

  // The three things the calculation needs, in the order the owner sets them up.
  const opening = (entries ?? []).find((e) => e.kind === "opening");
  const payFund = s.owner_fund_name ? funds.find((f) => f.name.trim().toLowerCase() === s.owner_fund_name!.trim().toLowerCase()) : undefined;
  const steps = [
    { title: tp.step1Title, done: Boolean(s.configured && opening), text: opening ? interpolate(tp.step1Done, { date: opening.entry_date }) : tp.step1Todo, close: false },
    {
      title: tp.step2Title,
      done: Boolean(payFund && payFund.percent > 0),
      text: payFund && payFund.percent > 0 ? interpolate(tp.step2Done, { percent: payFund.percent, fund: payFund.name }) : tp.step2Todo,
      close: !(payFund && payFund.percent > 0)
    },
    {
      title: tp.step3Title,
      done: (s.closed_months ?? 0) > 0,
      text: (s.closed_months ?? 0) > 0 ? interpolate(tp.step3Done, { count: s.closed_months ?? 0 }) : tp.step3Todo,
      close: (s.closed_months ?? 0) === 0
    }
  ];
  const allSet = steps.every((step) => step.done);
  const reason = (s.reason ?? "ok") as keyof typeof tp.explain;
  const explanation = interpolate(tp.explain[reason] ?? tp.explain.ok, {
    payLeft: m(s.pay_left_cents),
    free: m(s.free_cash_cents),
    safe: m(s.safe_cents),
    balance: m(s.cash_balance_cents),
    due: m(s.obligations_30d_cents),
    reserve: m(s.reserve_floor_cents),
    earned: m(s.pay_earned_cents)
  });
  const line = (label: string, hint: string, cents: number | undefined, sign = "") => (
    <div className="flex justify-between gap-3">
      <dt>
        <span className="text-foreground">{sign ? `${sign} ` : ""}{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </dt>
      <dd className="tabular shrink-0">{m(cents)}</dd>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={tp.title} description={tp.description} />

      {!allSet ? (
        <Card>
          <CardHeader title={tp.stepsTitle} description={tp.stepsDescription} />
          <CardBody>
            <ol className="flex flex-col gap-4">
              {steps.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  {step.done ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden /> : <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />}
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">
                      {index + 1}. {step.title}
                      <span className="sr-only">{step.done ? " ✓" : ""}</span>
                    </p>
                    <p className="text-muted-foreground">{step.text}</p>
                    {step.close ? (
                      <Link href="/close" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-2")}>
                        {tp.openClose}
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      ) : null}

      {s.configured ? (
        <Card className="overflow-hidden">
          <div className={cn("p-6", (s.safe_cents ?? 0) > 0 ? "bg-accent text-accent-foreground" : "bg-sidebar text-sidebar-foreground")}>
            <p className="text-sm opacity-85">{tp.safeTitle}</p>
            <p className="tabular mt-1 text-4xl font-bold">{m(s.safe_cents)}</p>
            <p className="mt-2 max-w-prose text-sm opacity-90">{explanation}</p>
          </div>
          <CardBody className="grid gap-6 sm:grid-cols-2">
            <dl className="grid content-start gap-2.5 text-sm">
              <dt className="font-semibold">{tp.side1}</dt>
              {line(tp.earned, tp.earnedHint, s.pay_earned_cents)}
              {line(tp.withdrawn, tp.withdrawnHint, s.withdrawn_cents, "−")}
              <div className="flex justify-between gap-3 border-t border-border pt-2 font-semibold"><dt>= {tp.payLeft}</dt><dd className="tabular">{m(s.pay_left_cents)}</dd></div>
            </dl>
            <dl className="grid content-start gap-2.5 text-sm">
              <dt className="font-semibold">{tp.side2}</dt>
              {line(tp.balance, tp.balanceHint, s.cash_balance_cents)}
              {line(tp.obligations, tp.obligationsHint, s.obligations_30d_cents, "−")}
              {line(tp.reserve, tp.reserveHint, s.reserve_floor_cents, "−")}
              <div className="flex justify-between gap-3 border-t border-border pt-2 font-semibold"><dt>= {tp.freeCash}</dt><dd className={cn("tabular", (s.free_cash_cents ?? 0) < 0 && "text-danger")}>{m(s.free_cash_cents)}</dd></div>
            </dl>
            <p className="rounded-md bg-surface-muted p-3 text-sm sm:col-span-2">{tp.ruleShort}</p>
          </CardBody>
        </Card>
      ) : null}

      {capital.configured && (capital.capital_cents ?? 0) > 0 ? (
        <Card className={cn("overflow-hidden", capital.below_floor && "ring-2 ring-danger")}>
          <CardHeader title={tp.capitalTitle} description={tp.capitalDescription} />
          <CardBody className="flex flex-col gap-3 text-sm">
            <p role={capital.below_floor ? "alert" : undefined} className={cn("rounded-md p-3 font-semibold", capital.below_floor ? "bg-danger-soft text-danger" : "bg-success-soft text-success")}>
              {capital.below_floor ? interpolate(tp.statusBelow, { floor: m(capital.floor_cents) }) : tp.statusOk}
            </p>
            <dl className="grid gap-2 sm:grid-cols-2">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{tp.capital}</dt><dd className="tabular">{m(capital.capital_cents)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{interpolate(tp.floor, { pct: capital.floor_pct ?? 0 })}</dt><dd className="tabular">{m(capital.floor_cents)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{tp.cash}</dt><dd className="tabular">{m(capital.cash_cents)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{tp.stockValue}</dt><dd className="tabular">{m(capital.stock_value_cents)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{tp.receivable}</dt><dd className="tabular">{m(capital.receivable_cents)}</dd></div>
              <div className="flex justify-between gap-3 border-t border-border pt-2 font-semibold"><dt>= {tp.businessValue}</dt><dd className={cn("tabular", capital.below_floor && "text-danger")}>{m(capital.business_value_cents)}</dd></div>
              <div className="mt-2 border-t border-border pt-2 text-xs font-semibold text-muted-foreground">{tp.rulesToday}</div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{tp.todayReserve}</dt><dd className="tabular">{m(capital.reserve_cents)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{tp.todayAdBudget}</dt><dd className="tabular">{m(capital.ad_budget_cents)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{tp.todayLossCap}</dt><dd className="tabular">{m(capital.loss_cap_cents)}</dd></div>
            </dl>
          </CardBody>
        </Card>
      ) : null}

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
              funds={funds.map((f) => ({ name: f.name, percent: f.percent }))}
              initial={{
                openingDate: s.opening_date ?? today,
                reserveFloor: rules?.reserve_floor_cents ? String(rules.reserve_floor_cents / 100) : "",
                capitalFloorPct: String(rules?.capital_floor_pct ?? 80),
                adBudget: rules?.ad_budget_cents != null ? String(rules.ad_budget_cents / 100) : "",
                reservePct: String(rules?.reserve_pct ?? 25),
                adCapitalPct: String(rules?.ad_budget_capital_pct ?? 15),
                lossCapPct: String(rules?.loss_cap_pct ?? 10),
                adBudgetPct: String(rules?.ad_budget_revenue_pct ?? 30),
                stockPct: String(rules?.stock_cash_pct ?? 50),
                ownerFundName: s.owner_fund_name ?? funds.find((f) => /pay|أجرة|rémun/i.test(f.name))?.name ?? ""
              }}
            />
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

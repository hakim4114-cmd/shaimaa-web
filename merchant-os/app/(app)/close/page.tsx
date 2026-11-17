import Link from "next/link";
import { redirect } from "next/navigation";
import { ExportMenu } from "@/components/export/export-menu";
import { ProfitAndLoss } from "@/components/money/pnl";
import { CloseMonthButton, FundPlanForm } from "@/components/money/routine-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrganization } from "@/lib/data/context";
import { getReport } from "@/lib/data/money";
import { allocate, getFundPlan, getMonthlyClose, getStockHealth } from "@/lib/data/routines";
import { formatDateTime } from "@/lib/datetime";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/money";
import { monthRange } from "@/lib/ranges";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.routines.monthlyTitle };
}

export default async function MonthlyClosePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, locale } = await getI18n();
  const tr = t.routines;
  const offset = (await searchParams).month === "last" ? 1 : 0;
  const { from, to } = monthRange(offset);
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.seeMoney) redirect("/");
  const [report, plan, closed, stock] = await Promise.all([
    getReport(supabase, organizationId, from, to),
    getFundPlan(supabase, organizationId),
    getMonthlyClose(supabase, organizationId, from),
    getStockHealth(supabase, organizationId)
  ]);
  if (!report) return null;
  const proposal = closed ? closed.allocations : allocate(report.netProfitCents, plan);
  const dormant = (days: number) => stock.filter((r) => (r.idleDays ?? 0) > days);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={tr.monthlyTitle} description={`${tr.monthlyDescription} ${from} → ${to}`} actions={<ExportMenu dataset="expenses" range={offset ? "last_month" : "month"} />} />
      <nav className="flex gap-1 print:hidden">
        {[0, 1].map((o) => (
          <Link
            key={o}
            href={o ? "/close?month=last" : "/close"}
            className={cn("inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium", o === offset ? "border-transparent bg-foreground text-background" : "border-border bg-surface text-muted-foreground")}
          >
            {o ? t.money.ranges.last_month : t.money.ranges.month}
          </Link>
        ))}
      </nav>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={`1. ${t.money.pnl.title}`} />
          <CardBody>
            <ProfitAndLoss report={report} t={t} locale={locale} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title={`2. ${tr.funds}`}
            description={tr.fundsDescription}
            action={closed ? <Badge tone="success" dot>{tr.closedBadge}</Badge> : null}
          />
          <CardBody className="flex flex-col gap-4">
            {proposal.length ? (
              <dl className="grid gap-1.5 rounded-md bg-surface-muted p-3 text-sm">
                {proposal.map((p) => (
                  <div key={p.name} className="flex justify-between gap-3">
                    <dt>{p.name}</dt>
                    <dd className="tabular font-medium">{formatMoney(p.cents, locale)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">{report.netProfitCents <= 0 ? tr.noProfit : tr.noPlan}</p>
            )}
            {closed ? (
              <p className="text-xs text-muted-foreground">{formatDateTime(closed.closedAt, locale)}</p>
            ) : offset === 0 ? (
              <>
                {can.overrideBlocklist ? <FundPlanForm initial={plan.map((p) => ({ name: p.name, percent: p.percent }))} /> : null}
                <p className="rounded-md bg-surface-muted p-3 text-sm text-muted-foreground">{tr.monthNotOver}</p>
              </>
            ) : can.overrideBlocklist ? (
              <>
                <FundPlanForm initial={plan.map((p) => ({ name: p.name, percent: p.percent }))} />
                <div className="border-t border-border pt-4">
                  <CloseMonthButton offset={offset} />
                </div>
              </>
            ) : null}
          </CardBody>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <CardHeader title={`3. ${tr.dormantTitle}`} description={tr.dormantDescription} />
        <div className="grid gap-px bg-border sm:grid-cols-3">
          {[30, 60, 90].map((days) => {
            const rows = dormant(days);
            return (
              <div key={days} className="bg-surface p-4">
                <p className="text-sm font-medium">{tr.idleOver.replace("{days}", String(days))}</p>
                <p className="tabular mt-1 text-xl font-bold">{formatMoney(rows.reduce((s, r) => s + (r.valueCents ?? 0), 0), locale)}</p>
                <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                  {rows.slice(0, 8).map((r) => (
                    <li key={r.variantId} className="flex justify-between gap-2">
                      <span className="min-w-0 truncate">{r.label}</span>
                      <span className="tabular shrink-0">×{r.onHand}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

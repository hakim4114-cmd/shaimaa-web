import { Receipt } from "lucide-react";
import { redirect } from "next/navigation";
import { DeleteExpenseButton, ExpenseForm } from "@/components/money/expense-form";
import { ProfitAndLoss } from "@/components/money/pnl";
import { RangeTabs } from "@/components/money/range-tabs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Metric } from "@/components/ui/metric";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrganization } from "@/lib/data/context";
import { expenseCategories, getReport, listCampaigns, listExpenses } from "@/lib/data/money";
import { businessDay } from "@/lib/datetime";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/money";
import { parsePreset, resolveRange } from "@/lib/ranges";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.money.financeTitle };
}

export default async function FinancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, locale } = await getI18n();
  const tm = t.money;
  const preset = parsePreset((await searchParams).range, "month");
  const { from, to } = resolveRange(preset);
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.seeMoney) redirect("/");
  const [report, expenses, campaigns] = await Promise.all([
    getReport(supabase, organizationId, from, to),
    listExpenses(supabase, organizationId, from, to),
    listCampaigns(supabase, organizationId)
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={tm.financeTitle} description={tm.financeDescription} />
      <RangeTabs basePath="/finance" current={preset} labels={tm.ranges} />

      {report ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric tone="hero" label={tm.pnl.netProfit} value={formatMoney(report.netProfitCents, locale)} />
          <Metric label={tm.cashCollected} value={formatMoney(report.cashCollectedCents, locale)} />
          <Metric label={tm.receivable} value={formatMoney(report.codReceivableCents, locale)} hint={tm.receivableHint} />
          <Metric label={tm.cashOut} value={formatMoney(report.cashOutCents, locale)} hint={tm.cashOutHint} />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title={tm.addExpense} description={tm.expenseHint} />
            <CardBody>
              <ExpenseForm today={businessDay(new Date())} categories={expenseCategories} campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))} />
            </CardBody>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader title={tm.expenses} />
            {expenses.length === 0 ? (
              <EmptyState icon={Receipt} title={tm.noExpenses} />
            ) : (
              <ul className="divide-y divide-border">
                {expenses.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {tm.categories[e.category]}
                        {e.campaignName ? <span className="text-muted-foreground"> · {e.campaignName}</span> : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        <span className="tabular">{e.incurredOn}</span>
                        {e.description ? ` · ${e.description}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="tabular font-medium">{formatMoney(e.amountCents, locale)}</span>
                      <DeleteExpenseButton id={e.id} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        {report ? (
          <Card>
            <CardHeader title={tm.pnl.title} />
            <CardBody>
              <ProfitAndLoss report={report} t={t} locale={locale} />
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

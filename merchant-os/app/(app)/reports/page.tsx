import { Download } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requireOrganization } from "@/lib/data/context";
import { getPeriodReport } from "@/lib/data/reports";
import { businessDay } from "@/lib/datetime";
import { interpolate } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/money";
import { parseHalf, parseMonth, recentMonths, reportPeriod, type Half } from "@/lib/reports/periods";
import { minOrdersToJudge, sleepingDays, type Verdict } from "@/lib/reports/products";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.reports.title };
}

const verdictTone: Record<Verdict, "success" | "warning" | "danger" | "neutral" | "info"> = {
  winning: "success",
  watch: "warning",
  losing: "danger",
  early: "neutral",
  sleeping: "info"
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ month?: string; half?: string }> }) {
  const { t, locale } = await getI18n();
  const tr = t.reports;
  const ctx = await requireOrganization();
  if (!ctx.can.seeMoney) redirect("/");
  const params = await searchParams;
  const today = businessDay(new Date());
  const month = parseMonth(params.month, today);
  const half = parseHalf(params.half);
  const period = reportPeriod(month, half);
  const report = await getPeriodReport(ctx, period, today);
  const m = (c: number | null | undefined) => (c === null || c === undefined ? "—" : formatMoney(c, locale));
  const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${Math.round(v * 100)}%`);
  const monthLabel = (value: string) => new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T12:00:00Z`));
  const href = (next: { month?: string; half?: Half }) => `/reports?month=${next.month ?? month}&half=${next.half ?? half}`;
  const s = report.summary;
  const p = report.previousSummary;
  const delivery = (r: typeof s) => (r && r.ordersDelivered + r.ordersRefused ? r.ordersDelivered / (r.ordersDelivered + r.ordersRefused) : null);
  const metrics = [
    { label: tr.ordersCreated, now: s ? String(s.ordersCreated) : "—", before: p ? String(p.ordersCreated) : "—" },
    { label: tr.confirmationRate, now: pct(s?.confirmationRate), before: pct(p?.confirmationRate) },
    { label: tr.deliveryRate, now: pct(delivery(s)), before: pct(delivery(p)) },
    { label: tr.netRevenue, now: m(s?.netRevenueCents), before: m(p?.netRevenueCents) },
    { label: tr.advertising, now: m(s?.advertisingCents), before: m(p?.advertisingCents) },
    { label: tr.netProfit, now: m(s?.netProfitCents), before: m(p?.netProfitCents), strong: true }
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tr.title}
        description={tr.description}
        actions={
          <a href={`/api/reports?month=${month}&half=${half}&lang=${locale}`} className={buttonVariants({ variant: "primary" })}>
            <Download /> {tr.download}
          </a>
        }
      />

      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label={tr.period}>
            <span className="text-muted-foreground">{tr.period}</span>
            {recentMonths(today, 6).map((value) => (
              <Link key={value} href={href({ month: value })} aria-current={value === month ? "page" : undefined} className={cn("min-h-9 rounded-full border px-3 py-1.5", value === month ? "border-accent bg-accent-soft text-accent-soft-foreground" : "border-border hover:bg-surface-hover")}>
                {monthLabel(value)}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm" role="group">
            {(["all", "1", "2"] as const).map((value) => (
              <Link key={value} href={href({ half: value })} aria-current={value === half ? "page" : undefined} className={cn("min-h-9 rounded-full border px-3 py-1.5", value === half ? "border-accent bg-accent-soft text-accent-soft-foreground" : "border-border hover:bg-surface-hover")}>
                {value === "all" ? tr.wholeMonth : value === "1" ? tr.firstHalf : tr.secondHalf}
              </Link>
            ))}
          </div>
          <p className="tabular text-xs text-muted-foreground">
            {period.from} → {period.to} · {interpolate(tr.comparedWith, { from: report.previous.from, to: report.previous.to })}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={tr.summaryTitle} />
        <CardBody>
          <dl className="grid gap-3 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-md bg-surface-muted p-3">
                <dt className="text-xs text-muted-foreground">{metric.label}</dt>
                <dd className={cn("tabular mt-1 text-lg", metric.strong ? "font-bold" : "font-semibold")}>{metric.now}</dd>
                <dd className="tabular text-xs text-muted-foreground">
                  {tr.previous}: {metric.before}
                </dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title={tr.productsTitle} description={tr.productsDescription} />
        <CardBody className="flex flex-col gap-3">
          {report.truncated ? <p className="text-sm text-warning">{tr.truncated}</p> : null}
          {report.products.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tr.noData}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>{tr.colProduct}</TH>
                    <TH>{tr.colVerdict}</TH>
                    <TH className="text-end">{tr.colOrders}</TH>
                    <TH className="text-end">{tr.colConfRate}</TH>
                    <TH className="text-end">{tr.colDelivRate}</TH>
                    <TH className="text-end">{tr.colRevenue}</TH>
                    <TH className="text-end">{tr.colAds}</TH>
                    <TH className="text-end">{tr.colProfit}</TH>
                    <TH className="text-end">{tr.colMargin}</TH>
                    <TH className="text-end">{tr.colStock}</TH>
                    <TH className="text-end">{tr.colCover}</TH>
                  </TR>
                </THead>
                <TBody>
                  {report.products.map((row) => (
                    <TR key={row.key}>
                      <TD className="font-medium">
                        {row.productName}
                        {row.costMissing ? <span className="block text-xs font-normal text-warning">{tr.costMissing}</span> : null}
                      </TD>
                      <TD>
                        <Badge tone={verdictTone[row.verdict]} dot>
                          {tr.verdicts[row.verdict]}
                        </Badge>
                      </TD>
                      <TD className="tabular text-end">
                        {row.ordersPlaced}
                        <span className="block text-xs text-muted-foreground">
                          {row.ordersDelivered}✓ · {row.ordersRefused}✗
                        </span>
                      </TD>
                      <TD className="tabular text-end">{pct(row.confirmationRate)}</TD>
                      <TD className="tabular text-end">{pct(row.deliveryRate)}</TD>
                      <TD className="tabular text-end">{m(row.revenueCents)}</TD>
                      <TD className="tabular text-end">{m(row.adCostCents)}</TD>
                      <TD className={cn("tabular text-end font-medium", row.profitCents < 0 && "text-danger")}>{m(row.profitCents)}</TD>
                      <TD className="tabular text-end">{pct(row.margin)}</TD>
                      <TD className="tabular text-end">{row.onHand}</TD>
                      <TD className="tabular text-end">{row.daysOfCover ?? "—"}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
          <p className="rounded-md bg-surface-muted p-3 text-xs text-muted-foreground">{interpolate(tr.legend, { min: minOrdersToJudge, days: sleepingDays })}</p>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title={tr.citiesTitle} description={tr.citiesDescription} />
          <CardBody>
            {report.cities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tr.noData}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH>{tr.colCity}</TH>
                      <TH className="text-end">{tr.colOrders}</TH>
                      <TH className="text-end">{tr.colDelivered}</TH>
                      <TH className="text-end">{tr.colRefused}</TH>
                      <TH className="text-end">{tr.colDelivRate}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {report.cities.slice(0, 15).map((c) => (
                      <TR key={c.city}>
                        <TD>{c.city}</TD>
                        <TD className="tabular text-end">{c.orders}</TD>
                        <TD className="tabular text-end">{c.delivered}</TD>
                        <TD className="tabular text-end">{c.refused}</TD>
                        <TD className={cn("tabular text-end", c.deliveryRate !== null && c.deliveryRate < 0.5 && "text-danger")}>{pct(c.deliveryRate)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title={tr.sleepingTitle} description={interpolate(tr.sleepingDescription, { days: sleepingDays })} />
          <CardBody>
            {report.sleeping.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {report.sleeping.map((row) => (
                  <li key={row.variantId} className="flex justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="font-medium">{row.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {row.onHand} · {tr.colIdle}: {row.idleDays ?? "—"}
                      </span>
                    </span>
                    <span className="tabular shrink-0 font-medium">{m(row.valueCents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className={cn("overflow-hidden", report.violations.length > 0 && "ring-1 ring-danger")}>
        <CardHeader title={tr.violationsTitle} description={tr.violationsDescription} />
        <CardBody>
          {report.violations.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tr.noViolations}</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {report.violations.map((v, index) => (
                <li key={`${v.date}-${index}`} className="flex justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="font-medium">
                      {v.kind === "withdrawal" ? tr.withdrawalOver : t.money.categories[v.category as keyof typeof t.money.categories] ?? v.category}
                    </span>
                    {v.flags.length ? <span className="block text-xs text-danger">{v.flags.map((f) => t.pay.guard.flags[f as keyof typeof t.pay.guard.flags] ?? f).join(" · ")}</span> : null}
                    <span className="block text-xs text-muted-foreground">
                      {v.date} · {v.reason}
                    </span>
                  </span>
                  <span className="tabular shrink-0 font-medium">{m(v.amountCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title={tr.campaignsTitle} />
        <CardBody>
          {report.campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tr.noData}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>{tr.colCampaign}</TH>
                    <TH className="text-end">{tr.colSpend}</TH>
                    <TH className="text-end">{tr.colOrders}</TH>
                    <TH className="text-end">{tr.colDelivered}</TH>
                    <TH className="text-end">{tr.colRevenue}</TH>
                  </TR>
                </THead>
                <TBody>
                  {report.campaigns.map((c) => (
                    <TR key={c.campaignId ?? "none"}>
                      <TD>{c.name ?? tr.noCampaign}</TD>
                      <TD className="tabular text-end">{m(c.spendCents)}</TD>
                      <TD className="tabular text-end">{c.orders}</TD>
                      <TD className="tabular text-end">{c.delivered}</TD>
                      <TD className="tabular text-end">{m(c.deliveredRevenueCents)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

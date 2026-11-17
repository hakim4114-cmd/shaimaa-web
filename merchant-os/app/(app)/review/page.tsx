import Link from "next/link";
import { redirect } from "next/navigation";
import { DecisionForm, DecisionList } from "@/components/money/routine-forms";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requireOrganization } from "@/lib/data/context";
import { getCampaignReport, getReport, listReceivable, type Report } from "@/lib/data/money";
import { getStockHealth, listDecisions } from "@/lib/data/routines";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/money";
import { weekRange } from "@/lib/ranges";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.routines.weeklyTitle };
}

const deliveryRate = (r: Report) => {
  const d = r.ordersDelivered + r.ordersRefused + r.ordersReturned;
  return d ? r.ordersDelivered / d : null;
};
const contribution = (r: Report) => r.netRevenueCents - r.cogsCents - r.shippingCostCents - r.advertisingCents;

/** Days since delivery, by bucket — computed outside render (uses the clock). */
function ageBuckets(rows: { codAmountCents: number; deliveredAt: string | null }[]) {
  const now = Date.now();
  const b = { fresh: 0, mid: 0, old: 0 };
  for (const r of rows) {
    const days = r.deliveredAt ? (now - Date.parse(r.deliveredAt)) / 86400000 : 0;
    if (days <= 7) b.fresh += r.codAmountCents;
    else if (days <= 14) b.mid += r.codAmountCents;
    else b.old += r.codAmountCents;
  }
  return b;
}

export default async function WeeklyReviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, locale } = await getI18n();
  const tr = t.routines;
  const offset = (await searchParams).week === "last" ? 1 : 0;
  const week = weekRange(offset);
  const prev = weekRange(offset + 1);
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.seeMoney) redirect("/");
  const [now, before, receivable, stock, campaigns, decisions] = await Promise.all([
    getReport(supabase, organizationId, week.from, week.to),
    getReport(supabase, organizationId, prev.from, prev.to),
    listReceivable(supabase, organizationId),
    getStockHealth(supabase, organizationId),
    getCampaignReport(supabase, organizationId, week.from, week.to),
    can.overrideBlocklist ? listDecisions(supabase, organizationId) : Promise.resolve([])
  ]);
  if (!now || !before) return null;
  const money = (c: number | null) => (c === null ? "—" : formatMoney(c, locale));
  const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
  const buckets = ageBuckets(receivable);
  const stockValue = stock.reduce((s, r) => s + (r.valueCents ?? 0), 0);
  const dormantValue = stock.filter((r) => (r.idleDays ?? 0) > 30).reduce((s, r) => s + (r.valueCents ?? 0), 0);

  const rows: { label: string; question: string; now: string; before: string; better?: boolean | null }[] = [
    { label: tr.ind.cash, question: tr.q.cash, now: money(now.cashCollectedCents), before: money(before.cashCollectedCents), better: now.cashCollectedCents >= before.cashCollectedCents },
    { label: tr.ind.receivable, question: tr.q.receivable, now: `${money(buckets.fresh + buckets.mid + buckets.old)} (0–7: ${money(buckets.fresh)} · 8–14: ${money(buckets.mid)} · 15+: ${money(buckets.old)})`, before: "", better: buckets.old === 0 },
    { label: tr.ind.stock, question: tr.q.stock, now: `${money(stockValue)} · ${tr.dormant}: ${money(dormantValue)}`, before: "", better: null },
    { label: tr.ind.delivered, question: tr.q.delivered, now: String(now.ordersDelivered), before: String(before.ordersDelivered), better: now.ordersDelivered >= before.ordersDelivered },
    { label: tr.ind.deliveryRate, question: tr.q.deliveryRate, now: pct(deliveryRate(now)), before: pct(deliveryRate(before)), better: (deliveryRate(now) ?? 0) >= (deliveryRate(before) ?? 0) },
    { label: tr.ind.cpd, question: tr.q.cpd, now: money(now.costPerDeliveredCents), before: money(before.costPerDeliveredCents), better: now.costPerDeliveredCents === null || before.costPerDeliveredCents === null ? null : now.costPerDeliveredCents <= before.costPerDeliveredCents },
    { label: tr.ind.margin, question: tr.q.margin, now: money(contribution(now)), before: money(contribution(before)), better: contribution(now) >= contribution(before) },
    { label: tr.ind.returns, question: tr.q.returns, now: `${now.ordersRefused + now.ordersReturned}`, before: `${before.ordersRefused + before.ordersReturned}`, better: now.ordersRefused + now.ordersReturned <= before.ordersRefused + before.ordersReturned }
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={tr.weeklyTitle} description={`${tr.weeklyDescription} ${week.from} → ${week.to}`} />
      <nav className="flex gap-1">
        {[0, 1].map((o) => (
          <Link
            key={o}
            href={o ? "/review?week=last" : "/review"}
            className={cn("inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium", o === offset ? "border-transparent bg-foreground text-background" : "border-border bg-surface text-muted-foreground")}
          >
            {o ? tr.lastWeek : tr.thisWeek}
          </Link>
        ))}
      </nav>
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>{tr.indicator}</TH>
              <TH>{tr.thisWeekCol}</TH>
              <TH>{tr.lastWeekCol}</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.label}>
                <TD className="min-w-48 whitespace-normal">
                  <p className="font-medium">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.question}</p>
                </TD>
                <TD className={cn("tabular whitespace-normal font-medium", r.better === true && "text-success", r.better === false && "text-danger")}>{r.now}</TD>
                <TD className="tabular whitespace-normal text-muted-foreground">{r.before}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader title={tr.adsBlock} />
        <ul className="divide-y divide-border">
          {campaigns.filter((c) => c.spendCents || c.orders).map((c) => (
            <li key={c.campaignId ?? "none"} className="flex flex-wrap justify-between gap-2 px-5 py-2.5 text-sm">
              <span className="font-medium">{c.name ?? t.money.unattributed}</span>
              <span className="tabular text-muted-foreground">
                {money(c.spendCents)} · {c.delivered} {t.money.deliveredCol} · {t.money.costPerDelivered}: {money(c.delivered ? Math.round(c.spendCents / c.delivered) : null)}
              </span>
            </li>
          ))}
          {campaigns.every((c) => !c.spendCents && !c.orders) ? <li className="px-5 py-3 text-sm text-muted-foreground">{t.money.noCampaigns}</li> : null}
        </ul>
      </Card>
      {can.overrideBlocklist ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title={tr.decisionTitle} description={tr.decisionDescription} />
            <CardBody>
              <DecisionForm weekStart={week.from} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={tr.pastDecisions} />
            <CardBody>
              <DecisionList decisions={decisions} />
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

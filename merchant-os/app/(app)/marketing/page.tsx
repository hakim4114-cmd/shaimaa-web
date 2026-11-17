import { Megaphone } from "lucide-react";
import { redirect } from "next/navigation";
import { CampaignForm, EndCampaignButton } from "@/components/money/campaign-form";
import { ExpenseForm } from "@/components/money/expense-form";
import { RangeTabs } from "@/components/money/range-tabs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Metric } from "@/components/ui/metric";
import { PageHeader } from "@/components/ui/page-header";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requireOrganization } from "@/lib/data/context";
import { getCampaignReport, listCampaigns, marketingPlatforms } from "@/lib/data/money";
import { businessDay } from "@/lib/datetime";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/money";
import { parsePreset, resolveRange } from "@/lib/ranges";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.money.marketingTitle };
}

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");

export default async function MarketingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, locale } = await getI18n();
  const tm = t.money;
  const preset = parsePreset((await searchParams).range, "30d");
  const { from, to } = resolveRange(preset);
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.seeMoney) redirect("/");
  const [rows, campaigns] = await Promise.all([getCampaignReport(supabase, organizationId, from, to), listCampaigns(supabase, organizationId)]);
  const today = businessDay(new Date());
  const active = campaigns.filter((c) => !c.endsOn || c.endsOn >= today);
  const total = rows.reduce(
    (acc, r) => ({ spend: acc.spend + r.spendCents, orders: acc.orders + r.orders, delivered: acc.delivered + r.delivered, revenue: acc.revenue + r.deliveredRevenueCents }),
    { spend: 0, orders: 0, delivered: 0, revenue: 0 }
  );
  const money = (c: number | null) => (c === null ? "—" : formatMoney(c, locale));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={tm.marketingTitle} description={tm.marketingDescription} />
      <RangeTabs basePath="/marketing" current={preset} labels={tm.ranges} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric tone="hero" label={tm.costPerDelivered} value={total.delivered ? formatMoney(Math.round(total.spend / total.delivered), locale) : null} unavailableReason={tm.noDeliveries} />
        <Metric label={tm.adSpend} value={formatMoney(total.spend, locale)} />
        <Metric label={tm.costPerOrder} value={total.orders ? formatMoney(Math.round(total.spend / total.orders), locale) : null} unavailableReason="—" />
        <Metric label={tm.roas} value={total.spend ? `${(total.revenue / total.spend).toFixed(2)}×` : null} unavailableReason="—" hint={tm.roasHint} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader title={tm.campaignReport} description={tm.campaignReportHint} />
        {rows.length === 0 ? (
          <EmptyState icon={Megaphone} title={tm.noCampaigns} description={tm.noCampaignsHint} />
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>{tm.campaign}</TH>
                <TH className="text-end">{tm.adSpend}</TH>
                <TH className="text-end">{tm.orders}</TH>
                <TH className="text-end">{tm.confirmRate}</TH>
                <TH className="text-end">{tm.deliveredCol}</TH>
                <TH className="text-end">{tm.costPerDelivered}</TH>
                <TH className="text-end">{tm.roas}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.campaignId ?? "none"}>
                  <TD className="min-w-40 whitespace-normal">
                    <p className="font-medium">{r.name ?? tm.unattributed}</p>
                    {r.platform ? <p className="text-xs text-muted-foreground">{tm.platforms[r.platform]}</p> : null}
                  </TD>
                  <TD className="tabular text-end">{formatMoney(r.spendCents, locale)}</TD>
                  <TD className="tabular text-end">{r.orders}</TD>
                  <TD className="tabular text-end">{pct(r.confirmed, r.orders)}</TD>
                  <TD className="tabular text-end">
                    {r.delivered}
                    {r.refused ? <span className="text-xs text-danger"> / {r.refused}✕</span> : null}
                  </TD>
                  <TD className="tabular text-end font-medium">{money(r.delivered ? Math.round(r.spendCents / r.delivered) : null)}</TD>
                  <TD className="tabular text-end">{r.spendCents ? `${(r.deliveredRevenueCents / r.spendCents).toFixed(2)}×` : "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={tm.addSpend} description={tm.addSpendHint} />
          <CardBody>
            <ExpenseForm adsOnly today={today} categories={["advertising"]} campaigns={active.map((c) => ({ id: c.id, name: c.name }))} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={tm.campaigns} />
          <CardBody className="flex flex-col gap-4">
            {can.overrideBlocklist ? <CampaignForm platforms={marketingPlatforms} today={today} /> : null}
            <ul className="divide-y divide-border">
              {campaigns.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground"> · {tm.platforms[c.platform]}</span>
                    {c.endsOn ? <span className="text-xs text-muted-foreground"> · {tm.ended} {c.endsOn}</span> : null}
                  </span>
                  {!c.endsOn && can.overrideBlocklist ? <EndCampaignButton id={c.id} /> : null}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

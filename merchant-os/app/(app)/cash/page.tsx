import Link from "next/link";
import { redirect } from "next/navigation";
import { SenditInvoices } from "@/components/money/sendit-invoices";
import { ExportMenu } from "@/components/export/export-menu";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Metric } from "@/components/ui/metric";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrganization } from "@/lib/data/context";
import { listReceivable, listRemittances } from "@/lib/data/money";
import { getSenditProvider } from "@/lib/data/shipping";
import { businessDay, formatDateTime } from "@/lib/datetime";
import { interpolate } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/money";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.money.cash.title };
}

/** Delivered more than 10 days ago and still unpaid deserves a look. */
function overdueCutoff() {
  return businessDay(new Date(Date.now() - 10 * 86400000));
}

export default async function CashPage() {
  const { t, locale } = await getI18n();
  const tc = t.money.cash;
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.seeMoney) redirect("/");
  const [receivable, remittances, sendit] = await Promise.all([
    listReceivable(supabase, organizationId),
    listRemittances(supabase, organizationId),
    getSenditProvider(supabase, organizationId)
  ]);
  const total = receivable.reduce((s, r) => s + r.codAmountCents, 0);
  const cutoff = overdueCutoff();
  const old = receivable.filter((r) => r.deliveredAt && businessDay(r.deliveredAt) <= cutoff);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={tc.title} description={tc.description} actions={<ExportMenu dataset="receivable" />} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric tone="hero" label={tc.receivable} value={formatMoney(total, locale)} hint={interpolate(tc.parcels, { count: receivable.length })} />
        <Metric label={tc.overdue} value={formatMoney(old.reduce((s, r) => s + r.codAmountCents, 0), locale)} hint={interpolate(tc.overdueHint, { count: old.length })} />
        <Metric label={tc.lastPayout} value={remittances[0] ? formatMoney(remittances[0].netCents, locale) : null} unavailableReason={tc.noPayouts} hint={remittances[0]?.receivedOn} />
      </div>

      {sendit ? (
        <Card>
          <CardHeader title={tc.senditInvoices} description={tc.senditInvoicesHint} />
          <CardBody>
            <SenditInvoices />
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title={tc.waiting} />
          {receivable.length === 0 ? (
            <CardBody className="text-sm text-muted-foreground">{tc.nothingWaiting}</CardBody>
          ) : (
            <ul className="divide-y divide-border">
              {receivable.map((r) => (
                <li key={r.orderId}>
                  <Link href={`/orders/${r.orderId}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm hover:bg-surface-hover">
                    <span className="min-w-0">
                      <span className="tabular font-medium">{r.orderNumber}</span>
                      {r.trackingNumber ? <span className="tabular text-muted-foreground"> · {r.trackingNumber}</span> : null}
                      {r.deliveredAt ? <span className="block text-xs text-muted-foreground">{formatDateTime(r.deliveredAt, locale, "short")}</span> : null}
                    </span>
                    <span className="tabular shrink-0 font-medium">{formatMoney(r.codAmountCents, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title={tc.history} />
          {remittances.length === 0 ? (
            <CardBody className="text-sm text-muted-foreground">{tc.noPayouts}</CardBody>
          ) : (
            <ul className="divide-y divide-border">
              {remittances.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="tabular font-medium">{r.reference || "—"}</span>
                    <span className="tabular block text-xs text-muted-foreground">
                      {r.receivedOn} · {interpolate(tc.parcels, { count: r.items })} · {tc.fees} {formatMoney(r.feesCents + r.otherCents, locale)}
                    </span>
                  </span>
                  <span className="tabular shrink-0 font-semibold text-success">{formatMoney(r.netCents, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

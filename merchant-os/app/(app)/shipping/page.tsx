import { Truck } from "lucide-react";
import Link from "next/link";
import { PickupActions } from "@/components/shipping/pickup-actions";
import { shipmentTone } from "@/components/shipping/shipment-panel";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrganization } from "@/lib/data/context";
import { countShipments, listShipments, shipmentViews, type ShipmentView } from "@/lib/data/shipping";
import { formatDateTime } from "@/lib/datetime";
import { interpolate } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.shipping.title };
}

export default async function ShippingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, locale } = await getI18n();
  const ts = t.shipping;
  const params = await searchParams;
  const view: ShipmentView = shipmentViews.find((v) => v === params.view) ?? "to_pickup";
  const { supabase, organizationId, can } = await requireOrganization();
  const [rows, counts] = await Promise.all([listShipments(supabase, organizationId, view, can.seeContacts), countShipments(supabase, organizationId)]);
  const pendingCodes = view === "to_pickup" ? rows.filter((r) => r.isSendit && r.trackingNumber).map((r) => r.trackingNumber as string) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={ts.title} description={ts.description} />

      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label={ts.title}>
        {shipmentViews.map((tab) => {
          const count = tab === "to_pickup" ? counts.to_pickup : tab === "in_transit" ? counts.in_transit : tab === "problems" ? counts.problems : 0;
          return (
            <Link
              key={tab}
              href={`/shipping?view=${tab}`}
              aria-current={tab === view ? "page" : undefined}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium pointer-coarse:h-10",
                tab === view ? "border-transparent bg-foreground text-background" : "border-border bg-surface text-muted-foreground hover:text-foreground"
              )}
            >
              {ts.views[tab]}
              {count ? (
                <span className={cn("tabular rounded-full px-1.5 text-xs", tab === view ? "bg-background/20" : tab === "problems" ? "bg-warning-soft text-warning" : "bg-accent-soft text-accent-soft-foreground")}>
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {view === "to_pickup" && can.prepareOrders && pendingCodes.length > 0 ? <PickupActions codes={pendingCodes} /> : null}

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={Truck} title={ts.empty} description={ts.emptyHint} />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.id}>
                <Link href={`/orders/${row.orderId}`} className="flex flex-col gap-1.5 px-4 py-3.5 hover:bg-surface-hover sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate font-medium">{row.customerName ?? row.orderNumber}</span>
                    <Badge tone={shipmentTone[row.status]} dot>
                      {ts.status[row.status]}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="tabular min-w-0 truncate" dir="ltr">
                      {[row.trackingNumber, row.orderNumber].filter(Boolean).join(" · ")}
                    </span>
                    <span className="tabular">{formatMoney(row.codAmountCents, locale)}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <span>{row.carrierDistrictName ?? row.city}</span>
                    {row.carrierStatus ? <span>Sendit: {ts.senditStatus[row.carrierStatus as keyof typeof ts.senditStatus] ?? row.carrierStatus}</span> : null}
                    {row.unreachableCount > 0 ? <span className="font-medium text-warning">{interpolate(ts.unreachableCount, { count: row.unreachableCount })}</span> : null}
                    <span>{formatDateTime(row.carrierUpdatedAt ?? row.createdAt, locale, "short")}</span>
                  </div>
                  {row.carrierMessage && row.status === "failed_attempt" ? <p className="text-xs text-warning">{row.carrierMessage}</p> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

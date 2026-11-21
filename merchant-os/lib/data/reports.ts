import "server-only";
import type { requireOrganization } from "@/lib/data/context";
import { getCampaignReport, getReport, type CampaignRow, type Report } from "@/lib/data/money";
import { cities, idleStock, performance, type CityRow, type PerformanceRow, type ReportOrder, type StockInfo } from "@/lib/reports/products";
import { elapsedDays, previousPeriod, type ReportPeriod } from "@/lib/reports/periods";

type Ctx = Awaited<ReturnType<typeof requireOrganization>>;

export type PeriodReport = {
  period: ReportPeriod;
  previous: ReportPeriod;
  summary: Report | null;
  previousSummary: Report | null;
  products: PerformanceRow[];
  variants: PerformanceRow[];
  cities: CityRow[];
  campaigns: CampaignRow[];
  sleeping: ReturnType<typeof idleStock>;
  truncated: boolean;
};

const maxOrders = 5000;

/** Orders created in the period, as Moroccan days (a one-day margin, then an exact filter). */
async function loadOrders(ctx: Ctx, period: ReportPeriod): Promise<{ orders: ReportOrder[]; truncated: boolean }> {
  const fromTs = new Date(Date.parse(`${period.from}T00:00:00Z`) - 86400000).toISOString();
  const toTs = new Date(Date.parse(`${period.to}T23:59:59Z`) + 86400000).toISOString();
  const day = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  const { data } = await ctx.supabase
    .from("orders")
    .select(
      "id, status, city, confirmed_at, created_at, subtotal_cents, discount_cents, shipping_fee_cents, items:order_items(variant_id, product_name, variant_title, sku, quantity, unit_price_cents, unit_cost_cents), shipments(status, shipping_cost_cents)"
    )
    .eq("organization_id", ctx.organizationId)
    .gte("created_at", fromTs)
    .lte("created_at", toTs)
    .order("created_at")
    .limit(maxOrders)
    .overrideTypes<
      {
        id: string; status: string; city: string; confirmed_at: string | null; created_at: string;
        subtotal_cents: number; discount_cents: number; shipping_fee_cents: number;
        items: { variant_id: string; product_name: string; variant_title: string; sku: string; quantity: number; unit_price_cents: number; unit_cost_cents: number | null }[];
        shipments: { status: string; shipping_cost_cents: number }[] | { status: string; shipping_cost_cents: number } | null;
      }[],
      { merge: false }
    >();
  const rows = (data ?? []).filter((o) => {
    const d = day(o.created_at);
    return d >= period.from && d <= period.to;
  });
  return {
    truncated: (data?.length ?? 0) >= maxOrders,
    orders: rows.map((o) => {
      const shipments = Array.isArray(o.shipments) ? o.shipments : o.shipments ? [o.shipments] : [];
      return {
        id: o.id,
        status: o.status,
        confirmed: o.confirmed_at !== null,
        city: o.city ?? "",
        subtotalCents: o.subtotal_cents,
        discountCents: o.discount_cents,
        shippingFeeCents: o.shipping_fee_cents,
        // The carrier is paid for every parcel that went out, cancelled ones excepted.
        carrierCostCents: shipments.filter((s) => s.status !== "cancelled").reduce((sum, s) => sum + (s.shipping_cost_cents ?? 0), 0),
        items: (o.items ?? []).map((i) => ({
          variantId: i.variant_id,
          productName: i.product_name,
          variantTitle: i.variant_title,
          sku: i.sku,
          quantity: i.quantity,
          unitPriceCents: i.unit_price_cents,
          unitCostCents: i.unit_cost_cents
        }))
      };
    })
  };
}

export async function getPeriodReport(ctx: Ctx, period: ReportPeriod, today: string): Promise<PeriodReport> {
  const previous = previousPeriod(period);
  const { supabase, organizationId } = ctx;
  const [{ orders, truncated }, summary, previousSummary, campaigns, { data: stockRows }] = await Promise.all([
    loadOrders(ctx, period),
    getReport(supabase, organizationId, period.from, period.to),
    getReport(supabase, organizationId, previous.from, previous.to),
    getCampaignReport(supabase, organizationId, period.from, period.to),
    supabase.rpc("stock_health", { p_organization_id: organizationId })
  ]);
  const stockList = (stockRows ?? []).map((r) => ({
    variantId: r.variant_id,
    productName: r.product_name,
    variantTitle: r.variant_title,
    sku: r.sku,
    info: { onHand: r.on_hand, valueCents: r.value_cents, lastOutboundAt: r.last_outbound_at, firstReceiptAt: r.first_receipt_at } satisfies StockInfo
  }));
  const stock = new Map(stockList.map((s) => [s.variantId, s.info]));
  const days = Math.max(1, elapsedDays(period, today));
  const sold = new Set(orders.flatMap((o) => o.items.map((i) => i.variantId)));
  return {
    period,
    previous,
    summary,
    previousSummary,
    products: performance(orders, stock, { by: "product", days }),
    variants: performance(orders, stock, { by: "variant", days }),
    cities: cities(orders),
    campaigns,
    sleeping: idleStock(stockList, sold),
    truncated
  };
}


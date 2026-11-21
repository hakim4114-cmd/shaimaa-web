// Product, city and stock performance for a period, computed from the orders
// created in it. Pure functions: the loader in lib/data/reports.ts feeds them.
//
// Definitions (docs/BUSINESS_RULES.md, "Product performance"):
// - placed: orders created in the period that contain the product;
// - confirmed: of those, confirmed at some point;
// - delivered: status delivered, returned or exchange requested (the parcel reached the customer);
// - refused: the customer refused the parcel;
// - delivery rate = delivered ÷ (delivered + refused), outcomes only;
// - revenue = delivered lines after their share of the order discount, plus their share of the delivery fee the customer paid;
// - costs = unit cost of delivered pieces + share of the carrier cost of delivered and refused parcels;
// - ad cost = each campaign's spend for the period shared over the orders it brought, then over
//   their lines by value (orders without a campaign carry no ad cost: link campaigns to orders);
// - profit = revenue − costs − ad cost. The verdict is judged on this profit, after ads.

export type ReportOrder = {
  id: string;
  status: string;
  confirmed: boolean;
  city: string;
  subtotalCents: number;
  discountCents: number;
  shippingFeeCents: number;
  carrierCostCents: number;
  campaignId?: string | null;
  items: { variantId: string; productName: string; variantTitle: string; sku: string; quantity: number; unitPriceCents: number; unitCostCents: number | null }[];
};

export type StockInfo = { onHand: number; valueCents: number | null; lastOutboundAt: string | null; firstReceiptAt: string | null };

export type Verdict = "winning" | "watch" | "losing" | "early" | "sleeping";

export type PerformanceRow = {
  key: string;
  productName: string;
  variantTitle: string;
  sku: string;
  ordersPlaced: number;
  ordersConfirmed: number;
  ordersDelivered: number;
  ordersRefused: number;
  ordersCancelled: number;
  unitsOrdered: number;
  unitsDelivered: number;
  revenueCents: number;
  costCents: number;
  adCostCents: number;
  profitCents: number;
  costMissing: boolean;
  confirmationRate: number | null;
  deliveryRate: number | null;
  margin: number | null;
  onHand: number;
  stockValueCents: number | null;
  idleDays: number | null;
  daysOfCover: number | null;
  verdict: Verdict;
};

export type CityRow = { city: string; orders: number; confirmed: number; delivered: number; refused: number; deliveryRate: number | null };

/** Fewer placed orders than this: too early to judge a product. */
export const minOrdersToJudge = 20;
/** No sale for this many days while in stock: sleeping. */
export const sleepingDays = 30;

const deliveredStatuses = new Set(["delivered", "returned", "exchange_requested"]);

type Acc = Omit<PerformanceRow, "confirmationRate" | "deliveryRate" | "margin" | "onHand" | "stockValueCents" | "idleDays" | "daysOfCover" | "verdict"> & {
  orders: Set<string>;
  confirmed: Set<string>;
  delivered: Set<string>;
  refused: Set<string>;
  cancelled: Set<string>;
};

function share(part: number, whole: number, amount: number): number {
  return whole > 0 ? (amount * part) / whole : 0;
}

export function verdictFor(row: Pick<PerformanceRow, "ordersPlaced" | "profitCents" | "deliveryRate" | "margin" | "unitsDelivered" | "onHand" | "idleDays">): Verdict {
  if (row.onHand > 0 && row.unitsDelivered === 0 && (row.idleDays ?? 0) >= sleepingDays) return "sleeping";
  if (row.ordersPlaced < minOrdersToJudge) return "early";
  if (row.profitCents <= 0 || (row.deliveryRate !== null && row.deliveryRate < 0.5)) return "losing";
  if ((row.deliveryRate ?? 0) >= 0.65 && (row.margin ?? 0) >= 0.25) return "winning";
  return "watch";
}

function idle(stock: StockInfo | undefined, now: number): number | null {
  const ref = stock?.lastOutboundAt ?? stock?.firstReceiptAt ?? null;
  return ref ? Math.max(0, Math.floor((now - Date.parse(ref)) / 86400000)) : null;
}

/**
 * Rows per variant (`by: "variant"`) or per product (`by: "product"`).
 * `days` is the number of days lived in the period, for the days of stock left.
 */
export function performance(
  orders: ReportOrder[],
  stock: Map<string, StockInfo>,
  options: { by: "variant" | "product"; days: number; now?: number; adSpendByCampaign?: Map<string, number> }
): PerformanceRow[] {
  const now = options.now ?? Date.now();
  // Ad cost per order: a campaign's spend shared over the orders it brought in the period.
  const ordersPerCampaign = new Map<string, number>();
  for (const order of orders) if (order.campaignId) ordersPerCampaign.set(order.campaignId, (ordersPerCampaign.get(order.campaignId) ?? 0) + 1);
  const adPerOrder = (order: ReportOrder) => {
    if (!order.campaignId || !options.adSpendByCampaign) return 0;
    const spend = options.adSpendByCampaign.get(order.campaignId) ?? 0;
    const count = ordersPerCampaign.get(order.campaignId) ?? 0;
    return count > 0 ? spend / count : 0;
  };
  const rows = new Map<string, Acc>();
  const variantsOf = new Map<string, Set<string>>();

  for (const order of orders) {
    const delivered = deliveredStatuses.has(order.status);
    const refused = order.status === "refused";
    const cancelled = order.status === "cancelled";
    for (const item of order.items) {
      const key = options.by === "variant" ? item.variantId : item.productName;
      let acc = rows.get(key);
      if (!acc) {
        acc = {
          key,
          productName: item.productName,
          variantTitle: options.by === "variant" ? item.variantTitle : "",
          sku: options.by === "variant" ? item.sku : "",
          ordersPlaced: 0, ordersConfirmed: 0, ordersDelivered: 0, ordersRefused: 0, ordersCancelled: 0,
          unitsOrdered: 0, unitsDelivered: 0, revenueCents: 0, costCents: 0, adCostCents: 0, profitCents: 0, costMissing: false,
          orders: new Set(), confirmed: new Set(), delivered: new Set(), refused: new Set(), cancelled: new Set()
        };
        rows.set(key, acc);
      }
      if (!variantsOf.has(key)) variantsOf.set(key, new Set());
      variantsOf.get(key)!.add(item.variantId);

      const line = item.quantity * item.unitPriceCents;
      acc.orders.add(order.id);
      if (order.confirmed) acc.confirmed.add(order.id);
      if (cancelled) acc.cancelled.add(order.id);
      acc.unitsOrdered += item.quantity;
      if (delivered) {
        acc.delivered.add(order.id);
        acc.unitsDelivered += item.quantity;
        acc.revenueCents += line - share(line, order.subtotalCents, order.discountCents) + share(line, order.subtotalCents, order.shippingFeeCents);
        if (item.unitCostCents === null) acc.costMissing = true;
        else acc.costCents += item.quantity * item.unitCostCents;
      }
      if (refused) acc.refused.add(order.id);
      if (delivered || refused) acc.costCents += share(line, order.subtotalCents, order.carrierCostCents);
      acc.adCostCents += share(line, order.subtotalCents, adPerOrder(order));
    }
  }

  const result: PerformanceRow[] = [];
  for (const acc of rows.values()) {
    const { orders: o, confirmed, delivered, refused, cancelled, ...rest } = acc;
    const placed = o.size;
    const outcomes = delivered.size + refused.size;
    const revenue = Math.round(rest.revenueCents);
    const cost = Math.round(rest.costCents);
    const ads = Math.round(rest.adCostCents);
    const profit = revenue - cost - ads;
    let onHand = 0;
    let value: number | null = 0;
    let idleDays: number | null = null;
    for (const variantId of variantsOf.get(acc.key) ?? []) {
      const s = stock.get(variantId);
      if (!s) continue;
      onHand += s.onHand;
      value = value === null || s.valueCents === null ? null : value + s.valueCents;
      const d = idle(s, now);
      if (d !== null) idleDays = idleDays === null ? d : Math.min(idleDays, d);
    }
    const perDay = options.days > 0 ? rest.unitsDelivered / options.days : 0;
    const row: PerformanceRow = {
      ...rest,
      revenueCents: revenue,
      costCents: cost,
      adCostCents: ads,
      profitCents: profit,
      ordersPlaced: placed,
      ordersConfirmed: confirmed.size,
      ordersDelivered: delivered.size,
      ordersRefused: refused.size,
      ordersCancelled: cancelled.size,
      confirmationRate: placed ? confirmed.size / placed : null,
      deliveryRate: outcomes ? delivered.size / outcomes : null,
      margin: revenue > 0 ? profit / revenue : null,
      onHand,
      stockValueCents: value,
      idleDays,
      daysOfCover: perDay > 0 ? Math.round(onHand / perDay) : null,
      verdict: "early"
    };
    row.verdict = verdictFor(row);
    result.push(row);
  }
  return result.sort((a, b) => b.ordersPlaced - a.ordersPlaced || b.profitCents - a.profitCents);
}

/** Stock with no order at all in the period: sleeping when idle long enough. */
export function idleStock(
  stock: { variantId: string; productName: string; variantTitle: string; sku: string; info: StockInfo }[],
  sold: Set<string>,
  now: number = Date.now()
): { variantId: string; label: string; onHand: number; valueCents: number | null; idleDays: number | null }[] {
  return stock
    .filter((s) => !sold.has(s.variantId) && s.info.onHand > 0)
    .map((s) => ({
      variantId: s.variantId,
      label: `${s.productName}${s.variantTitle ? ` — ${s.variantTitle}` : ""}`,
      onHand: s.info.onHand,
      valueCents: s.info.valueCents,
      idleDays: idle(s.info, now)
    }))
    .filter((s) => (s.idleDays ?? 0) >= sleepingDays)
    .sort((a, b) => (b.valueCents ?? 0) - (a.valueCents ?? 0));
}

export function cities(orders: ReportOrder[]): CityRow[] {
  const map = new Map<string, CityRow>();
  for (const order of orders) {
    const city = order.city.trim() || "—";
    const row = map.get(city) ?? { city, orders: 0, confirmed: 0, delivered: 0, refused: 0, deliveryRate: null };
    row.orders += 1;
    if (order.confirmed) row.confirmed += 1;
    if (deliveredStatuses.has(order.status)) row.delivered += 1;
    if (order.status === "refused") row.refused += 1;
    map.set(city, row);
  }
  return [...map.values()]
    .map((r) => ({ ...r, deliveryRate: r.delivered + r.refused ? r.delivered / (r.delivered + r.refused) : null }))
    .sort((a, b) => b.orders - a.orders);
}

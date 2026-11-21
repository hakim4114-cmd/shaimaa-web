import { describe, expect, it } from "vitest";
import { elapsedDays, parseHalf, parseMonth, previousPeriod, reportPeriod } from "@/lib/reports/periods";
import { cities, idleStock, performance, verdictFor, type ReportOrder, type StockInfo } from "@/lib/reports/products";

describe("report periods", () => {
  it("covers a month or one of its halves", () => {
    expect(reportPeriod("2027-02", "all")).toMatchObject({ from: "2027-02-01", to: "2027-02-28", days: 28 });
    expect(reportPeriod("2027-02", "1")).toMatchObject({ from: "2027-02-01", to: "2027-02-15", days: 15 });
    expect(reportPeriod("2027-01", "2")).toMatchObject({ from: "2027-01-16", to: "2027-01-31", days: 16 });
  });
  it("finds the period just before", () => {
    expect(previousPeriod(reportPeriod("2027-03", "2"))).toMatchObject({ from: "2027-03-01", to: "2027-03-15" });
    expect(previousPeriod(reportPeriod("2027-03", "1"))).toMatchObject({ from: "2027-02-16", to: "2027-02-28" });
    expect(previousPeriod(reportPeriod("2027-01", "all"))).toMatchObject({ from: "2026-12-01", to: "2026-12-31" });
  });
  it("counts only the days already lived", () => {
    const p = reportPeriod("2026-11", "all");
    expect(elapsedDays(p, "2026-11-10")).toBe(10);
    expect(elapsedDays(p, "2026-12-05")).toBe(30);
    expect(elapsedDays(p, "2026-10-31")).toBe(0);
  });
  it("parses inputs safely", () => {
    expect(parseHalf("2")).toBe("2");
    expect(parseHalf("x")).toBe("all");
    expect(parseMonth("2026-13", "2026-11-21")).toBe("2026-11");
    expect(parseMonth("2026-09", "2026-11-21")).toBe("2026-09");
  });
});

const item = (variantId: string, quantity = 1, price = 19900, cost: number | null = 8000) => ({
  variantId, productName: variantId.startsWith("shirt") ? "Shirt" : "Belt", variantTitle: variantId.split("-")[1] ?? "", sku: variantId.toUpperCase(), quantity, unitPriceCents: price, unitCostCents: cost
});
function order(id: string, status: string, items: ReportOrder["items"], extra: Partial<ReportOrder> = {}): ReportOrder {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPriceCents, 0);
  return { id, status, confirmed: status !== "new" && status !== "cancelled", city: "Kénitra", subtotalCents: subtotal, discountCents: 0, shippingFeeCents: 0, carrierCostCents: 1900, items, ...extra };
}

describe("product performance", () => {
  const now = Date.parse("2026-11-21T12:00:00Z");

  it("counts orders, outcomes, revenue, costs and profit", () => {
    const orders = [
      order("o1", "delivered", [item("shirt-M")]),
      order("o2", "refused", [item("shirt-M")]),
      order("o3", "new", [item("shirt-L")]),
      order("o4", "cancelled", [item("shirt-M")])
    ];
    const [row] = performance(orders, new Map(), { by: "product", days: 10, now });
    expect(row).toMatchObject({ productName: "Shirt", ordersPlaced: 4, ordersConfirmed: 2, ordersDelivered: 1, ordersRefused: 1, ordersCancelled: 1, unitsOrdered: 4, unitsDelivered: 1 });
    expect(row!.revenueCents).toBe(19900);
    // cost of the delivered piece + carrier cost of the delivered and the refused parcel
    expect(row!.costCents).toBe(8000 + 1900 + 1900);
    expect(row!.profitCents).toBe(19900 - 11800);
    expect(row!.deliveryRate).toBe(0.5);
    expect(row!.confirmationRate).toBe(0.5);
  });

  it("splits a pack order's discount, delivery fee and carrier cost by line value", () => {
    const pack = order("p1", "delivered", [item("shirt-M", 1, 20000, 8000), item("belt-black", 1, 10000, 3000)], { discountCents: 3000, shippingFeeCents: 3000, carrierCostCents: 2100 });
    const rows = performance([pack], new Map(), { by: "product", days: 1, now });
    const shirt = rows.find((r) => r.productName === "Shirt")!;
    const belt = rows.find((r) => r.productName === "Belt")!;
    expect(shirt.revenueCents).toBe(20000 - 2000 + 2000);
    expect(belt.revenueCents).toBe(10000 - 1000 + 1000);
    expect(shirt.costCents + belt.costCents).toBe(8000 + 3000 + 2100);
  });

  it("judges profit after the campaign's ad spend", () => {
    // 250 MAD, cost 150, carrier 19: 81 profit before ads. 10 orders from one campaign that spent 900 → 90 per order.
    const orders = Array.from({ length: 10 }, (_, i) => order(`a${i}`, "delivered", [item("shirt-M", 1, 25000, 15000)], { campaignId: "c1" }));
    const [row] = performance(orders, new Map(), { by: "product", days: 10, now, adSpendByCampaign: new Map([["c1", 90000]]) });
    expect(row!.adCostCents).toBe(90000);
    expect(row!.profitCents).toBe(10 * (25000 - 15000 - 1900) - 90000);
    expect(row!.profitCents).toBeLessThan(0);
  });

  it("flags unknown costs instead of counting them as zero silently", () => {
    const [row] = performance([order("o1", "delivered", [item("shirt-M", 1, 19900, null)])], new Map(), { by: "variant", days: 1, now });
    expect(row!.costMissing).toBe(true);
  });

  it("adds stock, days without sale and days of stock left", () => {
    const stock = new Map<string, StockInfo>([["shirt-M", { onHand: 20, valueCents: 160000, lastOutboundAt: "2026-11-19T10:00:00Z", firstReceiptAt: "2026-11-01T10:00:00Z" }]]);
    const orders = Array.from({ length: 10 }, (_, i) => order(`o${i}`, "delivered", [item("shirt-M")]));
    const [row] = performance(orders, stock, { by: "variant", days: 10, now });
    expect(row).toMatchObject({ onHand: 20, stockValueCents: 160000, idleDays: 2, daysOfCover: 20 });
  });

  it("judges only with enough orders", () => {
    const base = { unitsDelivered: 5, onHand: 0, idleDays: null };
    expect(verdictFor({ ...base, ordersPlaced: 5, profitCents: 100000, deliveryRate: 0.9, margin: 0.5 })).toBe("early");
    expect(verdictFor({ ...base, ordersPlaced: 30, profitCents: 100000, deliveryRate: 0.8, margin: 0.4 })).toBe("winning");
    expect(verdictFor({ ...base, ordersPlaced: 30, profitCents: 100000, deliveryRate: 0.6, margin: 0.2 })).toBe("watch");
    expect(verdictFor({ ...base, ordersPlaced: 30, profitCents: -500, deliveryRate: 0.8, margin: -0.1 })).toBe("losing");
    expect(verdictFor({ ...base, ordersPlaced: 30, profitCents: 100000, deliveryRate: 0.4, margin: 0.4 })).toBe("losing");
    expect(verdictFor({ ordersPlaced: 0, unitsDelivered: 0, onHand: 12, idleDays: 45, profitCents: 0, deliveryRate: null, margin: null })).toBe("sleeping");
  });

  it("lists stock not sold for 30 days or more", () => {
    const list = idleStock(
      [
        { variantId: "a", productName: "Coat", variantTitle: "L", sku: "C-L", info: { onHand: 5, valueCents: 50000, lastOutboundAt: null, firstReceiptAt: "2026-09-01T10:00:00Z" } },
        { variantId: "b", productName: "Shirt", variantTitle: "M", sku: "S-M", info: { onHand: 5, valueCents: 20000, lastOutboundAt: "2026-11-20T10:00:00Z", firstReceiptAt: null } }
      ],
      new Set(),
      now
    );
    expect(list.map((s) => s.variantId)).toEqual(["a"]);
  });

  it("summarises cities by outcome", () => {
    const rows = cities([order("o1", "delivered", [item("shirt-M")]), order("o2", "refused", [item("shirt-M")], { city: "Agadir" }), order("o3", "refused", [item("shirt-M")], { city: "Agadir" })]);
    expect(rows[0]).toMatchObject({ city: "Agadir", orders: 2, refused: 2, deliveryRate: 0 });
  });
});

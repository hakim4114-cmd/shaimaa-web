import "server-only";
import type { PeriodReport } from "@/lib/data/reports";
import type { ExportTable } from "@/lib/export/table";
import { interpolate, type Dictionary } from "@/lib/i18n/dictionaries";
import type { PerformanceRow } from "./products";

/** The period report as the sheets of one Excel workbook. */
export function reportWorkbook(report: PeriodReport, t: Dictionary, rtl: boolean): ExportTable[] {
  const tr = t.reports;
  const s = report.summary;
  const p = report.previousSummary;
  const deliveryRate = (r: typeof s) => (r && r.ordersDelivered + r.ordersRefused ? r.ordersDelivered / (r.ordersDelivered + r.ordersRefused) : null);
  const subtitle = `${report.period.from} → ${report.period.to}`;

  const summary: ExportTable = {
    title: tr.sheetSummary,
    subtitle,
    rtl,
    columns: [
      { key: "metric", header: tr.metric, type: "text", width: 30 },
      { key: "current", header: `${tr.current} (${report.period.from} → ${report.period.to})`, type: "text", width: 26 },
      { key: "previous", header: `${tr.previous} (${report.previous.from} → ${report.previous.to})`, type: "text", width: 26 }
    ],
    rows: [
      [tr.ordersCreated, s?.ordersCreated, p?.ordersCreated, "int"],
      [tr.confirmationRate, s?.confirmationRate, p?.confirmationRate, "pct"],
      [tr.deliveryRate, deliveryRate(s), deliveryRate(p), "pct"],
      [tr.netRevenue, s?.netRevenueCents, p?.netRevenueCents, "money"],
      [tr.advertising, s?.advertisingCents, p?.advertisingCents, "money"],
      [tr.netProfit, s?.netProfitCents, p?.netProfitCents, "money"]
    ].map(([metric, current, previous, kind]) => {
      const fmt = (v: unknown) => (v === null || v === undefined ? "—" : kind === "pct" ? `${Math.round(Number(v) * 100)}%` : kind === "money" ? (Number(v) / 100).toFixed(2) : String(v));
      return { metric, current: fmt(current), previous: fmt(previous) };
    })
  };

  const performanceColumns = (withVariant: boolean): ExportTable["columns"] => [
    { key: "product", header: tr.colProduct, type: "text", width: 26 },
    ...(withVariant
      ? ([
          { key: "variant", header: tr.colVariant, type: "text", width: 16 },
          { key: "sku", header: tr.colSku, type: "text", width: 14 }
        ] as ExportTable["columns"])
      : []),
    { key: "orders", header: tr.colOrders, type: "int" },
    { key: "confirmed", header: tr.colConfirmed, type: "int" },
    { key: "delivered", header: tr.colDelivered, type: "int" },
    { key: "refused", header: tr.colRefused, type: "int" },
    { key: "cancelled", header: tr.colCancelled, type: "int" },
    { key: "units", header: tr.colUnitsDelivered, type: "int" },
    { key: "confRate", header: tr.colConfRate, type: "percent" },
    { key: "delivRate", header: tr.colDelivRate, type: "percent" },
    { key: "revenue", header: tr.colRevenue, type: "money" },
    { key: "cost", header: tr.colCost, type: "money" },
    { key: "ads", header: tr.colAds, type: "money" },
    { key: "profit", header: tr.colProfit, type: "money" },
    { key: "margin", header: tr.colMargin, type: "percent" },
    { key: "stock", header: tr.colStock, type: "int" },
    { key: "stockValue", header: tr.colStockValue, type: "money" },
    { key: "idle", header: tr.colIdle, type: "int" },
    { key: "cover", header: tr.colCover, type: "int" },
    { key: "verdict", header: tr.colVerdict, type: "text", width: 16 }
  ];
  const performanceRow = (r: PerformanceRow) => ({
    product: r.productName,
    variant: r.variantTitle,
    sku: r.sku,
    orders: r.ordersPlaced,
    confirmed: r.ordersConfirmed,
    delivered: r.ordersDelivered,
    refused: r.ordersRefused,
    cancelled: r.ordersCancelled,
    units: r.unitsDelivered,
    confRate: r.confirmationRate,
    delivRate: r.deliveryRate,
    revenue: r.revenueCents,
    cost: r.costCents,
    ads: r.adCostCents,
    profit: r.profitCents,
    margin: r.margin,
    stock: r.onHand,
    stockValue: r.stockValueCents,
    idle: r.idleDays,
    cover: r.daysOfCover,
    verdict: `${tr.verdicts[r.verdict]}${r.costMissing ? " *" : ""}`
  });

  return [
    summary,
    { title: tr.sheetProducts, subtitle, rtl, columns: performanceColumns(false), rows: report.products.map(performanceRow) },
    { title: tr.sheetVariants, subtitle, rtl, columns: performanceColumns(true), rows: report.variants.map(performanceRow) },
    {
      title: tr.sheetCities,
      subtitle,
      rtl,
      columns: [
        { key: "city", header: tr.colCity, type: "text", width: 22 },
        { key: "orders", header: tr.colOrders, type: "int" },
        { key: "confirmed", header: tr.colConfirmed, type: "int" },
        { key: "delivered", header: tr.colDelivered, type: "int" },
        { key: "refused", header: tr.colRefused, type: "int" },
        { key: "rate", header: tr.colDelivRate, type: "percent" }
      ],
      rows: report.cities.map((c) => ({ city: c.city, orders: c.orders, confirmed: c.confirmed, delivered: c.delivered, refused: c.refused, rate: c.deliveryRate }))
    },
    {
      title: tr.sheetCampaigns,
      subtitle,
      rtl,
      columns: [
        { key: "name", header: tr.colCampaign, type: "text", width: 26 },
        { key: "spend", header: tr.colSpend, type: "money" },
        { key: "orders", header: tr.colOrders, type: "int" },
        { key: "confirmed", header: tr.colConfirmed, type: "int" },
        { key: "delivered", header: tr.colDelivered, type: "int" },
        { key: "refused", header: tr.colRefused, type: "int" },
        { key: "revenue", header: tr.colRevenue, type: "money" }
      ],
      rows: report.campaigns.map((c) => ({ name: c.name ?? tr.noCampaign, spend: c.spendCents, orders: c.orders, confirmed: c.confirmed, delivered: c.delivered, refused: c.refused, revenue: c.deliveredRevenueCents }))
    },
    {
      title: tr.sheetViolations,
      subtitle,
      rtl,
      columns: [
        { key: "date", header: tr.colDate, type: "date", width: 12 },
        { key: "kind", header: tr.colKind, type: "text", width: 34 },
        { key: "amount", header: tr.colAmount, type: "money" },
        { key: "reason", header: tr.colReason, type: "text", width: 40 }
      ],
      rows: report.violations.map((v) => ({
        date: v.date,
        kind: v.kind === "withdrawal" ? tr.withdrawalOver : `${t.money.categories[v.category as keyof typeof t.money.categories] ?? v.category} — ${v.flags.map((f) => t.pay.guard.flags[f as keyof typeof t.pay.guard.flags] ?? f).join(", ")}`,
        amount: v.amountCents,
        reason: v.reason
      }))
    },
    {
      title: tr.sheetSleeping,
      subtitle: interpolate(tr.sleepingDescription, { days: 30 }),
      rtl,
      columns: [
        { key: "label", header: tr.colProduct, type: "text", width: 30 },
        { key: "stock", header: tr.colStock, type: "int" },
        { key: "value", header: tr.colValue, type: "money" },
        { key: "idle", header: tr.colIdle, type: "int" }
      ],
      rows: report.sleeping.map((s) => ({ label: s.label, stock: s.onHand, value: s.valueCents, idle: s.idleDays }))
    }
  ];
}

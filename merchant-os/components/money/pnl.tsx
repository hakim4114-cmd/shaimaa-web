import type { Report } from "@/lib/data/money";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Profit and loss for a range, straight from report_summary. */
export function ProfitAndLoss({ report, t, locale }: { report: Report; t: Dictionary; locale: Locale }) {
  const tm = t.money;
  const rows: { label: string; cents: number; sign?: "-" | "="; strong?: boolean }[] = [
    { label: tm.pnl.revenue, cents: report.deliveredRevenueCents },
    { label: tm.pnl.refunds, cents: report.refundsCents, sign: "-" },
    { label: tm.pnl.cogs, cents: report.cogsCents, sign: "-" },
    { label: tm.pnl.shipping, cents: report.shippingCostCents, sign: "-" },
    { label: tm.pnl.opex, cents: report.operatingExpensesCents, sign: "-" },
    { label: tm.pnl.netProfit, cents: report.netProfitCents, sign: "=", strong: true }
  ];
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid gap-1.5 text-sm">
        {rows.map((row) => (
          <div key={row.label} className={cn("flex justify-between gap-4", row.strong && "mt-1 border-t border-border pt-2 text-base font-semibold")}>
            <dt className={row.strong ? undefined : "text-muted-foreground"}>
              {row.sign === "-" ? "− " : ""}
              {row.label}
            </dt>
            <dd className={cn("tabular", row.strong && (row.cents < 0 ? "text-danger" : "text-success"))}>{formatMoney(row.cents, locale)}</dd>
          </div>
        ))}
      </dl>
      {report.costMissingLines > 0 ? <p className="text-xs text-warning">{tm.pnl.costMissing.replace("{count}", String(report.costMissingLines))}</p> : null}
      <p className="text-xs text-muted-foreground">{tm.pnl.note}</p>
    </div>
  );
}

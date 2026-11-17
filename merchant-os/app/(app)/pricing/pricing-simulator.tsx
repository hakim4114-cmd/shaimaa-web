"use client";

import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import type { PricingDefaults } from "@/lib/data/pricing";
import type { SellableVariant } from "@/lib/data/orders";
import { useI18n } from "@/lib/i18n/provider";
import { listPriceFor, sensitivity, simulate, type DiscountType } from "@/lib/pricing/simulate";
import { cn } from "@/lib/utils";

type VariantWithCost = SellableVariant & { costCents: number | null };

const num = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const fmt = (v: number) => (Math.round(v * 100) / 100).toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 1000) / 10}%`);

export function PricingSimulator({ variants, defaults }: { variants: VariantWithCost[]; defaults: PricingDefaults }) {
  const { t } = useI18n();
  const tp = t.pricing;
  const id = useId();
  const first = variants[0];
  const [variantId, setVariantId] = useState(first?.id ?? "");
  const [price, setPrice] = useState(first ? String(first.priceCents / 100) : "");
  const [cost, setCost] = useState(first?.costCents != null ? String(first.costCents / 100) : "");
  const [discountType, setDiscountType] = useState<DiscountType>("none");
  const [discountValue, setDiscountValue] = useState("");
  const [shipping, setShipping] = useState(String(Math.round(defaults.shippingCharged.value)));
  const [carrier, setCarrier] = useState(String(Math.round(defaults.carrierFee.value * 100) / 100));
  const [returnFee, setReturnFee] = useState("0");
  const [packaging, setPackaging] = useState(String(Math.round(defaults.packaging.value * 100) / 100));
  const [ads, setAds] = useState(String(Math.round(defaults.adCostPerOrder.value * 100) / 100));
  const [confirm, setConfirm] = useState(String(Math.round(defaults.confirmationRate.value * 100)));
  const [deliver, setDeliver] = useState(String(Math.round(defaults.deliveryRate.value * 100)));
  const [target, setTarget] = useState("25");

  const input = {
    price: num(price),
    discountType,
    discountValue: num(discountValue),
    shippingCharged: num(shipping),
    unitCost: num(cost),
    carrierFee: num(carrier),
    returnFee: num(returnFee),
    packaging: num(packaging),
    adCostPerOrder: num(ads),
    confirmationRate: num(confirm) / 100,
    deliveryRate: num(deliver) / 100,
    targetMargin: num(target) / 100
  };
  const r = simulate(input);
  // 25 small calculations: cheap enough to redo on every keystroke.
  const gridPrices = [0.8, 0.9, 1, 1.1, 1.2].map((f) => Math.round((r.effectivePrice || 100) * f));
  const gridRates = [0.5, 0.6, 0.7, 0.8, 0.9];
  const grid = { prices: gridPrices, rates: gridRates, rows: sensitivity(input, gridPrices, gridRates) };

  const source = (a: { source: "data" | "estimate"; sample?: number }) => (
    <Badge tone={a.source === "data" ? "success" : "warning"}>{a.source === "data" ? `${tp.fromData} (${a.sample})` : tp.estimate}</Badge>
  );
  const field = (label: string, value: string, set: (v: string) => void, extra?: React.ReactNode, suffix = "MAD") => (
    <Field label={label} htmlFor={`${id}-${label}`}>
      <div className="flex items-center gap-2">
        <Input id={`${id}-${label}`} dir="ltr" inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} />
        <span className="w-10 shrink-0 text-xs text-muted-foreground">{suffix}</span>
      </div>
      {extra ? <div className="mt-1">{extra}</div> : null}
    </Field>
  );
  const tone = r.status === "profit" ? "text-success" : r.status === "loss" ? "text-danger" : "text-warning";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader title={tp.inputs} description={tp.inputsHint} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label={tp.product} htmlFor={`${id}-variant`}>
              <NativeSelect
                id={`${id}-variant`}
                value={variantId}
                onChange={(e) => {
                  const v = variants.find((x) => x.id === e.target.value);
                  setVariantId(e.target.value);
                  if (v) {
                    setPrice(String(v.priceCents / 100));
                    setCost(v.costCents != null ? String(v.costCents / 100) : "");
                  }
                }}
              >
                <option value="">{tp.custom}</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          {field(tp.price, price, setPrice)}
          {field(tp.cost, cost, setCost, cost.trim() === "" ? <span className="text-xs text-danger">{tp.costMissing}</span> : null)}
          <Field label={tp.discount} htmlFor={`${id}-dtype`}>
            <div className="flex gap-2">
              <NativeSelect id={`${id}-dtype`} value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)} className="w-32 shrink-0">
                <option value="none">{tp.discountNone}</option>
                <option value="percent">%</option>
                <option value="fixed">MAD</option>
              </NativeSelect>
              <Input dir="ltr" inputMode="decimal" disabled={discountType === "none"} value={discountValue} placeholder="0" onChange={(e) => setDiscountValue(e.target.value)} aria-label={tp.discount} />
            </div>
          </Field>
          {field(tp.shippingCharged, shipping, setShipping, source(defaults.shippingCharged))}
          {field(tp.carrierFee, carrier, setCarrier, source(defaults.carrierFee))}
          {field(tp.returnFee, returnFee, setReturnFee, <span className="text-xs text-muted-foreground">{tp.returnFeeHint}</span>)}
          {field(tp.packaging, packaging, setPackaging, source(defaults.packaging))}
          {field(tp.adCost, ads, setAds, source(defaults.adCostPerOrder))}
          {field(tp.confirmationRate, confirm, setConfirm, source(defaults.confirmationRate), "%")}
          {field(tp.deliveryRate, deliver, setDeliver, source(defaults.deliveryRate), "%")}
          {field(tp.targetMargin, target, setTarget, undefined, "%")}
        </CardBody>
      </Card>

      <div className="flex min-w-0 flex-col gap-6">
        <Card className={cn("border-2", r.status === "profit" ? "border-success/40" : r.status === "loss" ? "border-danger/40" : "border-warning/40")}>
          <CardHeader title={tp.results} description={tp.status[r.status]} />
          <CardBody className="grid gap-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-surface-muted p-3">
                <p className="text-xs text-muted-foreground">{tp.profitPerDelivered}</p>
                <p className={cn("tabular text-2xl font-bold", tone)} dir="ltr">{r.profitPerDelivered === null ? "—" : `${fmt(r.profitPerDelivered)} MAD`}</p>
                <p className="text-xs text-muted-foreground">
                  {tp.margin}: <span dir="ltr">{pct(r.margin)}</span>
                </p>
              </div>
              <div className="rounded-md bg-surface-muted p-3">
                <p className="text-xs text-muted-foreground">{tp.profitPerOrder}</p>
                <p className={cn("tabular text-2xl font-bold", tone)} dir="ltr">{fmt(r.profitPerOrder)} MAD</p>
                <p className="text-xs text-muted-foreground">{tp.profitPerOrderHint}</p>
              </div>
            </div>
            <dl className="grid gap-2">
              {[
                [tp.effectivePrice, `${fmt(r.effectivePrice)} MAD`],
                [tp.breakEvenPrice, r.breakEvenPrice === null ? "—" : `${fmt(r.breakEvenPrice)} MAD`],
                [tp.maxAdCost, `${fmt(r.maxAdCostPerOrder)} MAD`],
                [tp.minDeliveryRate, r.minDeliveryRate === null ? "—" : r.minDeliveryRate > 1 ? tp.impossible : pct(r.minDeliveryRate)],
                [
                  tp.priceForTarget.replace("{margin}", target || "0"),
                  r.priceForTarget === null ? "—" : `${fmt(r.priceForTarget)} MAD${discountType !== "none" ? ` (${tp.listPrice}: ${fmt(listPriceFor(r.priceForTarget, discountType, num(discountValue)))} MAD)` : ""}`
                ]
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-border pb-2 last:border-0">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="tabular text-end font-medium" dir="ltr">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-muted-foreground">
              {tp.perOrderBreakdown
                .replace("{revenue}", fmt(r.perOrder.revenue))
                .replace("{goods}", fmt(r.perOrder.goods))
                .replace("{shipping}", fmt(r.perOrder.shipping))
                .replace("{refusals}", fmt(r.perOrder.refusals))
                .replace("{ads}", fmt(r.perOrder.ads))}
            </p>
          </CardBody>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title={tp.gridTitle} description={tp.gridHint} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="ltr">
              <thead>
                <tr className="bg-surface-muted text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-start">{tp.deliveryShort} / {tp.priceShort}</th>
                  {grid.prices.map((p) => (
                    <th key={p} className="tabular px-3 py-2 text-end">{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.rows.map((row, i) => (
                  <tr key={grid.rates[i]} className="border-t border-border">
                    <td className="tabular px-3 py-2 text-xs text-muted-foreground">{Math.round((grid.rates[i] ?? 0) * 100)}%</td>
                    {row.map((v, j) => (
                      <td key={j} className={cn("tabular px-3 py-2 text-end font-medium", v > 0.5 ? "bg-success-soft text-success" : v < -0.5 ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning")}>
                        {Math.round(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

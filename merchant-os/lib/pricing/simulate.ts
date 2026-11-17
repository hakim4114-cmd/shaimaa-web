// COD pricing model. Everything is per order RECEIVED (a lead), because in
// cash on delivery the ad is paid for every order, refused parcels still
// cost shipping, and only delivered orders bring money. Amounts in MAD.
//
//   confirmed = c            delivered = c·d            refused = c·(1−d)
//   revenue   = c·d·(P' + S)
//   costs     = c·d·C  +  c·(F + K)  +  c·(1−d)·R  +  A
//
// P' price after discount, S shipping charged to the customer, C unit cost,
// F carrier fee per shipped parcel (delivered or refused), K packaging per
// parcel, R extra fee on a refused parcel, A ad cost per order received.
// Refused goods are assumed to come back resellable.

export type DiscountType = "none" | "percent" | "fixed";

export type PricingInput = {
  price: number;
  discountType: DiscountType;
  discountValue: number;
  shippingCharged: number;
  unitCost: number;
  carrierFee: number;
  returnFee: number;
  packaging: number;
  adCostPerOrder: number;
  confirmationRate: number; // 0..1
  deliveryRate: number; // 0..1 of shipped
  targetMargin: number; // 0..1 of the delivered order value
};

export type PricingResult = {
  effectivePrice: number;
  profitPerOrder: number;
  profitPerDelivered: number | null;
  margin: number | null;
  breakEvenPrice: number | null;
  maxAdCostPerOrder: number;
  minDeliveryRate: number | null;
  priceForTarget: number | null;
  status: "profit" | "breakeven" | "loss";
  perOrder: { revenue: number; goods: number; shipping: number; refusals: number; ads: number };
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
const money = (v: number) => Math.round(v * 100) / 100;

export function effectivePrice(price: number, type: DiscountType, value: number): number {
  if (type === "percent") return Math.max(0, price * (1 - clamp01(value / 100)));
  if (type === "fixed") return Math.max(0, price - Math.max(0, value));
  return Math.max(0, price);
}

export function simulate(input: PricingInput): PricingResult {
  const c = clamp01(input.confirmationRate);
  const d = clamp01(input.deliveryRate);
  const P = effectivePrice(input.price, input.discountType, input.discountValue);
  const S = Math.max(0, input.shippingCharged);
  const C = Math.max(0, input.unitCost);
  const FK = Math.max(0, input.carrierFee) + Math.max(0, input.packaging);
  const R = Math.max(0, input.returnFee);
  const A = Math.max(0, input.adCostPerOrder);
  const m = Math.min(0.95, Math.max(0, input.targetMargin));

  const revenue = c * d * (P + S);
  const goods = c * d * C;
  const shipping = c * FK;
  const refusals = c * (1 - d) * R;
  const profitPerOrder = revenue - goods - shipping - refusals - A;
  const delivered = c * d;
  const profitPerDelivered = delivered > 0 ? profitPerOrder / delivered : null;
  const margin = profitPerDelivered !== null && P + S > 0 ? profitPerDelivered / (P + S) : null;

  const breakEvenPrice = delivered > 0 ? (goods + shipping + refusals + A) / delivered - S : null;
  const maxAdCostPerOrder = revenue - goods - shipping - refusals;
  const denom = c * (P + S - C + R);
  const minDeliveryRate = denom > 0 ? (c * (FK + R) + A) / denom : null;
  const priceForTarget = delivered > 0 && m < 1 ? (C + FK / d + ((1 - d) * R) / d + A / delivered) / (1 - m) - S : null;

  const epsilon = 0.005;
  return {
    effectivePrice: money(P),
    profitPerOrder: money(profitPerOrder),
    profitPerDelivered: profitPerDelivered === null ? null : money(profitPerDelivered),
    margin: margin === null ? null : Math.round(margin * 1000) / 1000,
    breakEvenPrice: breakEvenPrice === null ? null : money(Math.max(0, breakEvenPrice)),
    maxAdCostPerOrder: money(maxAdCostPerOrder),
    minDeliveryRate: minDeliveryRate === null ? null : Math.round(minDeliveryRate * 10000) / 10000,
    priceForTarget: priceForTarget === null ? null : money(priceForTarget),
    status: Math.abs(profitPerOrder) < epsilon ? "breakeven" : profitPerOrder > 0 ? "profit" : "loss",
    perOrder: { revenue: money(revenue), goods: money(goods), shipping: money(shipping), refusals: money(refusals), ads: money(A) }
  };
}

/** List price to show before the discount, so the price after discount equals `target`. */
export function listPriceFor(target: number, type: DiscountType, value: number): number {
  if (type === "percent") return value >= 100 ? target : money(target / (1 - value / 100));
  if (type === "fixed") return money(target + Math.max(0, value));
  return money(target);
}

/** Profit per order received for a grid of prices (after discount) and delivery rates. */
export function sensitivity(input: PricingInput, prices: number[], deliveryRates: number[]): number[][] {
  return deliveryRates.map((d) => prices.map((p) => simulate({ ...input, price: p, discountType: "none", discountValue: 0, deliveryRate: d }).profitPerOrder));
}

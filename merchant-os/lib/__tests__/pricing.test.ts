import { describe, expect, it } from "vitest";
import { effectivePrice, listPriceFor, sensitivity, simulate, type PricingInput } from "@/lib/pricing/simulate";

const base: PricingInput = {
  price: 149,
  discountType: "none",
  discountValue: 0,
  shippingCharged: 35,
  unitCost: 55,
  carrierFee: 35,
  returnFee: 0,
  packaging: 5,
  adCostPerOrder: 20,
  confirmationRate: 0.7,
  deliveryRate: 0.75,
  targetMargin: 0.25
};

describe("COD pricing model", () => {
  it("computes profit per order received with refusals and ads", () => {
    const r = simulate(base);
    // revenue 0.525·184 = 96.6 ; goods 0.525·55 = 28.875 ; shipping 0.7·40 = 28 ; ads 20 → 19.725
    expect(r.profitPerOrder).toBeCloseTo(19.72, 1);
    expect(r.profitPerDelivered).toBeCloseTo(37.57, 2);
    expect(r.status).toBe("profit");
  });

  it("break-even price gives zero profit", () => {
    const r = simulate(base);
    expect(r.breakEvenPrice).not.toBeNull();
    const atBreakEven = simulate({ ...base, price: r.breakEvenPrice! });
    expect(Math.abs(atBreakEven.profitPerOrder)).toBeLessThan(0.02);
  });

  it("max ad cost and min delivery rate are the break-even points", () => {
    const r = simulate(base);
    expect(Math.abs(simulate({ ...base, adCostPerOrder: r.maxAdCostPerOrder }).profitPerOrder)).toBeLessThan(0.02);
    expect(Math.abs(simulate({ ...base, deliveryRate: r.minDeliveryRate! }).profitPerOrder)).toBeLessThan(0.02);
  });

  it("price for a target margin reaches that margin", () => {
    const r = simulate(base);
    const at = simulate({ ...base, price: r.priceForTarget! });
    expect(at.margin).toBeCloseTo(0.25, 2);
  });

  it("applies percent and fixed discounts, never below zero", () => {
    expect(effectivePrice(200, "percent", 15)).toBe(170);
    expect(effectivePrice(200, "fixed", 30)).toBe(170);
    expect(effectivePrice(20, "fixed", 30)).toBe(0);
    expect(listPriceFor(170, "percent", 15)).toBe(200);
    expect(simulate({ ...base, discountType: "percent", discountValue: 50 }).status).toBe("loss");
  });

  it("refusal fees lower profit; zero delivery means no break-even price", () => {
    expect(simulate({ ...base, returnFee: 20 }).profitPerOrder).toBeLessThan(simulate(base).profitPerOrder);
    expect(simulate({ ...base, deliveryRate: 0 }).breakEvenPrice).toBeNull();
  });

  it("builds a sensitivity grid rows = delivery rates, columns = prices", () => {
    const grid = sensitivity(base, [120, 149, 180], [0.5, 0.75]);
    expect(grid).toHaveLength(2);
    expect(grid[1]?.[1]).toBe(simulate(base).profitPerOrder);
    expect(grid[0]![0]!).toBeLessThan(grid[1]![2]!);
  });
});

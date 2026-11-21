import { describe, expect, it } from "vitest";
import { readTest, type TestOrder } from "@/lib/reports/tests";

const order = (status: string, price = 20000, cost = 8000): TestOrder => ({
  status, subtotal_cents: price, discount_cents: 0, shipping_fee_cents: 0, items: [{ quantity: 1, unit_cost_cents: cost }]
});

describe("readTest", () => {
  it("keeps running under the cap and under 20 orders", () => {
    expect(readTest({ profit_cents: -20000, loss_cap_cents: 60000, over_cap: false }, [order("delivered")]).state).toBe("running");
  });
  it("is ready to judge at 20 orders, cancelled ones excluded", () => {
    const orders = [...Array.from({ length: 20 }, () => order("delivered")), order("cancelled")];
    const r = readTest({ profit_cents: 10000, loss_cap_cents: 60000, over_cap: false }, orders);
    expect(r.orders).toBe(20);
    expect(r.state).toBe("judge");
  });
  it("says stop past the cap with nothing on the way", () => {
    expect(readTest({ profit_cents: -70000, loss_cap_cents: 60000, over_cap: true }, [order("refused")]).state).toBe("stop");
  });
  it("says wait when pending orders could bring the result back above the cap", () => {
    const r = readTest({ profit_cents: -65000, loss_cap_cents: 60000, over_cap: true }, [order("shipped"), order("confirmed")]);
    expect(r.pending).toBe(2);
    expect(r.pendingUpsideCents).toBe(24000);
    expect(r.state).toBe("wait");
  });
  it("still says stop when even every pending delivery would not be enough", () => {
    expect(readTest({ profit_cents: -90000, loss_cap_cents: 60000, over_cap: true }, [order("shipped")]).state).toBe("stop");
  });
});

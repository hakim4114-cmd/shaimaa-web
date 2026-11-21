import { minOrdersToJudge } from "@/lib/reports/products";

/** Orders confirmed but not delivered or refused yet: their result is still to come. */
export const awaitingStatuses = ["confirmed", "preparing", "ready_to_ship", "shipped"] as const;

export type TestOrder = {
  status: string;
  subtotal_cents: number;
  discount_cents: number;
  shipping_fee_cents: number;
  items: { quantity: number; unit_cost_cents: number | null }[];
  /** Carrier cost already known for its parcel(s); paid whether delivered or refused. */
  carrier_cents?: number;
};

export type TestState = "running" | "wait" | "stop" | "judge";

export type TestRead = {
  orders: number;
  pending: number;
  /** Best case if every pending order is delivered: revenue − cost of its pieces − carrier. */
  pendingUpsideCents: number;
  state: TestState;
};

/**
 * One product test (campaign) ends at whichever comes first: 20 orders, or the loss cap.
 * Ads are counted when paid, revenue only once delivered: with orders still on the way,
 * a result past the cap may come back. If it could, say "pause ads and wait", not "stop".
 */
export function readTest(test: { profit_cents: number; loss_cap_cents: number; over_cap: boolean }, orders: TestOrder[]): TestRead {
  const counted = orders.filter((o) => o.status !== "cancelled");
  const pendingOrders = counted.filter((o) => (awaitingStatuses as readonly string[]).includes(o.status));
  const pendingUpsideCents = pendingOrders.reduce(
    (sum, o) =>
      sum + o.subtotal_cents - o.discount_cents + o.shipping_fee_cents - o.items.reduce((s, i) => s + i.quantity * (i.unit_cost_cents ?? 0), 0) - (o.carrier_cents ?? 0),
    0
  );
  let state: TestState = "running";
  if (test.over_cap) {
    state = pendingOrders.length > 0 && test.profit_cents + pendingUpsideCents > -test.loss_cap_cents ? "wait" : "stop";
  } else if (counted.length >= minOrdersToJudge) {
    state = "judge";
  }
  return { orders: counted.length, pending: pendingOrders.length, pendingUpsideCents, state };
}

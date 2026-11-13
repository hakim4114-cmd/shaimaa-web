// UI-side description of the order workflow. The database is the source of
// truth (app.order_transitions in supabase/migrations/…_core_schema.sql);
// lib/__tests__/order-status.test.ts fails if the two drift apart.

export const orderStatuses = [
  "new",
  "confirmation_pending",
  "confirmed",
  "preparing",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
  "refused",
  "returned",
  "exchange_requested"
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export const orderTransitions: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  new: ["confirmation_pending", "confirmed", "cancelled"],
  confirmation_pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready_to_ship", "cancelled"],
  ready_to_ship: ["shipped", "cancelled"],
  shipped: ["delivered", "refused"],
  delivered: ["returned", "exchange_requested"],
  cancelled: [],
  refused: [],
  returned: [],
  exchange_requested: []
};

export type StatusTone = "neutral" | "info" | "accent" | "success" | "warning" | "danger";

export const orderStatusTone: Readonly<Record<OrderStatus, StatusTone>> = {
  new: "info",
  confirmation_pending: "warning",
  confirmed: "accent",
  preparing: "accent",
  ready_to_ship: "accent",
  shipped: "info",
  delivered: "success",
  cancelled: "neutral",
  refused: "danger",
  returned: "danger",
  exchange_requested: "warning"
};

/** Statuses on the main path, in order — used for progress display. */
export const orderHappyPath: readonly OrderStatus[] = [
  "new",
  "confirmation_pending",
  "confirmed",
  "preparing",
  "ready_to_ship",
  "shipped",
  "delivered"
];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return orderTransitions[from].includes(to);
}

export function isTerminal(status: OrderStatus): boolean {
  return orderTransitions[status].length === 0;
}

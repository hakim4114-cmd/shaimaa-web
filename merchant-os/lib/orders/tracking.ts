import type { WhatsappTemplate } from "@/lib/orders/whatsapp";

/** Parcels worth a follow-up call or message: with the courier, not yet delivered or back. */
export const trackedStatuses = ["failed_attempt", "out_for_delivery", "in_transit", "picked_up"] as const;
export type TrackedStatus = (typeof trackedStatuses)[number];

// A missed delivery first (the parcel goes back if nobody calls), then today's deliveries,
// then parcels on the way, oldest first.
const rank: Record<TrackedStatus, number> = { failed_attempt: 0, out_for_delivery: 1, in_transit: 2, picked_up: 2 };

/** `later`: the customer asked for a day after today; it waits at the end until then. */
export type TrackedRow = { status: TrackedStatus; since: string; later?: boolean };

export function compareTracking(a: TrackedRow, b: TrackedRow): number {
  return Number(a.later ?? false) - Number(b.later ?? false) || rank[a.status] - rank[b.status] || Date.parse(a.since) - Date.parse(b.since);
}

/** The message that fits where the parcel is. */
export function trackingTemplate(status: TrackedStatus): WhatsappTemplate {
  if (status === "failed_attempt") return "failedAttempt";
  if (status === "out_for_delivery") return "outForDelivery";
  return "shipped";
}

/** Whole days since a moment (0 on the same day). */
export function daysSince(since: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - Date.parse(since)) / 86400000));
}

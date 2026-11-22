import { describe, expect, it } from "vitest";
import { compareTracking, daysSince, trackingTemplate, type TrackedRow } from "@/lib/orders/tracking";

describe("delivery follow-up", () => {
  it("puts missed deliveries first, then today's, then the oldest on the way", () => {
    const rows: TrackedRow[] = [
      { status: "in_transit", since: "2026-11-20T10:00:00Z" },
      { status: "out_for_delivery", since: "2026-11-21T10:00:00Z" },
      { status: "picked_up", since: "2026-11-19T10:00:00Z" },
      { status: "failed_attempt", since: "2026-11-21T12:00:00Z" }
    ];
    expect(rows.sort(compareTracking).map((r) => r.status)).toEqual(["failed_attempt", "out_for_delivery", "picked_up", "in_transit"]);
  });
  it("picks the message that fits the parcel", () => {
    expect(trackingTemplate("failed_attempt")).toBe("failedAttempt");
    expect(trackingTemplate("out_for_delivery")).toBe("outForDelivery");
    expect(trackingTemplate("in_transit")).toBe("shipped");
  });
  it("counts whole days", () => {
    expect(daysSince("2026-11-20T10:00:00Z", Date.parse("2026-11-22T09:00:00Z"))).toBe(1);
  });
});

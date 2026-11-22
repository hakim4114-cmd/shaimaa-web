import { describe, expect, it } from "vitest";
import { addDays, deliveryPresets, shipsLater } from "@/lib/orders/delivery-day";

describe("delivery day", () => {
  it("adds days across months", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
  });
  it("ships the day before: tomorrow ships now, later waits", () => {
    expect(shipsLater(null, "2026-11-22")).toBe(false);
    expect(shipsLater("2026-11-23", "2026-11-22")).toBe(false);
    expect(shipsLater("2026-11-24", "2026-11-22")).toBe(true);
  });
  it("offers tomorrow, the day after and the next Saturday", () => {
    // 2026-11-22 is a Sunday.
    expect(deliveryPresets("2026-11-22")).toEqual({ tomorrow: "2026-11-23", dayAfter: "2026-11-24", saturday: "2026-11-28" });
    // On a Saturday, "Saturday" means next week.
    expect(deliveryPresets("2026-11-28").saturday).toBe("2026-12-05");
  });
});

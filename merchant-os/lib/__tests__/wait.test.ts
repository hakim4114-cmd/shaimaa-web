import { describe, expect, it } from "vitest";
import { waitLevel, waitMinutes, waitParts } from "@/lib/orders/wait";

describe("call wait", () => {
  it("counts whole minutes since the order arrived", () => {
    const now = Date.parse("2026-11-22T12:00:00Z");
    expect(waitMinutes("2026-11-22T08:19:30Z", now)).toBe(220);
    expect(waitMinutes("2026-11-22T12:05:00Z", now)).toBe(0);
  });
  it("colours by urgency: under an hour, up to four hours, past four hours", () => {
    expect(waitLevel(59)).toBe("ok");
    expect(waitLevel(60)).toBe("mid");
    expect(waitLevel(239)).toBe("mid");
    expect(waitLevel(240)).toBe("late");
  });
  it("shows hours and minutes, then days and hours", () => {
    expect(waitParts(221)).toEqual({ days: 0, hours: 3, minutes: 41 });
    expect(waitParts(1500)).toEqual({ days: 1, hours: 1, minutes: 0 });
  });
});

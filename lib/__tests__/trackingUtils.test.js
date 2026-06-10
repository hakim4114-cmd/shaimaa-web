import { describe, expect, it } from "vitest";
import {
  buildSafeTrackingResponse,
  isValidTrackingPhone,
  normalizeManualSheetStatus,
  normalizeOrderId,
  validateTrackingRequest
} from "../trackingUtils";

describe("normalizeOrderId", () => {
  it("trims and uppercases the order id", () => {
    expect(normalizeOrderId("  ord-123  ")).toBe("ORD-123");
    expect(normalizeOrderId(null)).toBe("");
  });
});

describe("isValidTrackingPhone", () => {
  it("accepts local and international Moroccan formats", () => {
    expect(isValidTrackingPhone("0612938475")).toBe(true);
    expect(isValidTrackingPhone("+212612938475")).toBe(true);
    expect(isValidTrackingPhone("06 12 93 84 75")).toBe(true);
  });

  it("rejects non-Moroccan numbers", () => {
    expect(isValidTrackingPhone("12345")).toBe(false);
    expect(isValidTrackingPhone("+33612938475")).toBe(false);
  });
});

describe("validateTrackingRequest", () => {
  it("returns no error for a valid request", () => {
    expect(validateTrackingRequest({ orderId: "ORD-1234", phoneNumber: "0612938475" })).toBe("");
  });

  it("flags a short order id", () => {
    expect(validateTrackingRequest({ orderId: "AB", phoneNumber: "0612938475" })).toBe("orderId");
  });

  it("flags an invalid phone number", () => {
    expect(validateTrackingRequest({ orderId: "ORD-1234", phoneNumber: "999" })).toBe("phoneNumber");
  });
});

describe("normalizeManualSheetStatus", () => {
  it("maps known statuses regardless of case", () => {
    expect(normalizeManualSheetStatus("delivered")).toBe("Delivered");
    expect(normalizeManualSheetStatus("OUT FOR DELIVERY")).toBe("Out for delivery");
    expect(normalizeManualSheetStatus("canceled")).toBe("Cancelled");
  });

  it("falls back to New for unknown statuses", () => {
    expect(normalizeManualSheetStatus("garbage value")).toBe("New");
    expect(normalizeManualSheetStatus("")).toBe("New");
  });
});

describe("buildSafeTrackingResponse", () => {
  it("returns a generic not-found response when the order is missing", () => {
    expect(buildSafeTrackingResponse(null)).toEqual({ found: false, message: "ORDER_NOT_FOUND" });
    expect(buildSafeTrackingResponse({ found: false })).toEqual({ found: false, message: "ORDER_NOT_FOUND" });
  });

  it("only exposes whitelisted fields to the client", () => {
    const response = buildSafeTrackingResponse({
      found: true,
      orderStatus: "delivered",
      deliveryStatus: "delivered",
      lastUpdated: "2026-06-01",
      fullName: "Private Customer",
      phoneNumber: "0612938475",
      fullAddress: "Secret address"
    });

    expect(response).toEqual({
      found: true,
      orderStatus: "Delivered",
      deliveryStatus: "Delivered",
      lastUpdated: "2026-06-01",
      message: ""
    });
    expect(response).not.toHaveProperty("fullName");
    expect(response).not.toHaveProperty("phoneNumber");
    expect(response).not.toHaveProperty("fullAddress");
  });
});

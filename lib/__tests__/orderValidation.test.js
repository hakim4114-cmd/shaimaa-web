import { describe, expect, it } from "vitest";
import {
  normalizeMoroccanPhone,
  scoreSuspiciousOrder,
  validateAddress,
  validateCODOrder,
  validateCustomerName,
  validateMoroccanPhone
} from "../orderValidation";

const product = {
  slug: "amina-ivory-djellaba",
  colors: ["Ivory", "Gold"],
  sizes: ["S", "M", "L"]
};

function buildValidOrder(overrides = {}) {
  return {
    fullName: "Fatima Zahra",
    phoneNumber: "0612938475",
    city: "Casablanca",
    fullAddress: "12 Rue des Orangers, Maarif",
    productSlug: product.slug,
    color: "Ivory",
    size: "M",
    quantity: 1,
    ...overrides
  };
}

describe("normalizeMoroccanPhone", () => {
  it("keeps a valid local mobile number unchanged", () => {
    expect(normalizeMoroccanPhone("0612938475")).toBe("0612938475");
  });

  it("converts the 212 international prefix to local format", () => {
    expect(normalizeMoroccanPhone("212612938475")).toBe("0612938475");
    expect(normalizeMoroccanPhone("+212 612 938 475")).toBe("0612938475");
  });

  it("converts the 00212 international prefix to local format", () => {
    expect(normalizeMoroccanPhone("00212612938475")).toBe("0612938475");
  });

  it("strips spaces, dashes, and other non-digits", () => {
    expect(normalizeMoroccanPhone("06-12-93-84-75")).toBe("0612938475");
  });
});

describe("validateMoroccanPhone", () => {
  it("accepts valid 06 and 07 mobile numbers", () => {
    expect(validateMoroccanPhone("0612938475").isValid).toBe(true);
    expect(validateMoroccanPhone("0712938475").isValid).toBe(true);
  });

  it("rejects landline-style and short numbers", () => {
    expect(validateMoroccanPhone("0522123456")).toMatchObject({ isValid: false, errorCode: "phoneNumber" });
    expect(validateMoroccanPhone("06123")).toMatchObject({ isValid: false, errorCode: "phoneNumber" });
    expect(validateMoroccanPhone("")).toMatchObject({ isValid: false, errorCode: "phoneNumber" });
  });

  it("flags repeated-digit numbers as suspicious", () => {
    expect(validateMoroccanPhone("0666666666")).toMatchObject({ isValid: false, errorCode: "phoneSuspicious" });
    expect(validateMoroccanPhone("0611111111")).toMatchObject({ isValid: false, errorCode: "phoneSuspicious" });
  });
});

describe("validateCustomerName", () => {
  it("accepts Latin and Arabic names", () => {
    expect(validateCustomerName("Fatima Zahra").isValid).toBe(true);
    expect(validateCustomerName("فاطمة الزهراء").isValid).toBe(true);
  });

  it("rejects names that are too short", () => {
    expect(validateCustomerName("Fa")).toMatchObject({ isValid: false, errorCode: "fullName" });
  });

  it("rejects placeholder and junk names", () => {
    expect(validateCustomerName("test")).toMatchObject({ isValid: false, errorCode: "fullNameSuspicious" });
    expect(validateCustomerName("12345")).toMatchObject({ isValid: false, errorCode: "fullNameSuspicious" });
    expect(validateCustomerName("aaaa")).toMatchObject({ isValid: false, errorCode: "fullNameSuspicious" });
    expect(validateCustomerName("!!!!")).toMatchObject({ isValid: false, errorCode: "fullNameSuspicious" });
  });
});

describe("validateAddress", () => {
  it("accepts a realistic street address", () => {
    expect(validateAddress("12 Rue des Orangers, Maarif").isValid).toBe(true);
  });

  it("rejects addresses that are too short", () => {
    expect(validateAddress("Rue 4")).toMatchObject({ isValid: false, errorCode: "fullAddress" });
  });

  it("rejects numeric-only and placeholder addresses", () => {
    expect(validateAddress("123456789")).toMatchObject({ isValid: false, errorCode: "fullAddressSuspicious" });
    expect(validateAddress("testing-")).toMatchObject({ isValid: false, errorCode: "fullAddressSuspicious" });
    expect(validateAddress("aaaaaaaaaa")).toMatchObject({ isValid: false, errorCode: "fullAddressSuspicious" });
  });
});

describe("validateCODOrder", () => {
  it("accepts a complete valid order", () => {
    const result = validateCODOrder(buildValidOrder(), product);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects a color or size the product does not offer", () => {
    const result = validateCODOrder(buildValidOrder({ color: "Purple", size: "XXL" }), product);
    const fields = result.errors.map((error) => error.field);

    expect(result.isValid).toBe(false);
    expect(fields).toContain("color");
    expect(fields).toContain("size");
  });

  it("rejects a product mismatch", () => {
    const result = validateCODOrder(buildValidOrder({ productSlug: "other-product" }), product);

    expect(result.errors).toContainEqual({ field: "product", code: "product" });
  });

  it("enforces quantity between 1 and 3", () => {
    expect(validateCODOrder(buildValidOrder({ quantity: 0 }), product).errors).toContainEqual({
      field: "quantity",
      code: "quantity"
    });
    expect(validateCODOrder(buildValidOrder({ quantity: 4 }), product).errors).toContainEqual({
      field: "quantity",
      code: "quantityTooHigh"
    });
    expect(validateCODOrder(buildValidOrder({ quantity: 1.5 }), product).errors).toContainEqual({
      field: "quantity",
      code: "quantity"
    });
  });
});

describe("scoreSuspiciousOrder", () => {
  it("returns zero for a normal order", () => {
    expect(scoreSuspiciousOrder(buildValidOrder())).toEqual({ score: 0, reasons: [] });
  });

  it("collects reasons for risky orders", () => {
    const result = scoreSuspiciousOrder(
      buildValidOrder({
        fullName: "Fatima",
        phoneNumber: "0612345678",
        fullAddress: "Rue 4 Hay",
        city: "Fe"
      })
    );

    expect(result.score).toBe(4);
    expect(result.reasons).toEqual(
      expect.arrayContaining(["single-name", "sequence-like-phone", "short-address", "short-city"])
    );
  });
});

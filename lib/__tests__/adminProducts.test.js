import { describe, expect, it } from "vitest";
import {
  buildAdminProductRecord,
  sanitizeAdminProduct,
  validateAdminProductInput
} from "../adminProducts";

describe("validateAdminProductInput", () => {
  it("accepts a complete valid product", () => {
    const result = validateAdminProductInput({
      name: "Amina Ivory Djellaba",
      description: "A soft ivory djellaba.",
      price: "890",
      compare_at_price: "1190",
      stock: "10",
      status: "active"
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("accepts optional fields left empty", () => {
    const result = validateAdminProductInput({
      name: "Zahra Coffee Djellaba",
      price: "1150",
      compare_at_price: "",
      stock: "",
      status: "draft"
    });

    expect(result.isValid).toBe(true);
  });

  it("rejects a missing or too-short name", () => {
    expect(validateAdminProductInput({ name: "", price: "100" }).errors).toContainEqual({
      field: "name",
      code: "NAME_TOO_SHORT"
    });
    expect(validateAdminProductInput({ name: "A", price: "100" }).errors).toContainEqual({
      field: "name",
      code: "NAME_TOO_SHORT"
    });
  });

  it("rejects missing, negative, or non-numeric prices", () => {
    expect(validateAdminProductInput({ name: "Test piece", price: "" }).errors).toContainEqual({
      field: "price",
      code: "PRICE_INVALID"
    });
    expect(validateAdminProductInput({ name: "Test piece", price: "-5" }).errors).toContainEqual({
      field: "price",
      code: "PRICE_INVALID"
    });
    expect(validateAdminProductInput({ name: "Test piece", price: "abc" }).errors).toContainEqual({
      field: "price",
      code: "PRICE_INVALID"
    });
  });

  it("rejects invalid stock values", () => {
    expect(validateAdminProductInput({ name: "Test piece", price: "100", stock: "2.5" }).errors).toContainEqual({
      field: "stock",
      code: "STOCK_INVALID"
    });
    expect(validateAdminProductInput({ name: "Test piece", price: "100", stock: "-1" }).errors).toContainEqual({
      field: "stock",
      code: "STOCK_INVALID"
    });
  });

  it("rejects unknown statuses", () => {
    expect(validateAdminProductInput({ name: "Test piece", price: "100", status: "published" }).errors).toContainEqual({
      field: "status",
      code: "STATUS_INVALID"
    });
  });
});

describe("buildAdminProductRecord", () => {
  it("trims text and converts numbers", () => {
    const record = buildAdminProductRecord({
      name: "  Amina Ivory Djellaba  ",
      description: " Soft ivory. ",
      price: "890",
      compare_at_price: "",
      stock: "10",
      main_image_url: " https://example.com/photo.jpg ",
      status: "active"
    });

    expect(record).toEqual({
      name: "Amina Ivory Djellaba",
      description: "Soft ivory.",
      price: 890,
      compare_at_price: null,
      stock: 10,
      main_image_url: "https://example.com/photo.jpg",
      status: "active"
    });
  });

  it("defaults the status to draft", () => {
    expect(buildAdminProductRecord({ name: "Test piece", price: "100" }).status).toBe("draft");
  });
});

describe("sanitizeAdminProduct", () => {
  it("only keeps known fields", () => {
    const sanitized = sanitizeAdminProduct({
      id: "abc",
      name: "Test piece",
      price: 100,
      status: "active",
      internal_cost: 40,
      supplier_phone: "0600000000"
    });

    expect(sanitized).not.toHaveProperty("internal_cost");
    expect(sanitized).not.toHaveProperty("supplier_phone");
    expect(sanitized.name).toBe("Test piece");
  });
});

import { describe, expect, it } from "vitest";
import { formatMoney, parseMoneyToCents } from "@/lib/money";

describe("parseMoneyToCents", () => {
  it.each([
    ["890", 89000],
    ["890.5", 89050],
    ["890,50", 89050],
    [" 0.01 ", 1],
    ["0", 0]
  ])("parses %s", (input, expected) => {
    expect(parseMoneyToCents(input)).toBe(expected);
  });

  it.each(["", "-5", "1,150.00", "1 150", "12.345", "abc", "1e3"])("rejects %s", (input) => {
    expect(parseMoneyToCents(input)).toBeNull();
  });

  it("avoids floating point drift", () => {
    expect(parseMoneyToCents("0.29")).toBe(29);
    expect(parseMoneyToCents("1150.10")).toBe(115010);
  });
});

describe("formatMoney", () => {
  it("formats MAD from cents with latin digits in every locale", () => {
    for (const locale of ["ar", "fr", "en"] as const) {
      const formatted = formatMoney(89050, locale);
      expect(formatted).toMatch(/890[.,]50/);
      expect(formatted).not.toMatch(/[٠-٩]/);
    }
  });
});

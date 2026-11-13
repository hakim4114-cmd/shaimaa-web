import { describe, expect, it } from "vitest";
import { formatMoroccanPhone, normalizeMoroccanPhone } from "@/lib/phone";

describe("normalizeMoroccanPhone", () => {
  it.each([
    ["0612345678", "+212612345678"],
    ["06 12 34 56 78", "+212612345678"],
    ["06-12-34-56-78", "+212612345678"],
    ["+212612345678", "+212612345678"],
    ["+212 6 12 34 56 78", "+212612345678"],
    ["00212712345678", "+212712345678"],
    ["212522123456", "+212522123456"],
    ["+2120612345678", "+212612345678"]
  ])("normalizes %s", (input, expected) => {
    expect(normalizeMoroccanPhone(input)).toBe(expected);
  });

  it.each(["", "061234567", "0812345678", "+33612345678", "06123456789", "abcdefghij"])("rejects %s", (input) => {
    expect(normalizeMoroccanPhone(input)).toBeNull();
  });
});

describe("formatMoroccanPhone", () => {
  it("formats E.164 as a national number", () => {
    expect(formatMoroccanPhone("+212612345678")).toBe("06 12 34 56 78");
  });
});

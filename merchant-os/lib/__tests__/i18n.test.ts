import { describe, expect, it } from "vitest";
import { getDictionary, interpolate } from "@/lib/i18n/dictionaries";
import { locales } from "@/lib/i18n/config";
import { orderStatuses } from "@/lib/domain/order-status";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => leafKeys(child, prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

describe("dictionaries", () => {
  it("have identical keys and no empty strings in every locale", () => {
    const reference = leafKeys(getDictionary("en")).sort();
    for (const locale of locales) {
      const dictionary = getDictionary(locale);
      expect(leafKeys(dictionary).sort()).toEqual(reference);
      for (const key of reference) {
        const text = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], dictionary);
        expect(typeof text === "string" && text.trim().length > 0, `${locale}.${key}`).toBe(true);
      }
    }
  });

  it("label every order status", () => {
    for (const locale of locales) {
      for (const status of orderStatuses) {
        expect(getDictionary(locale).orderStatus[status]).toBeTruthy();
      }
    }
  });

  it("interpolates placeholders", () => {
    expect(interpolate("Phase {phase}", { phase: 2 })).toBe("Phase 2");
    expect(interpolate("{missing}", {})).toBe("{missing}");
  });
});

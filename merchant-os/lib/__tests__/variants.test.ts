import { describe, expect, it } from "vitest";
import { combineOptions, comboKey, parseOptionValues, skuPattern, suggestSku, variantTitle } from "@/lib/catalog/variants";

const options = [
  { name: "Size", values: ["S", "M"] },
  { name: "Color", values: ["Ivory", "Gold"] }
];

describe("parseOptionValues", () => {
  it("splits on Latin and Arabic commas, trims and removes duplicates", () => {
    expect(parseOptionValues(" S, M ،L, m ,, ")).toEqual(["S", "M", "L"]);
    expect(parseOptionValues("128 GB; 256 GB")).toEqual(["128 GB", "256 GB"]);
  });
});

describe("combineOptions", () => {
  it("builds every combination in option order", () => {
    expect(combineOptions(options)).toEqual([
      { Size: "S", Color: "Ivory" },
      { Size: "S", Color: "Gold" },
      { Size: "M", Color: "Ivory" },
      { Size: "M", Color: "Gold" }
    ]);
  });

  it("returns a single empty combination for products without options", () => {
    expect(combineOptions([])).toEqual([{}]);
    expect(combineOptions([{ name: "Size", values: [] }])).toEqual([{}]);
  });
});

describe("titles, keys and SKUs", () => {
  it("titles follow option order", () => {
    expect(variantTitle({ Color: "Gold", Size: "M" }, options)).toBe("M / Gold");
  });

  it("keys ignore property order", () => {
    expect(comboKey({ Size: "M", Color: "Gold" })).toBe(comboKey({ Color: "Gold", Size: "M" }));
  });

  it("suggests valid SKUs, with a numbered fallback for Arabic values", () => {
    expect(suggestSku("Amina Djellaba", { Size: "M", Color: "Ivory" }, options, 0)).toBe("AMIN-M-IVO");
    const arabic = suggestSku("جلابة أمينة", { Size: "كبير" }, [{ name: "Size", values: ["كبير"] }], 2);
    expect(arabic).toBe("P-03");
    expect(skuPattern.test(arabic)).toBe(true);
  });
});

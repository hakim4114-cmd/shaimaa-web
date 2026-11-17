import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/export/table";
import { mapHeaders, matchCity, readImport, templateCsv } from "@/lib/import/orders";

describe("order import", () => {
  it("recognises headers in English, French and Arabic", () => {
    expect(mapHeaders(["Téléphone", "Nom", "Ville", "SKU", "Qté"])).toMatchObject({ phone: 0, full_name: 1, city: 2, sku: 3, quantity: 4 });
    expect(mapHeaders(["الهاتف", "الاسم", "المنتج", "الكمية"])).toMatchObject({ phone: 0, full_name: 1, sku: 2, quantity: 3 });
  });

  it("groups lines of the same order and takes the customer from the first line", () => {
    const { orders, issues } = readImport(parseCsv(templateCsv()));
    expect(issues).toEqual([]);
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ ref: "A1", fullName: "Amina El Idrissi", address: "Maarif, rue 12", items: [{ sku: "SHM-CARD-BRN", quantity: 1 }, { sku: "SHM-KEY-BLK", quantity: 2 }] });
  });

  it("reports invalid rows with their line number", () => {
    const { issues } = readImport([["phone", "name", "sku", "qty"], ["123", "A", "", "0"]]);
    expect(issues.map((i) => i.code).sort()).toEqual(["NAME_MISSING", "PHONE_INVALID", "QUANTITY_INVALID", "SKU_MISSING"]);
    expect(issues.every((i) => i.row === 2)).toBe(true);
    expect(readImport([["nom"], ["x"]]).issues[0]?.code).toBe("COLUMNS_MISSING");
  });

  it("matches cities by French, Arabic or alias, ignoring accents", () => {
    const cities = [{ id: 1, nameFr: "Fès", nameAr: "فاس", aliases: ["fez"] }, { id: 2, nameFr: "Casablanca", nameAr: "الدار البيضاء", aliases: ["casa"] }];
    expect(matchCity("fes", cities)).toBe(1);
    expect(matchCity("FEZ", cities)).toBe(1);
    expect(matchCity("الدار البيضاء", cities)).toBe(2);
    expect(matchCity("Casa", cities)).toBe(2);
    expect(matchCity("Tiflet", cities)).toBeNull();
  });
});

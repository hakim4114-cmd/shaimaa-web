import { describe, expect, it } from "vitest";
import { parseCsv, toCsv, toXlsx, type ExportTable } from "@/lib/export/table";

const table: ExportTable = {
  title: "Orders",
  rtl: true,
  columns: [
    { key: "n", header: "رقم", type: "text" },
    { key: "total", header: "Total", type: "money" },
    { key: "note", header: "Note", type: "text" }
  ],
  rows: [
    { n: "MOS-1", total: 45050, note: 'Says "hi", ok' },
    { n: "MOS-2", total: 0, note: "=HYPERLINK(1)" }
  ]
};

describe("CSV export", () => {
  it("starts with a BOM, quotes special characters and keeps money as MAD decimals", () => {
    const csv = toCsv(table);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('MOS-1,450.50,"Says ""hi"", ok"');
  });

  it("neutralises formulas typed by users", () => {
    expect(toCsv(table)).toContain("'=HYPERLINK(1)");
  });

  it("round-trips through the parser, with commas or semicolons", () => {
    const rows = parseCsv(toCsv(table));
    expect(rows[0]).toEqual(["رقم", "Total", "Note"]);
    expect(rows[1]).toEqual(["MOS-1", "450.50", 'Says "hi", ok']);
    expect(parseCsv("a;b\r\n1;\"x;y\"\r\n\r\n")).toEqual([["a", "b"], ["1", "x;y"]]);
  });
});

describe("Excel export", () => {
  it("produces a real xlsx file", async () => {
    const buffer = await toXlsx(table);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
    expect(buffer.length).toBeGreaterThan(1000);
  });
});

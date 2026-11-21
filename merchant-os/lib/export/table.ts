// One table model for every export: the same rows become CSV (UTF-8 with
// BOM, so Excel shows Arabic) or a real .xlsx (numbers stay numbers, dates
// stay dates, right-to-left sheet for Arabic). See docs/INTEGRATIONS.md.

export type ColumnType = "text" | "money" | "int" | "date" | "datetime" | "percent";
export type ExportColumn = { key: string; header: string; type: ColumnType; width?: number };
export type ExportTable = { title: string; subtitle?: string; columns: ExportColumn[]; rows: Record<string, unknown>[]; rtl: boolean };

/** Money is kept in cents in the app; exports show MAD with two decimals. */
function cellValue(type: ColumnType, value: unknown): string | number | Date | null {
  if (value === null || value === undefined || value === "") return null;
  switch (type) {
    case "money":
      return Math.round(Number(value)) / 100;
    case "int":
      return Number(value);
    case "percent":
      return Number(value);
    case "date":
      return typeof value === "string" ? value.slice(0, 10) : String(value);
    case "datetime":
      return value instanceof Date ? value : new Date(String(value));
    default:
      return String(value);
  }
}

function csvEscape(value: string): string {
  // Neutralise spreadsheet formulas from user-typed text (CSV injection).
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(table: ExportTable): string {
  const lines = [table.columns.map((c) => csvEscape(c.header)).join(",")];
  for (const row of table.rows) {
    lines.push(
      table.columns
        .map((c) => {
          const v = cellValue(c.type, row[c.key]);
          if (v === null) return "";
          if (v instanceof Date) return v.toISOString();
          if (typeof v === "number") return c.type === "money" ? v.toFixed(2) : String(v);
          return csvEscape(v);
        })
        .join(",")
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}

export async function toXlsx(table: ExportTable): Promise<Buffer> {
  return toXlsxBook([table]);
}

/** Several tables as the sheets of one workbook (sheet names come from the titles). */
export async function toXlsxBook(tables: ExportTable[]): Promise<Buffer> {
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook();
  book.creator = "Merchant OS";
  const used = new Set<string>();
  for (const table of tables) {
    let name = table.title.slice(0, 31).replace(/[\\/*?:[\]]/g, " ").trim() || "Sheet";
    for (let i = 2; used.has(name); i += 1) name = `${name.slice(0, 28)} ${i}`;
    used.add(name);
    const sheet = book.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1, rightToLeft: table.rtl }] });
    sheet.columns = table.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? (c.type === "text" ? 24 : 14),
      style:
        c.type === "money"
          ? { numFmt: '#,##0.00 "MAD"' }
          : c.type === "percent"
            ? { numFmt: "0%" }
            : c.type === "datetime"
              ? { numFmt: "yyyy-mm-dd hh:mm" }
              : {}
    }));
    sheet.getRow(1).font = { bold: true };
    for (const row of table.rows) {
      const values: Record<string, unknown> = {};
      for (const c of table.columns) {
        const v = cellValue(c.type, row[c.key]);
        values[c.key] = typeof v === "string" && /^[=+\-@]/.test(v) ? `'${v}` : v;
      }
      sheet.addRow(values);
    }
    if (table.columns.length) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: table.columns.length } };
  }
  const buffer = await book.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Minimal RFC 4180 parser (quotes, commas or semicolons, CRLF), for imports. */
export function parseCsv(text: string): string[][] {
  const input = text.replace(/^﻿/, "");
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

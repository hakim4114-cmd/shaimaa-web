// CSV order import: header recognition (en/fr/ar), grouping of lines into
// orders and row validation. Pure; the server creates orders one by one
// with create_order so every business rule still applies.
import { normalizeMoroccanPhone } from "@/lib/phone";
import { parseMoneyToCents } from "@/lib/money";

export const importFields = ["order_ref", "phone", "full_name", "city", "address", "sku", "quantity", "shipping_fee", "notes"] as const;
export type ImportField = (typeof importFields)[number];

const aliases: Record<ImportField, string[]> = {
  order_ref: ["order_ref", "ref", "reference", "référence", "commande", "رقم_الطلب", "المرجع"],
  phone: ["phone", "téléphone", "telephone", "tel", "الهاتف", "هاتف"],
  full_name: ["full_name", "name", "nom", "client", "الاسم", "الزبون"],
  city: ["city", "ville", "المدينة"],
  address: ["address", "adresse", "العنوان"],
  sku: ["sku", "code", "produit", "المنتج", "الرمز"],
  quantity: ["quantity", "qty", "quantité", "qte", "الكمية"],
  shipping_fee: ["shipping_fee", "shipping", "livraison", "frais", "ثمن_التوصيل", "التوصيل"],
  notes: ["notes", "note", "remarque", "ملاحظة", "ملاحظات"]
};

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");

export function mapHeaders(header: string[]): Partial<Record<ImportField, number>> {
  const map: Partial<Record<ImportField, number>> = {};
  header.forEach((cell, index) => {
    const key = norm(cell);
    for (const field of importFields) {
      if (map[field] === undefined && aliases[field].map(norm).includes(key)) map[field] = index;
    }
  });
  return map;
}

export type ImportLine = { row: number; ref: string; phone: string; fullName: string; city: string; address: string; sku: string; quantity: number; shippingFee: string; notes: string };
export type ImportIssue = { row: number; code: "PHONE_INVALID" | "SKU_MISSING" | "QUANTITY_INVALID" | "NAME_MISSING" | "FEE_INVALID" | "COLUMNS_MISSING" };
export type ImportOrder = { ref: string; rows: number[]; phone: string; fullName: string; city: string; address: string; shippingFee: string; notes: string; items: { sku: string; quantity: number }[] };

export function readImport(table: string[][]): { orders: ImportOrder[]; issues: ImportIssue[] } {
  const [header, ...body] = table;
  const map = mapHeaders(header ?? []);
  if (map.phone === undefined || map.sku === undefined) return { orders: [], issues: [{ row: 1, code: "COLUMNS_MISSING" }] };
  const get = (cells: string[], field: ImportField) => (map[field] === undefined ? "" : (cells[map[field] as number] ?? "").trim());

  const issues: ImportIssue[] = [];
  const byRef = new Map<string, ImportOrder>();
  body.forEach((cells, index) => {
    const row = index + 2;
    const qtyText = get(cells, "quantity") || "1";
    const line: ImportLine = {
      row,
      ref: get(cells, "order_ref") || `row-${row}`,
      phone: get(cells, "phone"),
      fullName: get(cells, "full_name"),
      city: get(cells, "city"),
      address: get(cells, "address"),
      sku: get(cells, "sku"),
      quantity: /^\d{1,4}$/.test(qtyText) ? Number(qtyText) : NaN,
      shippingFee: get(cells, "shipping_fee"),
      notes: get(cells, "notes")
    };
    const existing = byRef.get(line.ref);
    // Customer fields come from the first line of an order; later lines only add items.
    if (!existing) {
      if (!normalizeMoroccanPhone(line.phone)) issues.push({ row, code: "PHONE_INVALID" });
      if (line.fullName.length < 2) issues.push({ row, code: "NAME_MISSING" });
      if (line.shippingFee && parseMoneyToCents(line.shippingFee) === null) issues.push({ row, code: "FEE_INVALID" });
    }
    if (!line.sku) issues.push({ row, code: "SKU_MISSING" });
    if (!Number.isInteger(line.quantity) || line.quantity < 1) issues.push({ row, code: "QUANTITY_INVALID" });
    const order = existing ?? {
      ref: line.ref,
      rows: [],
      phone: line.phone,
      fullName: line.fullName,
      city: line.city,
      address: line.address,
      shippingFee: line.shippingFee,
      notes: line.notes,
      items: []
    };
    order.rows.push(row);
    if (line.sku && Number.isInteger(line.quantity) && line.quantity > 0) order.items.push({ sku: line.sku, quantity: line.quantity });
    byRef.set(line.ref, order);
  });
  return { orders: [...byRef.values()], issues };
}

export type CityRef = { id: number; nameFr: string; nameAr: string; aliases: string[] };

/** Matches a typed city to the reference list (French, Arabic or a known alias). */
export function matchCity(input: string, cities: CityRef[]): number | null {
  const key = input.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (!key) return null;
  for (const city of cities) {
    const names = [city.nameFr, city.nameAr, ...city.aliases].map((n) => n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""));
    if (names.includes(key)) return city.id;
  }
  return null;
}

export function templateCsv(): string {
  return `﻿${importFields.join(",")}\r\nA1,0612345678,Amina El Idrissi,Casablanca,"Maarif, rue 12",SHM-CARD-BRN,1,35,\r\nA1,0612345678,,,,SHM-KEY-BLK,2,,\r\n`;
}

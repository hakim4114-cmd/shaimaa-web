// Pure Sendit helpers (no network): status mapping, signature check and
// payload building. Tested in lib/__tests__/sendit.test.ts.
// Reference: Sendit OpenAPI (https://app.sendit.ma/api/documentation) and
// the webhook guide (guide-webhook-sendit.pdf), read 2026-11-17.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Database } from "@/lib/supabase/database.types";

export type ShipmentStatus = Database["public"]["Enums"]["shipment_status"];

export const senditStatuses = [
  "PENDING",
  "TO_PREPARE",
  "NEW_DESTINATION",
  "TO_PICKUP",
  "PICKEDUP",
  "WAREHOUSE",
  "TRANSIT",
  "DISTRIBUTED",
  "DELIVERING",
  "UNREACHABLE",
  "POSTPONED",
  "SCHEDULED",
  "DELIVERED",
  "CANCELED",
  "REJECTED"
] as const;
export type SenditStatus = (typeof senditStatuses)[number];

/**
 * Sendit status → our shipment status. NULL = details only (the shipment
 * keeps its status): waiting for pickup, rescheduled, new destination.
 */
const statusMap: Record<SenditStatus, ShipmentStatus | null> = {
  PENDING: null,
  TO_PREPARE: null,
  TO_PICKUP: null,
  NEW_DESTINATION: null,
  PICKEDUP: "picked_up",
  WAREHOUSE: "in_transit",
  TRANSIT: "in_transit",
  DISTRIBUTED: "in_transit",
  DELIVERING: "out_for_delivery",
  UNREACHABLE: "failed_attempt",
  POSTPONED: null,
  SCHEDULED: null,
  DELIVERED: "delivered",
  CANCELED: "cancelled",
  REJECTED: "returned_to_sender"
};

export function isSenditStatus(value: unknown): value is SenditStatus {
  return typeof value === "string" && (senditStatuses as readonly string[]).includes(value);
}

export function mapSenditStatus(status: string): ShipmentStatus | null {
  return isSenditStatus(status) ? statusMap[status] : null;
}

/**
 * Sendit signs the raw body with HMAC-SHA256 using the API key chosen for
 * the webhook (X-Sendit-Signature). The guide does not say which key (secret
 * or public) nor the encoding, so every candidate key is tried in hex and
 * base64, always with a constant-time comparison.
 */
export function verifySenditSignature(rawBody: string, signature: string | null, keys: (string | undefined)[]): boolean {
  const provided = signature?.trim().replace(/^sha256=/i, "") ?? "";
  if (!provided) return false;
  for (const key of keys) {
    if (!key) continue;
    const digest = createHmac("sha256", key).update(rawBody, "utf8").digest();
    for (const expected of [digest.toString("hex"), digest.toString("base64")]) {
      const a = Buffer.from(expected);
      const b = Buffer.from(provided);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    }
  }
  return false;
}

/** Sendit expects the national format: 06XXXXXXXX. */
export function toSenditPhone(e164: string): string {
  return /^\+212\d{9}$/.test(e164) ? `0${e164.slice(4)}` : e164;
}

export type SenditSettings = {
  pickupDistrictId: number | null;
  pickupCity: string;
  pickupName: string;
  pickupPhone: string;
  pickupAddress: string;
  allowOpen: boolean;
  allowTry: boolean;
  /** Send the parcel to Sendit as soon as an order is confirmed (opt-in). */
  autoShip: boolean;
};

export function readSenditSettings(value: unknown): SenditSettings {
  const s = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const text = (key: string) => (typeof s[key] === "string" ? (s[key] as string) : "");
  const id = Number(s.pickup_district_id);
  return {
    pickupDistrictId: Number.isInteger(id) && id > 0 ? id : null,
    pickupCity: text("pickup_city"),
    pickupName: text("pickup_name"),
    pickupPhone: text("pickup_phone"),
    pickupAddress: text("pickup_address"),
    allowOpen: s.allow_open !== false,
    allowTry: s.allow_try !== false,
    autoShip: s.auto_ship === true
  };
}

const foldPlace = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
    .trim();

/**
 * Picks the Sendit district for an order's city without guessing: the only
 * district of that city, or the one district named exactly like the city
 * (for example "Kénitra" among "Kénitra - Saknia"…). Otherwise null.
 */
export function pickDistrictForCity<T extends { name: string; city: string }>(city: string, districts: T[]): T | null {
  const target = foldPlace(city);
  if (!target) return null;
  const inCity = districts.filter((d) => foldPlace(d.city) === target);
  if (inCity.length === 1) return inCity[0] ?? null;
  const named = (inCity.length ? inCity : districts).filter((d) => foldPlace(d.name) === target);
  return named.length === 1 ? (named[0] ?? null) : null;
}

export type ParcelOrder = {
  orderNumber: string;
  fullName: string;
  phone: string;
  address: string;
  codAmountCents: number;
  notes: string;
  items: { productName: string; variantTitle: string; quantity: number }[];
};

/** Body for POST /deliveries (merchant keeps their own stock: products_from_stock = 0). */
export function buildDeliveryPayload(order: ParcelOrder, districtId: number, settings: SenditSettings, exchangeOfCode: string | null = null) {
  const products = order.items
    .map((item) => `${item.productName}${item.variantTitle ? ` (${item.variantTitle})` : ""} x${item.quantity}`)
    .join(" ; ")
    .slice(0, 250);
  return {
    ...(settings.pickupDistrictId ? { pickup_district_id: settings.pickupDistrictId } : {}),
    district_id: districtId,
    name: order.fullName.slice(0, 120),
    amount: Math.round(order.codAmountCents) / 100,
    address: order.address.slice(0, 250),
    phone: toSenditPhone(order.phone),
    comment: order.notes.slice(0, 250),
    reference: order.orderNumber,
    allow_open: settings.allowOpen ? 1 : 0,
    allow_try: settings.allowTry ? 1 : 0,
    products_from_stock: 0,
    products,
    // Exchange: Sendit delivers this parcel and brings back the original one.
    option_exchange: exchangeOfCode ? 1 : 0,
    ...(exchangeOfCode ? { delivery_exchange_id: exchangeOfCode } : {})
  };
}

/** Sendit amounts are MAD floats ("35", 35.5); we store integer cents. */
export function madToCents(value: unknown): number {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
}

// ---------------------------------------------------------------------------
// Invoices (COD payouts)
// ---------------------------------------------------------------------------

export type SenditInvoiceLine =
  | { type: "delivery"; code: string; status: string; amountCents: number; feeCents: number }
  | { type: "pickup"; code: string; feeCents: number }
  | { type: "extra"; code: string; label: string; amountCents: number; paidBySendit: boolean }
  | { type: "credit"; code: string; amountCents: number };

export function readInvoiceLines(items: unknown): SenditInvoiceLine[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((raw): SenditInvoiceLine[] => {
    if (!raw || typeof raw !== "object") return [];
    const r = raw as Record<string, unknown>;
    const code = typeof r.code === "string" ? r.code : "";
    switch (r.type) {
      case "delivery":
        return [{ type: "delivery", code, status: String(r.status ?? ""), amountCents: madToCents(r.amount), feeCents: madToCents(r.fee) }];
      case "pickup":
        return [{ type: "pickup", code, feeCents: madToCents(r.fee) }];
      case "extra":
        return [{ type: "extra", code, label: String(r.label ?? ""), amountCents: madToCents(r.amount), paidBySendit: /^oui|yes|1|true$/i.test(String(r.paid_by_sendit ?? "")) }];
      case "credit":
        return [{ type: "credit", code, amountCents: madToCents(r.amount) }];
      default:
        return [];
    }
  });
}

export type KnownParcel = { orderId: string; orderNumber: string; codAmountCents: number; paymentStatus: string };

export type InvoicePreview = {
  settle: { trackingNumber: string; orderNumber: string; collectedCents: number; feeCents: number }[];
  mismatches: { trackingNumber: string; orderNumber: string; expectedCents: number; invoicedCents: number }[];
  alreadySettled: string[];
  unknown: string[];
  otherLines: SenditInvoiceLine[];
  deliveredGrossCents: number;
  deliveredFeesCents: number;
  /** Other charges implied by the invoice amount (what record_carrier_invoice stores). */
  impliedOtherCents: number;
  /** Other charges explained by the non-delivery lines (best reading of their signs). */
  explainedOtherCents: number;
};

/**
 * Compares an invoice with our parcels. Only delivered parcels whose amount
 * equals the order's COD can be settled; any mismatch blocks recording.
 * Refusal and cancellation lines carry a fee and no money; pickups are fees;
 * extras paid by Sendit and credits are in the merchant's favour (assumed:
 * the guide does not document their sign, so the preview shows any gap).
 */
export function previewInvoice(invoiceAmountCents: number, lines: SenditInvoiceLine[], parcels: Map<string, KnownParcel>): InvoicePreview {
  const preview: InvoicePreview = {
    settle: [],
    mismatches: [],
    alreadySettled: [],
    unknown: [],
    otherLines: [],
    deliveredGrossCents: 0,
    deliveredFeesCents: 0,
    impliedOtherCents: 0,
    explainedOtherCents: 0
  };
  for (const line of lines) {
    if (line.type === "delivery" && line.status === "DELIVERED") {
      const parcel = parcels.get(line.code);
      if (!parcel) {
        preview.unknown.push(line.code);
      } else if (parcel.paymentStatus === "settled") {
        preview.alreadySettled.push(line.code);
      } else if (parcel.codAmountCents !== line.amountCents || parcel.paymentStatus !== "awaiting_remittance") {
        preview.mismatches.push({ trackingNumber: line.code, orderNumber: parcel.orderNumber, expectedCents: parcel.codAmountCents, invoicedCents: line.amountCents });
      } else {
        preview.settle.push({ trackingNumber: line.code, orderNumber: parcel.orderNumber, collectedCents: line.amountCents, feeCents: line.feeCents });
        preview.deliveredGrossCents += line.amountCents;
        preview.deliveredFeesCents += line.feeCents;
      }
      continue;
    }
    preview.otherLines.push(line);
    if (line.type === "delivery" || line.type === "pickup") preview.explainedOtherCents += line.feeCents;
    else if (line.type === "extra") preview.explainedOtherCents += line.paidBySendit ? -line.amountCents : line.amountCents;
    else preview.explainedOtherCents -= line.amountCents;
  }
  preview.impliedOtherCents = preview.deliveredGrossCents - preview.deliveredFeesCents - invoiceAmountCents;
  return preview;
}

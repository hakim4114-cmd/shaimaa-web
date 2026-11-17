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
    allowTry: s.allow_try !== false
  };
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
export function buildDeliveryPayload(order: ParcelOrder, districtId: number, settings: SenditSettings) {
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
    option_exchange: 0
  };
}

/** Sendit amounts are MAD floats ("35", 35.5); we store integer cents. */
export function madToCents(value: unknown): number {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
}

// Online store connections: turns a store webhook (Shopify, WooCommerce, or a
// custom site) into the normalized order that ingest_store_order expects.
// Pure functions: no I/O, unit-tested in lib/__tests__/stores.test.ts.
import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeMoroccanPhone } from "@/lib/phone";

export const storePlatforms = ["shopify", "woocommerce", "custom", "youcan"] as const;
export type StorePlatform = (typeof storePlatforms)[number];
/** Platforms a merchant can connect today (YouCan needs a partner app first). */
export const connectablePlatforms = ["shopify", "woocommerce", "custom"] as const satisfies readonly StorePlatform[];

export type NormalizedStoreOrder = {
  external_id: string;
  number: string;
  currency: string;
  paid: boolean;
  customer: { full_name: string; phone: string; city: string; address: string };
  items: { sku: string; title: string; quantity: number; unit_price_cents: number }[];
  shipping_cents: number;
  discount_cents: number;
  note: string;
};

export type ParsedDelivery = { kind: "order"; order: NormalizedStoreOrder } | { kind: "ignore"; reason: string } | { kind: "invalid"; reason: string };

/** Header that carries the signature for each platform. */
export const signatureHeader: Record<StorePlatform, string> = {
  shopify: "x-shopify-hmac-sha256",
  woocommerce: "x-wc-webhook-signature",
  custom: "x-merchant-signature",
  youcan: "x-youcan-signature"
};

/** HMAC-SHA256 of the raw body with the store secret; hex or base64 accepted. */
export function verifyStoreSignature(rawBody: string, signature: string | null, secret: string | null | undefined): boolean {
  const provided = signature?.trim().replace(/^sha256=/i, "") ?? "";
  if (!provided || !secret) return false;
  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  for (const expected of [digest.toString("hex"), digest.toString("base64")]) {
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const join = (...parts: unknown[]) => parts.map(str).filter(Boolean).join(" ");

/** "149.90" / 149.9 → 14990. Invalid or negative → 0. */
export function toCents(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseFloat(str(value));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

/** E.164 when the number is a valid Moroccan one, otherwise the raw text (flagged later as invalid_phone). */
function phone(...candidates: unknown[]): string {
  for (const c of candidates) {
    const normalized = normalizeMoroccanPhone(str(c));
    if (normalized) return normalized;
  }
  return candidates.map(str).find(Boolean) ?? "";
}

function quantity(v: unknown): number {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 999) : 1;
}

// --- Shopify (orders/create, admin webhook or app) --------------------------
function parseShopify(body: Obj, topic: string | null): ParsedDelivery {
  if (topic && topic !== "orders/create") return { kind: "ignore", reason: `topic ${topic}` };
  const id = str(body.id);
  if (!id) return { kind: "invalid", reason: "missing id" };
  const ship = obj(body.shipping_address);
  const bill = obj(body.billing_address);
  const customer = obj(body.customer);
  const address = Object.keys(ship).length ? ship : bill;
  const shipping =
    toCents(obj(obj(body.total_shipping_price_set).shop_money).amount) ||
    arr(body.shipping_lines).reduce<number>((sum, line) => sum + toCents(obj(line).price), 0);
  return {
    kind: "order",
    order: {
      external_id: id,
      number: str(body.name) || str(body.order_number),
      currency: str(body.currency) || "MAD",
      paid: str(body.financial_status) === "paid",
      customer: {
        full_name: join(address.first_name, address.last_name) || str(address.name) || join(customer.first_name, customer.last_name),
        phone: phone(address.phone, body.phone, customer.phone, bill.phone),
        city: str(address.city),
        address: join(address.address1, address.address2)
      },
      items: arr(body.line_items).map((raw) => {
        const line = obj(raw);
        return {
          sku: str(line.sku),
          title: join(line.title, line.variant_title),
          quantity: quantity(line.quantity),
          unit_price_cents: toCents(line.price)
        };
      }),
      shipping_cents: shipping,
      discount_cents: toCents(body.total_discounts),
      note: str(body.note).slice(0, 1000)
    }
  };
}

// --- WooCommerce (order.created) --------------------------------------------
function parseWoo(body: Obj, topic: string | null): ParsedDelivery {
  if (topic && topic !== "order.created") return { kind: "ignore", reason: `topic ${topic}` };
  const id = str(body.id);
  if (!id) return { kind: "invalid", reason: "missing id" };
  const ship = obj(body.shipping);
  const bill = obj(body.billing);
  const address = str(ship.address_1) || str(ship.city) ? ship : bill;
  return {
    kind: "order",
    order: {
      external_id: id,
      number: str(body.number) || id,
      currency: str(body.currency) || "MAD",
      paid: str(body.payment_method) !== "cod" && Boolean(str(body.date_paid)),
      customer: {
        full_name: join(address.first_name, address.last_name) || join(bill.first_name, bill.last_name),
        phone: phone(ship.phone, bill.phone),
        city: str(address.city),
        address: join(address.address_1, address.address_2)
      },
      items: arr(body.line_items).map((raw) => {
        const line = obj(raw);
        const qty = quantity(line.quantity);
        // subtotal = line total before coupons; coupons are in discount_total.
        const unit = toCents(line.subtotal) ? Math.round(toCents(line.subtotal) / qty) : toCents(line.price);
        return { sku: str(line.sku), title: str(line.name), quantity: qty, unit_price_cents: unit };
      }),
      shipping_cents: toCents(body.shipping_total),
      discount_cents: toCents(body.discount_total),
      note: str(body.customer_note).slice(0, 1000)
    }
  };
}

// --- Custom site (documented in docs/INTEGRATIONS.md) ------------------------
function parseCustom(body: Obj): ParsedDelivery {
  const id = str(body.id);
  if (!id) return { kind: "invalid", reason: "missing id" };
  const customer = obj(body.customer);
  return {
    kind: "order",
    order: {
      external_id: id,
      number: str(body.number) || id,
      currency: str(body.currency) || "MAD",
      paid: body.paid === true,
      customer: {
        full_name: str(customer.name),
        phone: phone(customer.phone),
        city: str(customer.city),
        address: str(customer.address)
      },
      items: arr(body.items).map((raw) => {
        const line = obj(raw);
        return { sku: str(line.sku), title: str(line.title), quantity: quantity(line.quantity), unit_price_cents: toCents(line.price) };
      }),
      shipping_cents: toCents(body.shipping),
      discount_cents: toCents(body.discount),
      note: str(body.note).slice(0, 1000)
    }
  };
}

/** Parses a verified delivery. `topic` is the platform's topic header, when it sends one. */
export function parseStoreDelivery(platform: StorePlatform, rawBody: string, topic: string | null): ParsedDelivery {
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { kind: "invalid", reason: "invalid json" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return { kind: "invalid", reason: "invalid json" };
  switch (platform) {
    case "shopify":
      return parseShopify(body as Obj, topic);
    case "woocommerce":
      return parseWoo(body as Obj, topic);
    case "custom":
      return parseCustom(body as Obj);
    default:
      return { kind: "ignore", reason: "platform not supported yet" };
  }
}

/** WooCommerce sends `webhook_id=…` (form-encoded, unsigned) when a webhook is saved. */
export function isWooPing(rawBody: string): boolean {
  return /^webhook_id=\d+$/.test(rawBody.trim());
}

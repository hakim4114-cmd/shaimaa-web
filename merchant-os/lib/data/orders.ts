import "server-only";
import { listProducts } from "@/lib/data/catalog";
import type { OrderStatus } from "@/lib/domain/order-status";
import { compareCallQueue, type CallOutcome, type OrderSource } from "@/lib/orders/calls";
import { normalizeMoroccanPhone } from "@/lib/phone";
import type { requireOrganization } from "./context";

type Client = Awaited<ReturnType<typeof requireOrganization>>["supabase"];

export const orderViews = ["to_call", "confirmed", "preparing", "ready", "open", "closed", "all"] as const;
export type OrderView = (typeof orderViews)[number];

const viewStatuses: Record<OrderView, OrderStatus[] | null> = {
  to_call: ["new", "confirmation_pending"],
  confirmed: ["confirmed"],
  preparing: ["preparing"],
  ready: ["ready_to_ship"],
  open: ["new", "confirmation_pending", "confirmed", "preparing", "ready_to_ship", "shipped"],
  closed: ["delivered", "cancelled", "refused", "returned", "exchange_requested"],
  all: null
};

export type Contact = { fullName: string; phone: string; address: string };

export type OrderListRow = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  city: string;
  totalCents: number;
  codAmountCents: number;
  callAttempts: number;
  lastCallOutcome: CallOutcome | null;
  nextCallAt: string | null;
  createdAt: string;
  source: OrderSource;
  itemCount: number;
  contact: Contact | null;
  deliverOn: string | null;
};

type RawContact = { full_name: string; phone: string; address: string };

// order_contacts is one row per order; PostgREST may return it as an object or a one-element array.
function oneContact(value: RawContact | RawContact[] | null | undefined): Contact | null {
  const row = Array.isArray(value) ? value[0] : value;
  return row ? { fullName: row.full_name, phone: row.phone, address: row.address } : null;
}

type RawListOrder = {
  id: string;
  order_number: string;
  status: OrderStatus;
  city: string;
  total_cents: number;
  cod_amount_cents: number;
  call_attempts: number;
  last_call_outcome: CallOutcome | null;
  next_call_at: string | null;
  created_at: string;
  source: OrderSource;
  deliver_on: string | null;
  items: { quantity: number }[] | null;
  contact: RawContact | RawContact[] | null;
};

function escapeLike(value: string) {
  return value.replace(/[%_\\]/g, (c) => `\\${c}`);
}

export async function listOrders(
  supabase: Client,
  organizationId: string,
  options: { view: OrderView; q?: string; withContacts: boolean }
): Promise<OrderListRow[]> {
  const q = options.q?.trim() ?? "";
  const phone = q ? normalizeMoroccanPhone(q) : null;
  const byContact = options.withContacts && q !== "" && !/^[A-Za-z]{2,10}-?\d+$/.test(q);
  const contactEmbed = options.withContacts ? `contact:order_contacts${byContact ? "!inner" : ""}(full_name, phone, address)` : "";
  const select = [
    "id, order_number, status, city, total_cents, cod_amount_cents, call_attempts, last_call_outcome, next_call_at, created_at, source, deliver_on",
    "items:order_items(quantity)",
    contactEmbed
  ]
    .filter(Boolean)
    .join(", ");

  let query = supabase.from("orders").select(select).eq("organization_id", organizationId);
  const statuses = viewStatuses[options.view];
  if (statuses) {
    query = query.in("status", statuses);
  }
  if (q) {
    if (phone && byContact) {
      query = query.eq("contact.phone", phone);
    } else if (byContact) {
      query = query.ilike("contact.full_name", `%${escapeLike(q)}%`);
    } else {
      query = query.ilike("order_number", `%${escapeLike(q)}%`);
    }
  }
  query = query.order("created_at", { ascending: options.view === "to_call" }).limit(300);

  const { data, error } = await query.overrideTypes<RawListOrder[], { merge: false }>();
  if (error) throw new Error("ORDERS_UNAVAILABLE");

  const rows = (data ?? []).map<OrderListRow>((raw) => ({
    id: raw.id,
    orderNumber: raw.order_number,
    status: raw.status,
    city: raw.city,
    totalCents: raw.total_cents,
    codAmountCents: raw.cod_amount_cents,
    callAttempts: raw.call_attempts,
    lastCallOutcome: raw.last_call_outcome,
    nextCallAt: raw.next_call_at,
    createdAt: raw.created_at,
    source: raw.source,
    itemCount: (raw.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
    contact: oneContact(raw.contact),
    deliverOn: raw.deliver_on
  }));

  if (options.view === "to_call") {
    rows.sort(compareCallQueue);
  }
  return rows;
}

export async function countOrdersByView(supabase: Client, organizationId: string) {
  const { data, error } = await supabase.from("orders").select("status, next_call_at").eq("organization_id", organizationId).in("status", viewStatuses.open ?? []);
  if (error) return null;
  const counts = { to_call: 0, due: 0, confirmed: 0, preparing: 0, ready: 0 };
  const now = Date.now();
  for (const row of data ?? []) {
    if (row.status === "new" || row.status === "confirmation_pending") {
      counts.to_call += 1;
      if (!row.next_call_at || Date.parse(row.next_call_at) <= now) counts.due += 1;
    } else if (row.status === "confirmed") counts.confirmed += 1;
    else if (row.status === "preparing") counts.preparing += 1;
    else if (row.status === "ready_to_ship") counts.ready += 1;
  }
  return counts;
}

export type OrderDetail = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  source: OrderSource;
  city: string;
  cityId: number | null;
  subtotalCents: number;
  discountCents: number;
  shippingFeeCents: number;
  totalCents: number;
  codAmountCents: number;
  notes: string;
  internalNotes: string;
  callAttempts: number;
  nextCallAt: string | null;
  createdAt: string;
  /** The day the customer asked to receive it (null: as soon as possible). */
  deliverOn: string | null;
  contact: Contact | null;
  items: { id: string; variantId: string; productName: string; variantTitle: string; sku: string; quantity: number; unitPriceCents: number; lineTotalCents: number }[];
  calls: { id: number; outcome: CallOutcome; channel: "phone" | "whatsapp"; note: string | null; callBackAt: string | null; createdAt: string }[];
  events: { id: number; type: string; fromStatus: OrderStatus | null; toStatus: OrderStatus | null; note: string | null; createdAt: string }[];
};

type RawDetail = {
  id: string;
  order_number: string;
  status: OrderStatus;
  source: OrderSource;
  city: string;
  city_id: number | null;
  subtotal_cents: number;
  discount_cents: number;
  shipping_fee_cents: number;
  total_cents: number;
  cod_amount_cents: number;
  notes: string;
  internal_notes: string;
  call_attempts: number;
  deliver_on: string | null;
  next_call_at: string | null;
  created_at: string;
  contact?: RawContact | RawContact[] | null;
  items: { id: string; variant_id: string; product_name: string; variant_title: string; sku: string; quantity: number; unit_price_cents: number; line_total_cents: number | null }[];
  events: { id: number; event_type: string; from_status: OrderStatus | null; to_status: OrderStatus | null; note: string | null; created_at: string }[];
};

export async function getOrder(supabase: Client, organizationId: string, id: string, options: { withContacts: boolean; withCalls: boolean }): Promise<OrderDetail | null> {
  const select = [
    "id, order_number, status, source, city, city_id, subtotal_cents, discount_cents, shipping_fee_cents, total_cents, cod_amount_cents, notes, internal_notes, call_attempts, next_call_at, created_at, deliver_on",
    "items:order_items(id, variant_id, product_name, variant_title, sku, quantity, unit_price_cents, line_total_cents)",
    "events:order_events(id, event_type, from_status, to_status, note, created_at)",
    options.withContacts ? "contact:order_contacts(full_name, phone, address)" : ""
  ]
    .filter(Boolean)
    .join(", ");
  const { data, error } = await supabase
    .from("orders")
    .select(select)
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<RawDetail, { merge: false }>();
  if (error) throw new Error("ORDER_UNAVAILABLE");
  if (!data) return null;

  let calls: OrderDetail["calls"] = [];
  if (options.withCalls) {
    const { data: callRows } = await supabase
      .from("order_call_attempts")
      .select("id, outcome, channel, note, call_back_at, created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: false });
    calls = (callRows ?? []).map((row) => ({ id: row.id, outcome: row.outcome, channel: row.channel, note: row.note, callBackAt: row.call_back_at, createdAt: row.created_at }));
  }

  return {
    id: data.id,
    orderNumber: data.order_number,
    status: data.status,
    source: data.source,
    city: data.city,
    cityId: data.city_id,
    subtotalCents: data.subtotal_cents,
    discountCents: data.discount_cents,
    shippingFeeCents: data.shipping_fee_cents,
    totalCents: data.total_cents,
    codAmountCents: data.cod_amount_cents,
    notes: data.notes,
    internalNotes: data.internal_notes,
    callAttempts: data.call_attempts,
    nextCallAt: data.next_call_at,
    deliverOn: data.deliver_on,
    createdAt: data.created_at,
    contact: oneContact(data.contact),
    items: data.items.map((item) => ({
      id: item.id,
      variantId: item.variant_id,
      productName: item.product_name,
      variantTitle: item.variant_title,
      sku: item.sku,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
      lineTotalCents: item.line_total_cents ?? item.quantity * item.unit_price_cents
    })),
    calls,
    events: [...data.events]
      .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
      .map((event) => ({ id: event.id, type: event.event_type, fromStatus: event.from_status, toStatus: event.to_status, note: event.note, createdAt: event.created_at }))
  };
}

export type CityOption = { id: number; nameFr: string; nameAr: string; aliases: string[] };

export async function listCities(supabase: Client): Promise<CityOption[]> {
  const { data, error } = await supabase.from("cities").select("id, name_fr, name_ar, aliases").eq("is_active", true).order("name_fr");
  if (error) throw new Error("CITIES_UNAVAILABLE");
  return (data ?? []).map((row) => ({ id: row.id, nameFr: row.name_fr, nameAr: row.name_ar, aliases: row.aliases }));
}

/** Default customer shipping fee per city (rates without a carrier). */
export async function defaultShippingFees(supabase: Client, organizationId: string): Promise<Record<number, number>> {
  const { data } = await supabase.from("shipping_rates").select("city_id, customer_fee_cents").eq("organization_id", organizationId).is("provider_id", null);
  return Object.fromEntries((data ?? []).map((row) => [row.city_id, row.customer_fee_cents]));
}

export type SellableVariant = { id: string; label: string; productName: string; variantTitle: string; priceCents: number; available: number };

export async function listSellableVariants(supabase: Client, organizationId: string): Promise<SellableVariant[]> {
  const products = await listProducts(supabase, organizationId, { status: "active" });
  return products.flatMap((product) =>
    product.variants
      .filter((variant) => variant.status === "active")
      .map((variant) => ({
        id: variant.id,
        label: variant.title ? `${product.name} — ${variant.title}` : product.name,
        productName: product.name,
        variantTitle: variant.title,
        priceCents: variant.priceCents,
        available: variant.stock.available
      }))
  );
}

export type CustomerHistory = { ordersTotal: number; delivered: number; refused: number; returned: number; cancelled: number; blocked: boolean; blockReason: string | null };

export async function getCustomerHistory(supabase: Client, organizationId: string, phone: string): Promise<CustomerHistory | null> {
  const { data, error } = await supabase.rpc("customer_history", { p_organization_id: organizationId, p_phone: phone });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return null;
  return {
    ordersTotal: row.orders_total,
    delivered: row.delivered,
    refused: row.refused,
    returned: row.returned,
    cancelled: row.cancelled,
    blocked: row.blocked,
    blockReason: row.block_reason
  };
}

export async function findCustomer(supabase: Client, organizationId: string, phone: string) {
  const { data } = await supabase.from("customers").select("full_name, city, address").eq("organization_id", organizationId).eq("phone", phone).maybeSingle();
  return data ? { fullName: data.full_name, city: data.city, address: data.address } : null;
}

export type BlockedNumber = { id: string; phone: string; reason: string; createdAt: string };

export async function listBlocklist(supabase: Client, organizationId: string): Promise<BlockedNumber[]> {
  const { data, error } = await supabase.from("customer_blocklist").select("id, phone, reason, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false });
  if (error) throw new Error("BLOCKLIST_UNAVAILABLE");
  return (data ?? []).map((row) => ({ id: row.id, phone: row.phone, reason: row.reason, createdAt: row.created_at }));
}

export type CustomerRow = { id: string; fullName: string; phone: string; city: string; orders: number; createdAt: string };

export async function listCustomers(supabase: Client, organizationId: string, q: string): Promise<CustomerRow[]> {
  let query = supabase.from("customers").select("id, full_name, phone, city, created_at, orders(count)").eq("organization_id", organizationId);
  const phone = q ? normalizeMoroccanPhone(q) : null;
  if (phone) query = query.eq("phone", phone);
  else if (q) query = query.ilike("full_name", `%${escapeLike(q)}%`);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(300)
    .overrideTypes<{ id: string; full_name: string; phone: string; city: string; created_at: string; orders: { count: number }[] }[], { merge: false }>();
  if (error) throw new Error("CUSTOMERS_UNAVAILABLE");
  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    city: row.city,
    orders: row.orders?.[0]?.count ?? 0,
    createdAt: row.created_at
  }));
}

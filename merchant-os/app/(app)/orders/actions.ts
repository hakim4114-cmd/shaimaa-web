"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganization } from "@/lib/data/context";
import { mapDatabaseError, type AppErrorCode } from "@/lib/data/errors";
import { findCustomer, getCustomerHistory, type CustomerHistory } from "@/lib/data/orders";
import { orderStatuses } from "@/lib/domain/order-status";
import { callOutcomes, orderSources } from "@/lib/orders/calls";
import { parseMoneyToCents } from "@/lib/money";
import { normalizeMoroccanPhone } from "@/lib/phone";
import type { Json } from "@/lib/supabase/database.types";

export type LookupResult = {
  phone: string | null;
  history: CustomerHistory | null;
  customer: { fullName: string; city: string; address: string } | null;
};

export async function lookupCustomer(input: string): Promise<LookupResult> {
  const phone = normalizeMoroccanPhone(String(input ?? ""));
  if (!phone) return { phone: null, history: null, customer: null };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.manageOrders) return { phone, history: null, customer: null };
  const [history, customer] = await Promise.all([getCustomerHistory(supabase, organizationId, phone), findCustomer(supabase, organizationId, phone)]);
  return { phone, history, customer };
}

const orderInput = z.object({
  phone: z.string().max(40),
  fullName: z.string().trim().max(120),
  cityId: z.number().int().positive().nullable(),
  cityOther: z.string().trim().max(80),
  address: z.string().trim().max(500),
  items: z.array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(1000) })).max(50),
  shippingFee: z.string().max(20),
  discount: z.string().max(20),
  source: z.enum(orderSources as [string, ...string[]]),
  notes: z.string().max(2000),
  internalNotes: z.string().max(4000),
  allowBlocked: z.boolean(),
  campaignId: z.string().uuid().nullable().optional()
});

export type OrderInput = z.infer<typeof orderInput>;
export type OrderResult = { orderId?: string; error?: AppErrorCode };

function parseCommon(input: OrderInput): { error: AppErrorCode } | { phone: string; shipping: number | null; discount: number } {
  const phone = normalizeMoroccanPhone(input.phone);
  if (!phone) return { error: "PHONE_INVALID" };
  if (input.fullName.trim().length < 2) return { error: "CUSTOMER_NAME_REQUIRED" };
  if (input.items.length === 0) return { error: "ORDER_ITEMS_REQUIRED" };
  const shipping = input.shippingFee.trim() === "" ? null : parseMoneyToCents(input.shippingFee);
  if (input.shippingFee.trim() !== "" && shipping === null) return { error: "INVALID_SHIPPING_FEE" };
  const discount = input.discount.trim() === "" ? 0 : parseMoneyToCents(input.discount);
  if (discount === null) return { error: "INVALID_DISCOUNT" };
  return { phone, shipping, discount };
}

function revalidateOrders(orderId?: string) {
  revalidatePath("/orders");
  revalidatePath("/inventory");
  revalidatePath("/");
  if (orderId) revalidatePath(`/orders/${orderId}`);
}

export async function createOrder(input: OrderInput): Promise<OrderResult> {
  const parsed = orderInput.safeParse(input);
  if (!parsed.success) return { error: "INVALID_INPUT" };
  const common = parseCommon(parsed.data);
  if ("error" in common) return { error: common.error };
  const value = parsed.data;

  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.manageOrders) return { error: "FORBIDDEN" };

  const payload = {
    customer: { phone: common.phone, full_name: value.fullName.trim(), city: value.cityId ? "" : value.cityOther, address: value.address },
    city_id: value.cityId,
    items: value.items.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })),
    ...(common.shipping === null ? {} : { shipping_fee_cents: common.shipping }),
    discount_cents: common.discount,
    source: value.source,
    notes: value.notes,
    internal_notes: value.internalNotes,
    allow_blocked: value.allowBlocked && can.overrideBlocklist,
    ...(value.campaignId ? { campaign_id: value.campaignId } : {})
  } as unknown as Json;

  const { data, error } = await supabase.rpc("create_order", { p_organization_id: organizationId, p_payload: payload });
  if (error || !data) return { error: mapDatabaseError(error) };
  revalidateOrders();
  return { orderId: data.id };
}

export async function updateOrder(orderId: string, input: OrderInput): Promise<OrderResult> {
  if (!z.string().uuid().safeParse(orderId).success) return { error: "NOT_FOUND" };
  const parsed = orderInput.safeParse(input);
  if (!parsed.success) return { error: "INVALID_INPUT" };
  const common = parseCommon(parsed.data);
  if ("error" in common) return { error: common.error };
  const value = parsed.data;

  const { supabase, can } = await requireOrganization();
  if (!can.manageOrders) return { error: "FORBIDDEN" };

  // The phone number identifies the customer and is not editable here.
  const payload = {
    items: value.items.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })),
    ...(value.cityId ? { city_id: value.cityId } : { city: value.cityOther }),
    ...(common.shipping === null ? {} : { shipping_fee_cents: common.shipping }),
    discount_cents: common.discount,
    full_name: value.fullName.trim(),
    address: value.address,
    notes: value.notes,
    internal_notes: value.internalNotes
  } as unknown as Json;

  const { error } = await supabase.rpc("update_order_details", { p_order_id: orderId, p_payload: payload });
  if (error) return { error: mapDatabaseError(error) };
  revalidateOrders(orderId);
  return { orderId };
}

export type ActionResult = { ok?: true; error?: AppErrorCode };

const callInput = z.object({
  orderId: z.string().uuid(),
  outcome: z.enum(callOutcomes as [string, ...string[]]),
  note: z.string().max(1000),
  callBackAt: z.string().datetime({ offset: true }).nullable()
});

export async function logCall(input: z.infer<typeof callInput>): Promise<ActionResult> {
  const parsed = callInput.safeParse(input);
  if (!parsed.success) return { error: "INVALID_INPUT" };
  const value = parsed.data;
  if (value.outcome === "cancelled" && value.note.trim() === "") return { error: "NOTE_REQUIRED" };
  if (value.outcome === "call_back_requested" && !value.callBackAt) return { error: "CALL_BACK_TIME_REQUIRED" };

  const { supabase, can } = await requireOrganization();
  if (!can.manageOrders) return { error: "FORBIDDEN" };
  const { error } = await supabase.rpc("log_call_attempt", {
    p_order_id: value.orderId,
    p_outcome: value.outcome as (typeof callOutcomes)[number],
    p_note: value.note.trim() || undefined,
    p_call_back_at: value.outcome === "call_back_requested" ? (value.callBackAt ?? undefined) : undefined
  });
  if (error) return { error: mapDatabaseError(error) };
  revalidateOrders(value.orderId);
  return { ok: true };
}

const statusInput = z.object({
  orderId: z.string().uuid(),
  to: z.enum(orderStatuses),
  note: z.string().max(2000)
});

// Statuses this step lets the user set by hand. Shipped / delivered / refused
// come from shipments in step 5, so that stock and cash stay consistent.
const manualTargets = new Set(["confirmed", "preparing", "ready_to_ship", "cancelled"]);

export async function changeOrderStatus(input: z.infer<typeof statusInput>): Promise<ActionResult> {
  const parsed = statusInput.safeParse(input);
  if (!parsed.success || !manualTargets.has(parsed.data.to)) return { error: "INVALID_TRANSITION" };
  const value = parsed.data;
  if (value.to === "cancelled" && value.note.trim() === "") return { error: "NOTE_REQUIRED" };

  const { supabase, can } = await requireOrganization();
  const allowed = value.to === "preparing" || value.to === "ready_to_ship" ? can.prepareOrders : can.manageOrders;
  if (!allowed) return { error: "FORBIDDEN" };
  const { error } = await supabase.rpc("transition_order", { p_order_id: value.orderId, p_to: value.to, p_note: value.note.trim() || undefined });
  if (error) return { error: mapDatabaseError(error) };
  revalidateOrders(value.orderId);
  return { ok: true };
}

export async function addOrderNote(orderId: string, note: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(orderId).success) return { error: "NOT_FOUND" };
  const text = String(note ?? "").trim().slice(0, 2000);
  if (!text) return { error: "NOTE_REQUIRED" };
  const { supabase } = await requireOrganization();
  const { error } = await supabase.rpc("add_order_note", { p_order_id: orderId, p_note: text });
  if (error) return { error: mapDatabaseError(error) };
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

export async function blockNumber(phoneInput: string, reasonInput: string): Promise<ActionResult> {
  const phone = normalizeMoroccanPhone(String(phoneInput ?? ""));
  if (!phone) return { error: "PHONE_INVALID" };
  const reason = String(reasonInput ?? "").trim().slice(0, 500);
  if (reason.length < 2) return { error: "REASON_REQUIRED" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.manageOrders) return { error: "FORBIDDEN" };
  const { error } = await supabase.from("customer_blocklist").insert({ organization_id: organizationId, phone, reason });
  if (error) return { error: mapDatabaseError(error) };
  revalidatePath("/customers");
  revalidatePath("/orders", "layout");
  return { ok: true };
}

export async function unblockNumber(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { error: "NOT_FOUND" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  const { error, count } = await supabase.from("customer_blocklist").delete({ count: "exact" }).eq("organization_id", organizationId).eq("id", id);
  if (error) return { error: mapDatabaseError(error) };
  if (!count) return { error: "NOT_FOUND" };
  revalidatePath("/customers");
  revalidatePath("/orders", "layout");
  return { ok: true };
}

const exchangeInput = z.object({
  orderId: z.string().uuid(),
  items: z.array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(1000) })).min(1).max(50),
  priceDifference: z.string().max(20),
  shippingFee: z.string().max(20),
  reason: z.string().trim().min(2).max(500)
});

/** Replacement order for a delivered one; the old item comes back through Returns. */
export async function createExchange(input: z.infer<typeof exchangeInput>): Promise<OrderResult> {
  const parsed = exchangeInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues.some((i) => i.path[0] === "reason") ? "REASON_REQUIRED" : "INVALID_INPUT" };
  const value = parsed.data;
  const difference = value.priceDifference.trim() === "" ? 0 : parseMoneyToCents(value.priceDifference);
  const fee = value.shippingFee.trim() === "" ? 0 : parseMoneyToCents(value.shippingFee);
  if (difference === null) return { error: "INVALID_DISCOUNT" };
  if (fee === null) return { error: "INVALID_SHIPPING_FEE" };
  const { supabase, can } = await requireOrganization();
  if (!can.manageOrders) return { error: "FORBIDDEN" };
  const { data, error } = await supabase.rpc("create_exchange_order", {
    p_order_id: value.orderId,
    p_payload: {
      items: value.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
      price_difference_cents: difference,
      shipping_fee_cents: fee,
      reason: value.reason
    } as unknown as Json
  });
  if (error || !data) return { error: mapDatabaseError(error) };
  revalidateOrders(value.orderId);
  revalidatePath("/returns");
  return { orderId: data.id };
}

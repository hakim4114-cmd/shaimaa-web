"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganization } from "@/lib/data/context";
import { mapDatabaseError, type AppErrorCode } from "@/lib/data/errors";
import { getOrder } from "@/lib/data/orders";
import { getSenditProvider } from "@/lib/data/shipping";
import { normalizeMoroccanPhone } from "@/lib/phone";
import {
  SenditError,
  createDelivery,
  deleteDelivery,
  getDelivery,
  getLabels,
  pickupCities,
  requestPickup,
  searchDistricts,
  senditKeys,
  type SenditDistrict
} from "@/lib/shipping/sendit";
import { buildDeliveryPayload, mapSenditStatus, toSenditPhone, type ShipmentStatus } from "@/lib/shipping/sendit-core";
import type { Json } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ShippingResult<T = undefined> = { ok?: true; data?: T; error?: AppErrorCode; detail?: string };

function fromError(error: unknown): ShippingResult<never> {
  if (error instanceof SenditError) return { error: error.code, detail: error.detail };
  return { error: "UNKNOWN" };
}

function revalidateShipping(orderId?: string) {
  revalidatePath("/shipping");
  revalidatePath("/orders");
  revalidatePath("/inventory");
  if (orderId) revalidatePath(`/orders/${orderId}`);
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function testSenditConnection(): Promise<ShippingResult<{ id: number; name: string; arabicName: string }[]>> {
  const { can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  if (!senditKeys()) return { error: "SENDIT_NOT_CONFIGURED" };
  try {
    return { ok: true, data: await pickupCities() };
  } catch (error) {
    return fromError(error);
  }
}

const settingsInput = z.object({
  pickupDistrictId: z.number().int().positive(),
  pickupCity: z.string().trim().max(80),
  pickupName: z.string().trim().min(2).max(120),
  pickupPhone: z.string().trim().max(30),
  pickupAddress: z.string().trim().min(3).max(250),
  allowOpen: z.boolean(),
  allowTry: z.boolean(),
  active: z.boolean()
});

export async function saveSenditSettings(input: z.infer<typeof settingsInput>): Promise<ShippingResult> {
  const parsed = settingsInput.safeParse(input);
  if (!parsed.success) return { error: "INVALID_INPUT" };
  const value = parsed.data;
  const phone = normalizeMoroccanPhone(value.pickupPhone);
  if (!phone) return { error: "PHONE_INVALID" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };

  const settings = {
    pickup_district_id: value.pickupDistrictId,
    pickup_city: value.pickupCity,
    pickup_name: value.pickupName,
    pickup_phone: phone,
    pickup_address: value.pickupAddress,
    allow_open: value.allowOpen,
    allow_try: value.allowTry
  } as unknown as Json;

  const existing = await getSenditProvider(supabase, organizationId);
  const { error } = existing
    ? await supabase.from("shipping_providers").update({ settings, is_active: value.active }).eq("id", existing.id)
    : await supabase
        .from("shipping_providers")
        .insert({ organization_id: organizationId, name: "Sendit", kind: "api", adapter_key: "sendit", settings, is_active: value.active });
  if (error) return { error: mapDatabaseError(error) };
  revalidatePath("/settings");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Parcels
// ---------------------------------------------------------------------------

export async function searchSenditDistricts(query: string): Promise<ShippingResult<SenditDistrict[]>> {
  const q = String(query ?? "").trim();
  if (q.length < 2) return { ok: true, data: [] };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.prepareOrders) return { error: "FORBIDDEN" };
  const provider = await getSenditProvider(supabase, organizationId);
  try {
    return { ok: true, data: (await searchDistricts(q, provider?.settings.pickupDistrictId ?? null)).slice(0, 30) };
  } catch (error) {
    return fromError(error);
  }
}

const shipInput = z.object({
  orderId: z.string().uuid(),
  district: z.object({ id: z.string().regex(/^\d{1,10}$/), name: z.string().max(160), feeCents: z.number().int().min(0) })
});

export async function shipWithSendit(input: z.infer<typeof shipInput>): Promise<ShippingResult<{ code: string }>> {
  const parsed = shipInput.safeParse(input);
  if (!parsed.success) return { error: "INVALID_INPUT" };
  const { orderId, district } = parsed.data;
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.prepareOrders || !can.seeContacts) return { error: "FORBIDDEN" };

  const provider = await getSenditProvider(supabase, organizationId);
  if (!provider || !provider.isActive) return { error: "SENDIT_NOT_ENABLED" };
  const order = await getOrder(supabase, organizationId, orderId, { withContacts: true, withCalls: false });
  if (!order || !order.contact) return { error: "NOT_FOUND" };
  if (!["confirmed", "preparing", "ready_to_ship"].includes(order.status)) return { error: "ORDER_NOT_SHIPPABLE" };

  const payload = buildDeliveryPayload(
    {
      orderNumber: order.orderNumber,
      fullName: order.contact.fullName,
      phone: order.contact.phone,
      address: [order.contact.address, order.city].filter(Boolean).join(", "),
      codAmountCents: order.codAmountCents,
      notes: order.notes,
      items: order.items
    },
    Number(district.id),
    provider.settings
  );

  let parcel: Awaited<ReturnType<typeof createDelivery>>;
  try {
    parcel = await createDelivery(payload);
  } catch (error) {
    return fromError(error);
  }

  const { error } = await supabase.rpc("register_carrier_shipment", {
    p_order_id: order.id,
    p_provider_id: provider.id,
    p_tracking_number: parcel.code,
    p_shipping_cost_cents: parcel.feeCents || district.feeCents,
    p_carrier: { district_id: district.id, district_name: district.name, status: parcel.status } as unknown as Json
  });
  if (error) {
    // Do not leave a parcel at Sendit that the app does not know about.
    await deleteDelivery(parcel.code).catch(() => undefined);
    return { error: mapDatabaseError(error) };
  }
  revalidateShipping(order.id);
  return { ok: true, data: { code: parcel.code } };
}

const codesInput = z.array(z.string().regex(/^[A-Za-z0-9._/-]{3,64}$/)).min(1).max(100);

export async function senditLabels(codes: string[], thermal: boolean): Promise<ShippingResult<string>> {
  const parsed = codesInput.safeParse(codes);
  if (!parsed.success) return { error: "INVALID_INPUT" };
  const { can } = await requireOrganization();
  if (!can.prepareOrders) return { error: "FORBIDDEN" };
  try {
    return { ok: true, data: await getLabels(parsed.data, Boolean(thermal)) };
  } catch (error) {
    return fromError(error);
  }
}

/** Asks Sendit for the parcel's current status (fallback when a webhook was missed). */
export async function refreshSenditShipment(shipmentId: string): Promise<ShippingResult<string>> {
  if (!z.string().uuid().safeParse(shipmentId).success) return { error: "NOT_FOUND" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.prepareOrders) return { error: "FORBIDDEN" };
  const { data: shipment } = await supabase
    .from("shipments")
    .select("id, order_id, provider_id, tracking_number")
    .eq("organization_id", organizationId)
    .eq("id", shipmentId)
    .maybeSingle();
  if (!shipment?.tracking_number) return { error: "NOT_FOUND" };

  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "SERVICE_KEY_MISSING" };
  try {
    const parcel = await getDelivery(shipment.tracking_number);
    if (!parcel.status) return { error: "SENDIT_UNAVAILABLE" };
    const { error } = await admin.rpc("apply_carrier_event", {
      p_provider_id: shipment.provider_id,
      p_tracking_number: shipment.tracking_number,
      p_carrier_status: parcel.status,
      p_status: (mapSenditStatus(parcel.status) ?? null) as ShipmentStatus,
      p_payload: { source: "refresh", newStatus: parcel.status, lastActionAt: String(parcel.raw.last_action_at ?? parcel.raw.updated_at ?? parcel.status) } as unknown as Json
    });
    if (error) return { error: mapDatabaseError(error) };
    revalidateShipping(shipment.order_id);
    return { ok: true, data: parcel.status };
  } catch (error) {
    return fromError(error);
  }
}

/** Requests one pickup for every Sendit parcel still waiting at the merchant's. */
export async function requestSenditPickup(): Promise<ShippingResult<{ count: number; code: string }>> {
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.prepareOrders) return { error: "FORBIDDEN" };
  const provider = await getSenditProvider(supabase, organizationId);
  if (!provider || !provider.isActive) return { error: "SENDIT_NOT_ENABLED" };
  const s = provider.settings;
  if (!s.pickupDistrictId || !s.pickupName || !s.pickupPhone || !s.pickupAddress) return { error: "SENDIT_PICKUP_INCOMPLETE" };

  const { data } = await supabase
    .from("shipments")
    .select("tracking_number, carrier_status")
    .eq("organization_id", organizationId)
    .eq("provider_id", provider.id)
    .eq("status", "pending");
  const codes = (data ?? [])
    .filter((row) => row.tracking_number && (row.carrier_status === null || row.carrier_status === "PENDING"))
    .map((row) => row.tracking_number as string);
  if (codes.length === 0) return { error: "NOTHING_TO_PICK_UP" };
  try {
    const code = await requestPickup({
      districtId: s.pickupDistrictId,
      name: s.pickupName,
      phone: toSenditPhone(s.pickupPhone),
      address: s.pickupAddress,
      note: "Merchant OS",
      codes
    });
    revalidateShipping();
    return { ok: true, data: { count: codes.length, code } };
  } catch (error) {
    return fromError(error);
  }
}

// ---------------------------------------------------------------------------
// Default shipping fee per city (charged to the customer on manual orders)
// ---------------------------------------------------------------------------

const ratesInput = z.array(z.object({ cityId: z.number().int().positive(), fee: z.string().max(20) })).max(500);

export async function saveShippingRates(input: z.infer<typeof ratesInput>): Promise<ShippingResult<{ saved: number }>> {
  const parsed = ratesInput.safeParse(input);
  if (!parsed.success) return { error: "INVALID_INPUT" };
  const { parseMoneyToCents } = await import("@/lib/money");
  const upserts: { cityId: number; cents: number }[] = [];
  const removals: number[] = [];
  for (const row of parsed.data) {
    if (row.fee.trim() === "") {
      removals.push(row.cityId);
      continue;
    }
    const cents = parseMoneyToCents(row.fee);
    if (cents === null) return { error: "INVALID_SHIPPING_FEE" };
    upserts.push({ cityId: row.cityId, cents });
  }
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };

  if (removals.length) {
    const { error } = await supabase.from("shipping_rates").delete().eq("organization_id", organizationId).is("provider_id", null).in("city_id", removals);
    if (error) return { error: mapDatabaseError(error) };
  }
  for (const row of upserts) {
    const { data: existing } = await supabase
      .from("shipping_rates")
      .select("id")
      .eq("organization_id", organizationId)
      .is("provider_id", null)
      .eq("city_id", row.cityId)
      .maybeSingle();
    const { error } = existing
      ? await supabase.from("shipping_rates").update({ customer_fee_cents: row.cents }).eq("id", existing.id)
      : await supabase.from("shipping_rates").insert({ organization_id: organizationId, city_id: row.cityId, customer_fee_cents: row.cents });
    if (error) return { error: mapDatabaseError(error) };
  }
  revalidatePath("/settings");
  revalidatePath("/orders/new");
  return { ok: true, data: { saved: upserts.length } };
}

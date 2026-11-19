"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganization } from "@/lib/data/context";
import { mapDatabaseError, type AppErrorCode } from "@/lib/data/errors";
import { getOrder, listCities } from "@/lib/data/orders";
import { getSenditProvider } from "@/lib/data/shipping";
import { normalizeMoroccanPhone } from "@/lib/phone";
import {
  SenditError,
  deleteDelivery,
  listDistricts,
  getDelivery,
  getLabels,
  pickupCities,
  requestPickup,
  searchDistricts,
  type SenditDistrict
} from "@/lib/shipping/sendit";
import { matchCityId, senditCityFees, mapSenditStatus, toSenditPhone, type ShipmentStatus } from "@/lib/shipping/sendit-core";
import type { Json } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadSenditKeys } from "@/lib/shipping/sendit-keys";
import { shipOrder } from "@/lib/shipping/ship-order";

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
  const { organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  const keys = await loadSenditKeys(organizationId);
  if (!keys) return { error: "SENDIT_NOT_CONFIGURED" };
  try {
    return { ok: true, data: await pickupCities(keys) };
  } catch (error) {
    return fromError(error);
  }
}

const keysInput = z.object({ publicKey: z.string().trim().min(8).max(300), secretKey: z.string().trim().min(8).max(300) });

/** Saves this organization's own Sendit keys after checking them with Sendit. Stored server-side only. */
export async function saveSenditKeys(input: z.infer<typeof keysInput>): Promise<ShippingResult> {
  const parsed = keysInput.safeParse(input);
  if (!parsed.success) return { error: "KEYS_INCOMPLETE" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  try {
    await pickupCities(parsed.data);
  } catch (error) {
    return fromError(error);
  }
  const { error } = await supabase.rpc("set_sendit_credentials", {
    p_organization_id: organizationId,
    p_public_key: parsed.data.publicKey,
    p_secret_key: parsed.data.secretKey
  });
  if (error) return { error: mapDatabaseError(error) };
  revalidatePath("/settings");
  return { ok: true };
}

const settingsInput = z.object({
  pickupDistrictId: z.number().int().positive(),
  pickupCity: z.string().trim().max(80),
  pickupName: z.string().trim().min(2).max(120),
  pickupPhone: z.string().trim().max(30),
  pickupAddress: z.string().trim().min(3).max(250),
  allowOpen: z.boolean(),
  allowTry: z.boolean(),
  autoShip: z.boolean().default(false),
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
    allow_try: value.allowTry,
    auto_ship: value.autoShip
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
  const [provider, keys] = await Promise.all([getSenditProvider(supabase, organizationId), loadSenditKeys(organizationId)]);
  if (!keys) return { error: "SENDIT_NOT_CONFIGURED" };
  try {
    return { ok: true, data: (await searchDistricts(keys, q, provider?.settings.pickupDistrictId ?? null)).slice(0, 30) };
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
  const ctx = await requireOrganization();
  const { supabase, organizationId, can } = ctx;
  if (!can.prepareOrders || !can.seeContacts) return { error: "FORBIDDEN" };

  const provider = await getSenditProvider(supabase, organizationId);
  if (!provider || !provider.isActive) return { error: "SENDIT_NOT_ENABLED" };
  const keys = await loadSenditKeys(organizationId);
  if (!keys) return { error: "SENDIT_NOT_CONFIGURED" };
  const order = await getOrder(supabase, organizationId, orderId, { withContacts: true, withCalls: false });
  if (!order || !order.contact) return { error: "NOT_FOUND" };

  const outcome = await shipOrder(ctx, provider, keys, order, district);
  if (outcome.error || !outcome.code) return { error: outcome.error ?? "UNKNOWN", detail: outcome.detail };
  revalidateShipping(order.id);
  return { ok: true, data: { code: outcome.code } };
}

const codesInput = z.array(z.string().regex(/^[A-Za-z0-9._/-]{3,64}$/)).min(1).max(100);

export async function senditLabels(codes: string[], thermal: boolean): Promise<ShippingResult<string>> {
  const parsed = codesInput.safeParse(codes);
  if (!parsed.success) return { error: "INVALID_INPUT" };
  const { organizationId, can } = await requireOrganization();
  if (!can.prepareOrders) return { error: "FORBIDDEN" };
  const keys = await loadSenditKeys(organizationId);
  if (!keys) return { error: "SENDIT_NOT_CONFIGURED" };
  try {
    return { ok: true, data: await getLabels(keys, parsed.data, Boolean(thermal)) };
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
  const keys = await loadSenditKeys(organizationId);
  if (!keys) return { error: "SENDIT_NOT_CONFIGURED" };
  try {
    const parcel = await getDelivery(keys, shipment.tracking_number);
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

/**
 * Cancels a Sendit parcel that was not picked up yet: deletes it at Sendit
 * (already deleted there is fine), then cancels it here; the order goes back
 * to "preparing" and can be shipped again.
 */
export async function cancelSenditParcel(shipmentId: string, options: { cancelOrder?: boolean; reason?: string } = {}): Promise<ShippingResult> {
  if (!z.string().uuid().safeParse(shipmentId).success) return { error: "NOT_FOUND" };
  const reason = String(options.reason ?? "").trim().slice(0, 1000);
  if (options.cancelOrder && !reason) return { error: "NOTE_REQUIRED" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.prepareOrders) return { error: "FORBIDDEN" };
  const { data: shipment } = await supabase
    .from("shipments")
    .select("id, order_id, status, tracking_number")
    .eq("organization_id", organizationId)
    .eq("id", shipmentId)
    .maybeSingle();
  if (!shipment?.tracking_number) return { error: "NOT_FOUND" };
  if (shipment.status !== "pending") return { error: "SHIPMENT_CLOSED" };
  const keys = await loadSenditKeys(organizationId);
  if (!keys) return { error: "SENDIT_NOT_CONFIGURED" };
  try {
    await deleteDelivery(keys, shipment.tracking_number);
  } catch (error) {
    const gone = error instanceof SenditError && error.code === "SENDIT_REJECTED" && /non trouv|not found|introuvable/i.test(error.detail ?? "");
    if (!gone) return fromError(error);
  }
  const { error } = await supabase.rpc("update_shipment_status", { p_shipment_id: shipment.id, p_status: "cancelled", p_note: "Cancelled before pickup (Sendit)" });
  if (error) return { error: mapDatabaseError(error) };
  if (options.cancelOrder) {
    // The customer no longer wants it: cancel the order too, which releases the reserved stock.
    if (!can.manageOrders) {
      revalidateShipping(shipment.order_id);
      return { error: "FORBIDDEN", detail: "parcel cancelled; the order needs an owner, admin or operator to cancel it" };
    }
    const { error: orderError } = await supabase.rpc("transition_order", { p_order_id: shipment.order_id, p_to: "cancelled", p_note: reason });
    if (orderError) {
      revalidateShipping(shipment.order_id);
      return { error: mapDatabaseError(orderError) };
    }
  }
  revalidateShipping(shipment.order_id);
  return { ok: true };
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
  const keys = await loadSenditKeys(organizationId);
  if (!keys) return { error: "SENDIT_NOT_CONFIGURED" };
  try {
    const code = await requestPickup(keys, {
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


const importInput = z.object({
  // keep: only record Sendit's cost; fill_empty: set the customer fee where none is set; overwrite: set it everywhere.
  customerFee: z.enum(["keep", "fill_empty", "overwrite"]),
  extraMad: z.number().min(0).max(500).default(0),
  // Add the Sendit cities missing from the city list as this organization's own cities.
  addMissing: z.boolean().default(true)
});

/**
 * Imports Sendit's fee per city (for this pickup city): stored as the Sendit
 * cost of each city, and optionally as the fee charged to the customer.
 */
export async function importSenditRates(
  input: z.infer<typeof importInput>
): Promise<ShippingResult<{ matched: number; customerFeesSet: number; unmatched: string[]; senditCities: number }>> {
  const parsed = importInput.safeParse(input);
  if (!parsed.success) return { error: "INVALID_INPUT" };
  const { customerFee, extraMad, addMissing } = parsed.data;
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  const provider = await getSenditProvider(supabase, organizationId);
  if (!provider) return { error: "SENDIT_NOT_ENABLED" };
  const keys = await loadSenditKeys(organizationId);
  if (!keys) return { error: "SENDIT_NOT_CONFIGURED" };

  const districts: SenditDistrict[] = [];
  try {
    let page = 1;
    let last = 1;
    do {
      const result = await listDistricts(keys, page, provider.settings.pickupDistrictId);
      districts.push(...result.districts);
      last = result.lastPage;
      page += 1;
      if (result.districts.length === 0) break;
    } while (page <= last && page <= 80);
  } catch (error) {
    return fromError(error);
  }

  let cities = await listCities(supabase);
  const fees = senditCityFees(districts);
  if (addMissing) {
    const seen = new Set<string>();
    const missing = fees
      .filter((row) => matchCityId(row.city, cities) === null)
      .map((row) => row.city.trim().slice(0, 80))
      .filter((name) => name.length >= 2 && !seen.has(name.toLowerCase()) && seen.add(name.toLowerCase()));
    for (let i = 0; i < missing.length; i += 200) {
      const chunk = missing.slice(i, i + 200).map((name) => ({ organization_id: organizationId, name_fr: name, name_ar: name, region: "", aliases: [] }));
      const { error } = await supabase.from("cities").insert(chunk);
      if (error) return { error: mapDatabaseError(error) };
    }
    if (missing.length) cities = await listCities(supabase);
  }
  const matched = new Map<number, number>();
  const unmatched: string[] = [];
  for (const row of fees) {
    const cityId = matchCityId(row.city, cities);
    if (cityId === null) unmatched.push(row.city);
    else if (!matched.has(cityId)) matched.set(cityId, row.feeCents);
  }

  const { data: existing } = await supabase
    .from("shipping_rates")
    .select("id, city_id, provider_id")
    .eq("organization_id", organizationId)
    .or(`provider_id.is.null,provider_id.eq.${provider.id}`);
  const providerRow = new Map((existing ?? []).filter((r) => r.provider_id === provider.id).map((r) => [r.city_id, r.id]));
  const defaultRow = new Map((existing ?? []).filter((r) => r.provider_id === null).map((r) => [r.city_id, r.id]));
  const extra = Math.round(extraMad * 100);
  let customerFeesSet = 0;

  for (const [cityId, cents] of matched) {
    const costId = providerRow.get(cityId);
    const { error } = costId
      ? await supabase.from("shipping_rates").update({ carrier_cost_cents: cents }).eq("id", costId)
      : await supabase.from("shipping_rates").insert({ organization_id: organizationId, provider_id: provider.id, city_id: cityId, customer_fee_cents: 0, carrier_cost_cents: cents });
    if (error) return { error: mapDatabaseError(error) };

    if (customerFee === "keep") continue;
    const feeId = defaultRow.get(cityId);
    if (feeId && customerFee === "fill_empty") continue;
    const { error: feeError } = feeId
      ? await supabase.from("shipping_rates").update({ customer_fee_cents: cents + extra }).eq("id", feeId)
      : await supabase.from("shipping_rates").insert({ organization_id: organizationId, city_id: cityId, customer_fee_cents: cents + extra });
    if (feeError) return { error: mapDatabaseError(feeError) };
    customerFeesSet += 1;
  }

  revalidatePath("/settings");
  revalidatePath("/orders/new");
  return { ok: true, data: { matched: matched.size, customerFeesSet, unmatched: unmatched.slice(0, 30), senditCities: fees.length } };
}


/** Organization default: product prices include delivery (true) or the customer pays the city fee (false). */
export async function saveDeliveryPricing(included: boolean): Promise<ShippingResult> {
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  const { error } = await supabase.from("organizations").update({ delivery_included: Boolean(included) }).eq("id", organizationId);
  if (error) return { error: mapDatabaseError(error) };
  revalidatePath("/settings");
  revalidatePath("/orders/new");
  return { ok: true };
}

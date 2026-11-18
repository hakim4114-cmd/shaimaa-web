import "server-only";
import type { AppErrorCode } from "@/lib/data/errors";
import { mapDatabaseError } from "@/lib/data/errors";
import type { requireOrganization } from "@/lib/data/context";
import { getOrder, type OrderDetail } from "@/lib/data/orders";
import { getSenditProvider, type SenditProvider } from "@/lib/data/shipping";
import type { Json } from "@/lib/supabase/database.types";
import { SenditError, createDelivery, deleteDelivery, searchDistricts, type SenditKeys } from "./sendit";
import { buildDeliveryPayload, pickDistrictForCity } from "./sendit-core";
import { loadSenditKeys } from "./sendit-keys";

type Ctx = Awaited<ReturnType<typeof requireOrganization>>;
export type District = { id: string; name: string; feeCents: number };
export type ShipOutcome = { code?: string; error?: AppErrorCode; detail?: string };

/**
 * Creates the Sendit parcel for a confirmed order and registers it. Shared by
 * the manual "Ship with Sendit" button and automatic sending on confirmation.
 * The district chosen is remembered for the order's city.
 */
export async function shipOrder(ctx: Ctx, provider: SenditProvider, keys: SenditKeys, order: OrderDetail, district: District): Promise<ShipOutcome> {
  const { supabase, organizationId } = ctx;
  if (!order.contact) return { error: "NOT_FOUND" };
  if (!["confirmed", "preparing", "ready_to_ship"].includes(order.status)) return { error: "ORDER_NOT_SHIPPABLE" };

  // Exchange replacement: tell Sendit which parcel to bring back.
  const { data: link } = await supabase.from("orders").select("exchange_of_order_id").eq("id", order.id).maybeSingle();
  let exchangeOfCode: string | null = null;
  if (link?.exchange_of_order_id) {
    const { data: original } = await supabase
      .from("shipments")
      .select("tracking_number")
      .eq("order_id", link.exchange_of_order_id)
      .eq("provider_id", provider.id)
      .neq("status", "cancelled")
      .maybeSingle();
    exchangeOfCode = original?.tracking_number ?? null;
  }

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
    provider.settings,
    exchangeOfCode
  );

  let parcel: Awaited<ReturnType<typeof createDelivery>>;
  try {
    parcel = await createDelivery(keys, payload);
  } catch (error) {
    return error instanceof SenditError ? { error: error.code, detail: error.detail } : { error: "UNKNOWN" };
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
    await deleteDelivery(keys, parcel.code).catch(() => undefined);
    return { error: mapDatabaseError(error) };
  }

  if (order.cityId !== null) {
    await supabase.from("carrier_city_districts").upsert(
      { provider_id: provider.id, city_id: order.cityId, organization_id: organizationId, district_id: district.id, district_name: district.name.slice(0, 160), updated_at: new Date().toISOString() },
      { onConflict: "provider_id,city_id" }
    );
  }
  return { code: parcel.code };
}

export type AutoShipResult =
  | { status: "off" }
  | { status: "shipped"; code: string; district: string }
  | { status: "skipped"; reason: "district_unknown" | "no_keys" | "not_allowed" }
  | { status: "failed"; error: AppErrorCode; detail?: string };

/** After a confirmation: sends the parcel when the merchant turned it on and the district is certain. */
export async function autoShipAfterConfirmation(ctx: Ctx, orderId: string): Promise<AutoShipResult> {
  const { supabase, organizationId, can } = ctx;
  const provider = await getSenditProvider(supabase, organizationId);
  if (!provider || !provider.isActive || !provider.settings.autoShip) return { status: "off" };
  if (!can.prepareOrders || !can.seeContacts) return { status: "skipped", reason: "not_allowed" };
  const keys = await loadSenditKeys(organizationId);
  if (!keys) return { status: "skipped", reason: "no_keys" };
  const order = await getOrder(supabase, organizationId, orderId, { withContacts: true, withCalls: false });
  if (!order || order.status !== "confirmed") return { status: "off" };

  let district: District | null = null;
  if (order.cityId !== null) {
    const { data } = await supabase
      .from("carrier_city_districts")
      .select("district_id, district_name")
      .eq("provider_id", provider.id)
      .eq("city_id", order.cityId)
      .maybeSingle();
    if (data) district = { id: data.district_id, name: data.district_name, feeCents: 0 };
  }
  if (!district && order.city.trim()) {
    try {
      const found = pickDistrictForCity(order.city, await searchDistricts(keys, order.city, provider.settings.pickupDistrictId));
      if (found) district = { id: found.id, name: found.name, feeCents: found.feeCents };
    } catch {
      // Lookup failed: leave it for manual shipping.
    }
  }
  if (!district) return { status: "skipped", reason: "district_unknown" };

  const outcome = await shipOrder(ctx, provider, keys, order, district);
  if (outcome.error || !outcome.code) return { status: "failed", error: outcome.error ?? "UNKNOWN", detail: outcome.detail };
  await supabase.rpc("add_order_note", { p_order_id: order.id, p_note: `Sendit: ${outcome.code} (auto, ${district.name})` });
  return { status: "shipped", code: outcome.code, district: district.name };
}

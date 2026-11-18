import "server-only";
import { readSenditSettings, type SenditSettings } from "@/lib/shipping/sendit-core";
import type { Database } from "@/lib/supabase/database.types";
import type { requireOrganization } from "./context";

type Client = Awaited<ReturnType<typeof requireOrganization>>["supabase"];
export type ShipmentStatus = Database["public"]["Enums"]["shipment_status"];

export type SenditProvider = { id: string; isActive: boolean; credentialsSet: boolean; settings: SenditSettings };

export async function getSenditProvider(supabase: Client, organizationId: string): Promise<SenditProvider | null> {
  const { data } = await supabase
    .from("shipping_providers")
    .select("id, is_active, credentials_set, settings")
    .eq("organization_id", organizationId)
    .eq("adapter_key", "sendit")
    .maybeSingle();
  return data ? { id: data.id, isActive: data.is_active, credentialsSet: data.credentials_set, settings: readSenditSettings(data.settings) } : null;
}

export type ShipmentRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  city: string;
  trackingNumber: string | null;
  status: ShipmentStatus;
  carrierStatus: string | null;
  carrierMessage: string | null;
  carrierDistrictName: string | null;
  deliverBy: string | null;
  unreachableCount: number;
  proofUrl: string | null;
  shippingCostCents: number;
  codAmountCents: number;
  isSendit: boolean;
  createdAt: string;
  carrierUpdatedAt: string | null;
};

type RawShipment = {
  id: string;
  order_id: string;
  tracking_number: string | null;
  status: ShipmentStatus;
  carrier_status: string | null;
  carrier_message: string | null;
  carrier_district_name: string | null;
  deliver_by: string | null;
  unreachable_count: number;
  proof_url: string | null;
  shipping_cost_cents: number;
  cod_amount_cents: number;
  created_at: string;
  carrier_updated_at: string | null;
  provider: { adapter_key: string | null } | null;
  order: { order_number: string; city: string; contact?: { full_name: string } | { full_name: string }[] | null } | null;
};

const shipmentSelect =
  "id, order_id, tracking_number, status, carrier_status, carrier_message, carrier_district_name, deliver_by, unreachable_count, proof_url, shipping_cost_cents, cod_amount_cents, created_at, carrier_updated_at, provider:shipping_providers(adapter_key)";

function toRow(raw: RawShipment): ShipmentRow {
  const contact = Array.isArray(raw.order?.contact) ? raw.order?.contact[0] : raw.order?.contact;
  return {
    id: raw.id,
    orderId: raw.order_id,
    orderNumber: raw.order?.order_number ?? "",
    customerName: contact?.full_name ?? null,
    city: raw.order?.city ?? "",
    trackingNumber: raw.tracking_number,
    status: raw.status,
    carrierStatus: raw.carrier_status,
    carrierMessage: raw.carrier_message,
    carrierDistrictName: raw.carrier_district_name,
    deliverBy: raw.deliver_by,
    unreachableCount: raw.unreachable_count,
    proofUrl: raw.proof_url,
    shippingCostCents: raw.shipping_cost_cents,
    codAmountCents: raw.cod_amount_cents,
    isSendit: raw.provider?.adapter_key === "sendit",
    createdAt: raw.created_at,
    carrierUpdatedAt: raw.carrier_updated_at
  };
}

export async function getActiveShipment(supabase: Client, organizationId: string, orderId: string): Promise<ShipmentRow | null> {
  const { data } = await supabase
    .from("shipments")
    .select(shipmentSelect)
    .eq("organization_id", organizationId)
    .eq("order_id", orderId)
    .neq("status", "cancelled")
    .maybeSingle()
    .overrideTypes<RawShipment, { merge: false }>();
  return data ? toRow(data) : null;
}

export const shipmentViews = ["to_pickup", "in_transit", "problems", "done", "all"] as const;
export type ShipmentView = (typeof shipmentViews)[number];

const viewFilter: Record<ShipmentView, ShipmentStatus[] | null> = {
  to_pickup: ["pending"],
  in_transit: ["picked_up", "in_transit", "out_for_delivery"],
  problems: ["failed_attempt"],
  done: ["delivered", "returned_to_sender", "cancelled"],
  all: null
};

export async function listShipments(supabase: Client, organizationId: string, view: ShipmentView, withContacts: boolean): Promise<ShipmentRow[]> {
  const select = `${shipmentSelect}, order:orders(order_number, city${withContacts ? ", contact:order_contacts(full_name)" : ""})`;
  let query = supabase.from("shipments").select(select).eq("organization_id", organizationId);
  const statuses = viewFilter[view];
  if (statuses) query = query.in("status", statuses);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(300).overrideTypes<RawShipment[], { merge: false }>();
  if (error) throw new Error("SHIPMENTS_UNAVAILABLE");
  return (data ?? []).map(toRow);
}

export async function countShipments(supabase: Client, organizationId: string) {
  const { data } = await supabase.from("shipments").select("status").eq("organization_id", organizationId).in("status", ["pending", "failed_attempt", "picked_up", "in_transit", "out_for_delivery"]);
  const counts = { to_pickup: 0, in_transit: 0, problems: 0 };
  for (const row of data ?? []) {
    if (row.status === "pending") counts.to_pickup += 1;
    else if (row.status === "failed_attempt") counts.problems += 1;
    else counts.in_transit += 1;
  }
  return counts;
}

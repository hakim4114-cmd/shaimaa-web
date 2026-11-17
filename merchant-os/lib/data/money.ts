import "server-only";
import type { Database } from "@/lib/supabase/database.types";
import type { requireOrganization } from "./context";

type Client = Awaited<ReturnType<typeof requireOrganization>>["supabase"];
export type ExpenseCategory = Database["public"]["Enums"]["expense_category"];
export type MarketingPlatform = Database["public"]["Enums"]["marketing_platform"];

export const expenseCategories: readonly ExpenseCategory[] = [
  "advertising",
  "packaging",
  "shipping",
  "inventory_purchase",
  "production",
  "salaries",
  "rent",
  "software",
  "other"
];
export const marketingPlatforms: readonly MarketingPlatform[] = ["meta", "instagram", "tiktok", "google", "whatsapp", "website", "other"];

export type Report = {
  ordersCreated: number;
  ordersCancelled: number;
  ordersConfirmed: number;
  bookedValueCents: number;
  ordersShipped: number;
  ordersDelivered: number;
  ordersRefused: number;
  ordersReturned: number;
  deliveredRevenueCents: number;
  refundsCents: number;
  netRevenueCents: number;
  cogsCents: number;
  costMissingLines: number;
  shippingCostCents: number;
  operatingExpensesCents: number;
  advertisingCents: number;
  netProfitCents: number;
  cashCollectedCents: number;
  codReceivableCents: number;
  cashOutCents: number;
  confirmationRate: number | null;
  returnRate: number | null;
  costPerDeliveredCents: number | null;
};

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const opt = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function getReport(supabase: Client, organizationId: string, from: string, to: string): Promise<Report | null> {
  const { data, error } = await supabase.rpc("report_summary", { p_organization_id: organizationId, p_from: from, p_to: to });
  if (error || !data || typeof data !== "object") return null;
  const r = data as Record<string, unknown>;
  return {
    ordersCreated: num(r.orders_created),
    ordersCancelled: num(r.orders_cancelled),
    ordersConfirmed: num(r.orders_confirmed),
    bookedValueCents: num(r.booked_value_cents),
    ordersShipped: num(r.orders_shipped),
    ordersDelivered: num(r.orders_delivered),
    ordersRefused: num(r.orders_refused),
    ordersReturned: num(r.orders_returned),
    deliveredRevenueCents: num(r.delivered_revenue_cents),
    refundsCents: num(r.refunds_cents),
    netRevenueCents: num(r.net_revenue_cents),
    cogsCents: num(r.cogs_cents),
    costMissingLines: num(r.cost_missing_lines),
    shippingCostCents: num(r.shipping_cost_cents),
    operatingExpensesCents: num(r.operating_expenses_cents),
    advertisingCents: num(r.advertising_cents),
    netProfitCents: num(r.net_profit_cents),
    cashCollectedCents: num(r.cash_collected_cents),
    codReceivableCents: num(r.cod_receivable_cents),
    cashOutCents: num(r.cash_out_cents),
    confirmationRate: opt(r.confirmation_rate),
    returnRate: opt(r.return_rate),
    costPerDeliveredCents: opt(r.cost_per_delivered_cents)
  };
}

export type CampaignRow = {
  campaignId: string | null;
  name: string | null;
  platform: MarketingPlatform | null;
  spendCents: number;
  orders: number;
  confirmed: number;
  delivered: number;
  refused: number;
  deliveredRevenueCents: number;
};

export async function getCampaignReport(supabase: Client, organizationId: string, from: string, to: string): Promise<CampaignRow[]> {
  const { data, error } = await supabase.rpc("campaign_report", { p_organization_id: organizationId, p_from: from, p_to: to });
  if (error) return [];
  return (data ?? []).map((row) => ({
    campaignId: row.campaign_id,
    name: row.name,
    platform: row.platform,
    spendCents: num(row.spend_cents),
    orders: num(row.orders),
    confirmed: num(row.confirmed),
    delivered: num(row.delivered),
    refused: num(row.refused),
    deliveredRevenueCents: num(row.delivered_revenue_cents)
  }));
}

export type Campaign = { id: string; name: string; platform: MarketingPlatform; startsOn: string | null; endsOn: string | null };

export async function listCampaigns(supabase: Client, organizationId: string): Promise<Campaign[]> {
  const { data } = await supabase
    .from("marketing_campaigns")
    .select("id, name, platform, starts_on, ends_on")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, platform: row.platform, startsOn: row.starts_on, endsOn: row.ends_on }));
}

export type Expense = { id: string; category: ExpenseCategory; amountCents: number; incurredOn: string; description: string; campaignName: string | null };

export async function listExpenses(supabase: Client, organizationId: string, from: string, to: string): Promise<Expense[]> {
  const { data } = await supabase
    .from("expenses")
    .select("id, category, amount_cents, incurred_on, description, campaign:marketing_campaigns(name)")
    .eq("organization_id", organizationId)
    .gte("incurred_on", from)
    .lte("incurred_on", to)
    .order("incurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500)
    .overrideTypes<{ id: string; category: ExpenseCategory; amount_cents: number; incurred_on: string; description: string; campaign: { name: string } | null }[], { merge: false }>();
  return (data ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    amountCents: row.amount_cents,
    incurredOn: row.incurred_on,
    description: row.description,
    campaignName: row.campaign?.name ?? null
  }));
}

export type ReturnStatus = Database["public"]["Enums"]["return_status"];
export type ItemCondition = Database["public"]["Enums"]["item_condition"];

export type ReturnRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  kind: Database["public"]["Enums"]["return_kind"];
  status: ReturnStatus;
  reason: string;
  returnShippingFeeCents: number;
  createdAt: string;
  items: { id: string; productName: string; variantTitle: string; quantity: number; condition: ItemCondition }[];
};

export async function listReturns(supabase: Client, organizationId: string, open: boolean): Promise<ReturnRow[]> {
  let query = supabase
    .from("returns")
    .select(
      "id, order_id, kind, status, reason, return_shipping_fee_cents, created_at, order:orders(order_number), items:return_items(id, quantity, condition, line:order_items(product_name, variant_title))"
    )
    .eq("organization_id", organizationId);
  query = open ? query.neq("status", "closed") : query.eq("status", "closed");
  const { data, error } = await query
    .order("created_at", { ascending: !open })
    .limit(200)
    .overrideTypes<
      {
        id: string;
        order_id: string;
        kind: ReturnRow["kind"];
        status: ReturnStatus;
        reason: string;
        return_shipping_fee_cents: number;
        created_at: string;
        order: { order_number: string } | null;
        items: { id: string; quantity: number; condition: ItemCondition; line: { product_name: string; variant_title: string } | null }[];
      }[],
      { merge: false }
    >();
  if (error) throw new Error("RETURNS_UNAVAILABLE");
  return (data ?? []).map((row) => ({
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.order?.order_number ?? "",
    kind: row.kind,
    status: row.status,
    reason: row.reason,
    returnShippingFeeCents: row.return_shipping_fee_cents,
    createdAt: row.created_at,
    items: row.items.map((item) => ({
      id: item.id,
      productName: item.line?.product_name ?? "",
      variantTitle: item.line?.variant_title ?? "",
      quantity: item.quantity,
      condition: item.condition
    }))
  }));
}

export type ReceivableRow = { orderId: string; orderNumber: string; codAmountCents: number; deliveredAt: string | null; trackingNumber: string | null };

export async function listReceivable(supabase: Client, organizationId: string): Promise<ReceivableRow[]> {
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, cod_amount_cents, delivered_at, shipments(tracking_number, status)")
    .eq("organization_id", organizationId)
    .eq("payment_status", "awaiting_remittance")
    .order("delivered_at", { ascending: true })
    .limit(500)
    .overrideTypes<{ id: string; order_number: string; cod_amount_cents: number; delivered_at: string | null; shipments: { tracking_number: string | null; status: string }[] }[], { merge: false }>();
  return (data ?? []).map((row) => ({
    orderId: row.id,
    orderNumber: row.order_number,
    codAmountCents: row.cod_amount_cents,
    deliveredAt: row.delivered_at,
    trackingNumber: row.shipments.find((s) => s.status !== "cancelled")?.tracking_number ?? null
  }));
}

export type RemittanceRow = { id: string; reference: string; receivedOn: string; grossCents: number; feesCents: number; otherCents: number; netCents: number; items: number };

export async function listRemittances(supabase: Client, organizationId: string): Promise<RemittanceRow[]> {
  const { data } = await supabase
    .from("cod_remittances")
    .select("id, reference, received_on, gross_collected_cents, fees_cents, other_charges_cents, net_received_cents, items:cod_remittance_items(count)")
    .eq("organization_id", organizationId)
    .order("received_on", { ascending: false })
    .limit(100)
    .overrideTypes<
      { id: string; reference: string; received_on: string; gross_collected_cents: number; fees_cents: number; other_charges_cents: number; net_received_cents: number; items: { count: number }[] }[],
      { merge: false }
    >();
  return (data ?? []).map((row) => ({
    id: row.id,
    reference: row.reference,
    receivedOn: row.received_on,
    grossCents: row.gross_collected_cents,
    feesCents: row.fees_cents,
    otherCents: row.other_charges_cents,
    netCents: row.net_received_cents,
    items: row.items?.[0]?.count ?? 0
  }));
}

/** What needs doing today: counts only, readable by every role that sees them. */
export async function getTodayCounts(supabase: Client, organizationId: string) {
  const nowIso = new Date().toISOString();
  const head = { count: "exact" as const, head: true };
  const [callsDue, toPrepare, ready, problems, returnsWaiting] = await Promise.all([
    supabase.from("orders").select("id", head).eq("organization_id", organizationId).in("status", ["new", "confirmation_pending"]).or(`next_call_at.is.null,next_call_at.lte.${nowIso}`),
    supabase.from("orders").select("id", head).eq("organization_id", organizationId).in("status", ["confirmed", "preparing"]),
    supabase.from("shipments").select("id", head).eq("organization_id", organizationId).eq("status", "pending"),
    supabase.from("shipments").select("id", head).eq("organization_id", organizationId).eq("status", "failed_attempt"),
    supabase.from("returns").select("id", head).eq("organization_id", organizationId).eq("status", "awaiting_receipt")
  ]);
  return {
    callsDue: callsDue.count ?? 0,
    toPrepare: toPrepare.count ?? 0,
    toPickUp: ready.count ?? 0,
    deliveryProblems: problems.count ?? 0,
    returnsWaiting: returnsWaiting.count ?? 0
  };
}

import "server-only";
import { getReport } from "./money";
import type { requireOrganization } from "./context";
import { resolveRange } from "@/lib/ranges";

type Client = Awaited<ReturnType<typeof requireOrganization>>["supabase"];

export type Assumption = { value: number; source: "data" | "estimate"; sample?: number };
export type PricingDefaults = {
  confirmationRate: Assumption;
  deliveryRate: Assumption;
  carrierFee: Assumption;
  shippingCharged: Assumption;
  adCostPerOrder: Assumption;
  packaging: Assumption;
};

const MIN_SAMPLE = 20;

/** Starting assumptions from the merchant's own history; market estimates when there is not enough data yet. */
export async function getPricingDefaults(supabase: Client, organizationId: string): Promise<PricingDefaults> {
  const { to } = resolveRange("today");
  const from90 = new Date(`${to}T12:00:00Z`);
  from90.setUTCDate(from90.getUTCDate() - 89);
  const from = from90.toISOString().slice(0, 10);
  const since = new Date(Date.now() - 90 * 86400000).toISOString();

  const [report, shipments, rates] = await Promise.all([
    getReport(supabase, organizationId, from, to),
    supabase.from("shipments").select("shipping_cost_cents").eq("organization_id", organizationId).gte("created_at", since).neq("status", "cancelled").limit(1000),
    supabase.from("shipping_rates").select("customer_fee_cents").eq("organization_id", organizationId).is("provider_id", null)
  ]);
  const { data: packaging } = await supabase.from("expenses").select("amount_cents").eq("organization_id", organizationId).eq("category", "packaging").gte("incurred_on", from);

  const created = report?.ordersCreated ?? 0;
  const outcomes = (report?.ordersDelivered ?? 0) + (report?.ordersRefused ?? 0) + (report?.ordersReturned ?? 0);
  const fees = (shipments.data ?? []).map((s) => s.shipping_cost_cents).filter((c) => c > 0);
  const charged = (rates.data ?? []).map((r) => r.customer_fee_cents).sort((a, b) => a - b);
  const shipped = report?.ordersShipped ?? 0;
  const packagingTotal = (packaging ?? []).reduce((s, e) => s + e.amount_cents, 0);

  return {
    confirmationRate: created >= MIN_SAMPLE ? { value: (report?.ordersConfirmed ?? 0) / created, source: "data", sample: created } : { value: 0.65, source: "estimate" },
    deliveryRate: outcomes >= MIN_SAMPLE ? { value: (report?.ordersDelivered ?? 0) / outcomes, source: "data", sample: outcomes } : { value: 0.7, source: "estimate" },
    carrierFee: fees.length >= 5 ? { value: fees.reduce((s, c) => s + c, 0) / fees.length / 100, source: "data", sample: fees.length } : { value: 35, source: "estimate" },
    shippingCharged: charged.length ? { value: (charged[Math.floor(charged.length / 2)] ?? 0) / 100, source: "data", sample: charged.length } : { value: 35, source: "estimate" },
    adCostPerOrder:
      created >= MIN_SAMPLE && (report?.advertisingCents ?? 0) > 0 ? { value: (report?.advertisingCents ?? 0) / created / 100, source: "data", sample: created } : { value: 20, source: "estimate" },
    packaging: shipped >= 10 && packagingTotal > 0 ? { value: packagingTotal / shipped / 100, source: "data", sample: shipped } : { value: 5, source: "estimate" }
  };
}

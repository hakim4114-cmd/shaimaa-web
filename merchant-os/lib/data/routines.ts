import "server-only";
import type { requireOrganization } from "./context";
export { allocate } from "./routines-math";
import type { FundLine } from "./routines-math";

type Client = Awaited<ReturnType<typeof requireOrganization>>["supabase"];

export type Decision = { id: string; weekStart: string; decision: string; reason: string; metric: string; outcome: "worked" | "did_not_work" | "too_early" | null };

export async function listDecisions(supabase: Client, organizationId: string): Promise<Decision[]> {
  const { data } = await supabase
    .from("owner_decisions")
    .select("id, week_start, decision, reason, metric, outcome")
    .eq("organization_id", organizationId)
    .order("week_start", { ascending: false })
    .limit(30);
  return (data ?? []).map((d) => ({ id: d.id, weekStart: d.week_start, decision: d.decision, reason: d.reason, metric: d.metric, outcome: d.outcome as Decision["outcome"] }));
}

export type StockHealthRow = { variantId: string; label: string; onHand: number; valueCents: number | null; idleDays: number | null };

/** idleDays: days since the last outbound movement (or since first receipt when never sold). */
export async function getStockHealth(supabase: Client, organizationId: string): Promise<StockHealthRow[]> {
  const { data } = await supabase.rpc("stock_health", { p_organization_id: organizationId });
  const now = Date.now();
  return (data ?? []).map((r) => {
    const ref = r.last_outbound_at ?? r.first_receipt_at;
    return {
      variantId: r.variant_id,
      label: `${r.product_name}${r.variant_title ? ` — ${r.variant_title}` : ""} (${r.sku})`,
      onHand: r.on_hand,
      valueCents: r.value_cents,
      idleDays: ref ? Math.floor((now - Date.parse(ref)) / 86400000) : null
    };
  });
}

export type { FundLine };

export async function getFundPlan(supabase: Client, organizationId: string): Promise<FundLine[]> {
  const { data } = await supabase.from("fund_plan").select("id, name, percent").eq("organization_id", organizationId).order("position");
  return (data ?? []).map((f) => ({ id: f.id, name: f.name, percent: Number(f.percent) }));
}

export async function getMonthlyClose(supabase: Client, organizationId: string, month: string) {
  const { data } = await supabase.from("monthly_closes").select("net_profit_cents, allocations, closed_at").eq("organization_id", organizationId).eq("month", month).maybeSingle();
  if (!data) return null;
  const allocations = Array.isArray(data.allocations) ? (data.allocations as { name: string; cents: number }[]) : [];
  return { netProfitCents: data.net_profit_cents, allocations, closedAt: data.closed_at };
}


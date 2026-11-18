import "server-only";
import { businessDay } from "@/lib/datetime";
import type { requireOrganization } from "./context";

type Ctx = Awaited<ReturnType<typeof requireOrganization>>;

export type AlertKey = "obligationsOverdue" | "obligationsSoon" | "callsDue" | "deliveryProblems" | "returnsWaiting" | "lowStock" | "storeOrders";
export type Alert = { key: AlertKey; count: number; href: string; tone: "danger" | "warning" | "info" };

function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** What needs attention, for the bell. Only what the role may see; zero counts are left out. */
export async function getAlerts({ supabase, organizationId, can }: Ctx): Promise<Alert[]> {
  const today = businessDay(new Date());
  const head = { count: "exact" as const, head: true };
  const nowIso = new Date().toISOString();
  const queries = await Promise.all([
    can.seeMoney ? supabase.from("payables").select("id", head).eq("organization_id", organizationId).is("paid_on", null).lt("due_on", today) : null,
    can.seeMoney ? supabase.from("payables").select("id", head).eq("organization_id", organizationId).is("paid_on", null).gte("due_on", today).lte("due_on", addDays(today, 7)) : null,
    can.manageOrders ? supabase.from("orders").select("id", head).eq("organization_id", organizationId).in("status", ["new", "confirmation_pending"]).or(`next_call_at.is.null,next_call_at.lte.${nowIso}`) : null,
    supabase.from("shipments").select("id", head).eq("organization_id", organizationId).eq("status", "failed_attempt"),
    supabase.from("returns").select("id", head).eq("organization_id", organizationId).eq("status", "awaiting_receipt"),
    can.manageOrders ? supabase.from("external_orders").select("id", head).eq("organization_id", organizationId).eq("status", "needs_attention") : null,
    supabase.from("inventory_levels").select("variant_id, available, variant:product_variants!inner(min_stock_level, status)").eq("organization_id", organizationId).eq("variant.status", "active")
  ]);
  const count = (q: (typeof queries)[number]) => (q && "count" in q ? (q.count ?? 0) : 0);
  const low = ((queries[6]?.data ?? []) as unknown as { available: number | null; variant: { min_stock_level: number } | null }[]).filter(
    (row) => row.variant && (row.available ?? 0) <= row.variant.min_stock_level
  ).length;
  const alerts: Alert[] = [
    { key: "obligationsOverdue", count: count(queries[0]), href: "/pay", tone: "danger" },
    { key: "obligationsSoon", count: count(queries[1]), href: "/pay", tone: "warning" },
    { key: "storeOrders", count: count(queries[5]), href: "/orders/inbox", tone: "danger" },
    { key: "callsDue", count: count(queries[2]), href: "/orders?view=to_call", tone: "info" },
    { key: "deliveryProblems", count: count(queries[3]), href: "/shipping?view=problems", tone: "warning" },
    { key: "returnsWaiting", count: count(queries[4]), href: "/returns", tone: "info" },
    { key: "lowStock", count: low, href: "/inventory?low=1", tone: "warning" }
  ];
  return alerts.filter((a) => a.count > 0);
}

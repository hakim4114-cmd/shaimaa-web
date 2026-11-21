import "server-only";
import { businessDay } from "@/lib/datetime";
import type { requireOrganization } from "./context";

type Ctx = Awaited<ReturnType<typeof requireOrganization>>;

export type AlertKey = "obligationsOverdue" | "obligationsSoon" | "callsDue" | "deliveryProblems" | "returnsWaiting" | "lowStock" | "storeOrders" | "waitingToShip" | "problems" | "capitalBelowFloor" | "campaignLossCap" | "remittanceLate" | "adSpendStale";
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
    supabase.rpc("low_stock_count", { p_organization_id: organizationId }),
    // Confirmed more than 24 hours ago and still no parcel (auto-send skipped or failed, or forgotten).
    can.prepareOrders
      ? supabase.from("orders").select("id", head).eq("organization_id", organizationId).in("status", ["confirmed", "preparing"]).lt("confirmed_at", new Date(Date.now() - 86400000).toISOString())
      : null,
    can.overrideBlocklist ? supabase.from("system_events").select("id", head).eq("organization_id", organizationId).is("resolved_at", null) : null,
    can.seeMoney ? supabase.rpc("capital_status", { p_organization_id: organizationId }) : null,
    can.seeMoney ? supabase.rpc("campaign_loss_status", { p_organization_id: organizationId }) : null,
    // Sendit pays within 48–72 hours: a week after delivery, the money should be in.
    can.seeMoney
      ? supabase.from("orders").select("id", head).eq("organization_id", organizationId).eq("payment_status", "awaiting_remittance").lt("delivered_at", new Date(Date.now() - 7 * 86400000).toISOString())
      : null,
    // Ad platforms bill late: a running campaign with no spend recorded for 3 days makes its test look better than it is.
    can.seeMoney
      ? supabase.from("marketing_campaigns").select("id").eq("organization_id", organizationId).is("ends_on", null).lt("created_at", new Date(Date.now() - 3 * 86400000).toISOString())
      : null,
    can.seeMoney
      ? supabase.from("expenses").select("campaign_id").eq("organization_id", organizationId).eq("category", "advertising").not("campaign_id", "is", null).gte("incurred_on", addDays(today, -3))
      : null
  ]);
  const recentlySpent = new Set(((queries[13]?.data ?? []) as { campaign_id: string | null }[]).map((e) => e.campaign_id));
  const staleCampaigns = ((queries[12]?.data ?? []) as { id: string }[]).filter((c) => !recentlySpent.has(c.id)).length;
  const count = (q: (typeof queries)[number]) => (q && "count" in q ? (q.count ?? 0) : 0);
  const low = Number(queries[6]?.data ?? 0);
  const capital = (queries[9]?.data ?? null) as { below_floor?: boolean } | null;
  const alerts: Alert[] = [
    { key: "capitalBelowFloor", count: capital?.below_floor ? 1 : 0, href: "/pay", tone: "danger" },
    { key: "campaignLossCap", count: ((queries[10]?.data ?? []) as { over_cap: boolean }[]).filter((c) => c.over_cap).length, href: "/reports", tone: "danger" },
    { key: "remittanceLate", count: count(queries[11]), href: "/cash", tone: "warning" },
    { key: "adSpendStale", count: staleCampaigns, href: "/marketing", tone: "warning" },
    { key: "obligationsOverdue", count: count(queries[0]), href: "/pay", tone: "danger" },
    { key: "obligationsSoon", count: count(queries[1]), href: "/pay", tone: "warning" },
    { key: "problems", count: count(queries[8]), href: "/problems", tone: "danger" },
    { key: "storeOrders", count: count(queries[5]), href: "/orders/inbox", tone: "danger" },
    { key: "callsDue", count: count(queries[2]), href: "/orders?view=to_call", tone: "info" },
    { key: "waitingToShip", count: count(queries[7]), href: "/orders?view=confirmed", tone: "warning" },
    { key: "deliveryProblems", count: count(queries[3]), href: "/shipping?view=problems", tone: "warning" },
    { key: "returnsWaiting", count: count(queries[4]), href: "/returns", tone: "info" },
    { key: "lowStock", count: low, href: "/inventory?low=1", tone: "warning" }
  ];
  return alerts.filter((a) => a.count > 0);
}

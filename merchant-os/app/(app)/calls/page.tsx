import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrganization } from "@/lib/data/context";
import { listCampaigns } from "@/lib/data/money";
import { getCustomerHistory, getOrder, listOrders } from "@/lib/data/orders";
import { businessDay } from "@/lib/datetime";
import { isGivenUp } from "@/lib/orders/calls";
import { getI18n } from "@/lib/i18n/server";
import { CallWorkspace, type QueueItem } from "./call-workspace";

// Read once per request (outside the component body, which must stay pure).
function readClock() {
  const now = Date.now();
  return { now, since: new Date(now - 36 * 3600 * 1000).toISOString(), today: businessDay(new Date(now)) };
}

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.calls.title };
}

/**
 * Call mode: the confirmation queue on one side, the order being called on the
 * other. After each outcome the next order opens by itself.
 */
export default async function CallsPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { t } = await getI18n();
  const tc = t.calls;
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.manageOrders) redirect("/orders");
  const params = await searchParams;

  const clock = readClock();
  const since = clock.since;
  const [allQueue, attempts, campaigns] = await Promise.all([
    listOrders(supabase, organizationId, { view: "to_call", withContacts: can.seeContacts }),
    supabase.from("order_call_attempts").select("outcome, created_at").eq("organization_id", organizationId).gte("created_at", since),
    listCampaigns(supabase, organizationId)
  ]);

  const today = clock.today;
  // Orders that did not answer five times leave the queue: call mode offers to cancel them.
  // "Try again" opens one of them on purpose: it then sits at the top of the queue.
  const queue = allQueue.filter((o) => !isGivenUp(o) || o.id === params.order);
  const givenUp = allQueue.filter(isGivenUp);
  const todays = (attempts.data ?? []).filter((a) => businessDay(a.created_at) === today);
  const confirmedToday = todays.filter((a) => a.outcome === "confirmed").length;
  const noAnswerToday = todays.filter((a) => a.outcome === "no_answer" || a.outcome === "busy" || a.outcome === "unreachable").length;
  const decided = todays.filter((a) => a.outcome === "confirmed" || a.outcome === "cancelled" || a.outcome === "wrong_number").length;
  const now = clock.now;
  const due = queue.filter((o) => !o.nextCallAt || Date.parse(o.nextCallAt) <= now);

  const currentId = params.order && queue.some((o) => o.id === params.order) ? params.order : (due[0]?.id ?? queue[0]?.id ?? null);
  const [order, campaignRow] = currentId
    ? await Promise.all([
        getOrder(supabase, organizationId, currentId, { withContacts: can.seeContacts, withCalls: true }),
        supabase.from("orders").select("campaign_id").eq("id", currentId).maybeSingle()
      ])
    : [null, null];
  const history = order?.contact ? await getCustomerHistory(supabase, organizationId, order.contact.phone) : null;
  const campaignName = campaigns.find((c) => c.id === campaignRow?.data?.campaign_id)?.name ?? null;

  const items: QueueItem[] = queue.map((o) => ({
    id: o.id,
    name: o.contact?.fullName ?? o.orderNumber,
    city: o.city,
    amountCents: o.codAmountCents,
    createdAt: o.createdAt,
    attempts: o.callAttempts,
    nextCallAt: o.nextCallAt
  }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={tc.title} description={tc.description} />
      <CallWorkspace
        queue={items}
        givenUp={givenUp.map((o) => ({ id: o.id, name: o.contact?.fullName ?? o.orderNumber, city: o.city, attempts: o.callAttempts }))}
        dueCount={due.length}
        stats={{ confirmedToday, noAnswerToday, rate: decided > 0 ? confirmedToday / decided : null }}
        current={
          order
            ? {
                id: order.id,
                orderNumber: order.orderNumber,
                name: order.contact?.fullName ?? order.orderNumber,
                phone: order.contact?.phone ?? null,
                address: order.contact?.address ?? "",
                city: order.city,
                createdAt: order.createdAt,
                attempts: order.callAttempts,
                items: order.items.map((i) => ({ id: i.id, label: `${i.productName}${i.variantTitle ? ` · ${i.variantTitle}` : ""}`, quantity: i.quantity, totalCents: i.lineTotalCents })),
                shippingFeeCents: order.shippingFeeCents,
                codAmountCents: order.codAmountCents,
                campaignName,
                history: history ? { orders: history.ordersTotal, delivered: history.delivered, refused: history.refused + history.returned, blocked: history.blocked } : null,
                lastCall: order.calls[0] ? { outcome: order.calls[0].outcome, note: order.calls[0].note } : null,
                deliverOn: order.deliverOn
              }
            : null
        }
      />
    </div>
  );
}

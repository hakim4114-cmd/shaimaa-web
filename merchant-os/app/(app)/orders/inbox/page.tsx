import { Inbox } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrganization } from "@/lib/data/context";
import { formatDateTime } from "@/lib/datetime";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/money";
import { formatMoroccanPhone } from "@/lib/phone";
import { InboxActions } from "./inbox-actions";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.storeInbox.title };
}

type Reason = "unknown_sku" | "invalid_phone" | "customer_blocked" | "currency" | "no_items" | "no_location" | "store_inactive" | "invalid_order";
type Payload = {
  customer?: { full_name?: string; phone?: string; city?: string };
  items?: { sku?: string; title?: string; quantity?: number; unit_price_cents?: number }[];
};

export default async function StoreInboxPage() {
  const { t, locale } = await getI18n();
  const ti = t.storeInbox;
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.manageOrders) redirect("/orders");
  const { data } = await supabase
    .from("external_orders")
    .select("id, external_number, external_id, reason, reason_detail, payload, received_at, attempts, store:stores(name)")
    .eq("organization_id", organizationId)
    .eq("status", "needs_attention")
    .order("received_at", { ascending: false })
    .limit(200)
    .overrideTypes<
      { id: string; external_number: string; external_id: string; reason: Reason | null; reason_detail: string; payload: Payload; received_at: string; attempts: number; store: { name: string } | null }[],
      { merge: false }
    >();
  const rows = data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader title={ti.title} description={ti.description} />
      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={Inbox} title={ti.empty} description={ti.emptyHint} />
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const phone = row.payload.customer?.phone ?? "";
            return (
              <li key={row.id}>
                <Card className="flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {row.store?.name} {row.external_number || row.external_id}
                      </span>
                      {row.reason ? <Badge tone="warning">{ti.reasons[row.reason]}</Badge> : null}
                      <span className="text-xs text-muted-foreground">{formatDateTime(row.received_at, locale, "short")}</span>
                    </div>
                    {row.reason ? <p className="text-muted-foreground">{ti.fixes[row.reason]}</p> : null}
                    {row.reason_detail ? (
                      <p dir="ltr" className="w-fit rounded bg-surface-muted px-2 py-0.5 text-xs">
                        {row.reason_detail}
                      </p>
                    ) : null}
                    <p>
                      {row.payload.customer?.full_name} · <span dir="ltr">{phone.startsWith("+212") ? formatMoroccanPhone(phone) : phone}</span> · {row.payload.customer?.city}
                    </p>
                    <ul className="text-xs text-muted-foreground">
                      {(row.payload.items ?? []).map((item, index) => (
                        <li key={index}>
                          {item.quantity} × {item.title} <span dir="ltr">({item.sku || "—"})</span>
                          {item.unit_price_cents ? ` · ${formatMoney(item.unit_price_cents, locale)}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <InboxActions id={row.id} />
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import { Package, PhoneCall, Plus, Search, Upload } from "lucide-react";
import { ExportMenu } from "@/components/export/export-menu";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { OrderStatusBadge } from "@/components/ui/order-status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requireOrganization } from "@/lib/data/context";
import { countOrdersByView, listOrders, orderViews, type OrderListRow, type OrderView } from "@/lib/data/orders";
import { formatDateTime } from "@/lib/datetime";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { interpolate } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/money";
import { formatMoroccanPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.orders.title };
}

const tabs: OrderView[] = ["to_call", "confirmed", "preparing", "ready", "open", "all"];

function CallInfo({ row, t, locale, now }: { row: OrderListRow; t: Dictionary; locale: Locale; now: number }) {
  const to = t.orders;
  if (row.status !== "new" && row.status !== "confirmation_pending") return null;
  const due = row.nextCallAt ? Date.parse(row.nextCallAt) <= now : false;
  if (row.nextCallAt) {
    return (
      <span className={cn("text-xs", due ? "font-semibold text-warning" : "text-muted-foreground")}>
        {interpolate(to.callBackAt, { time: formatDateTime(row.nextCallAt, locale, "short") })}
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground">
      {row.callAttempts === 0
        ? to.neverCalled
        : `${interpolate(to.callsCount, { count: row.callAttempts })}${row.lastCallOutcome ? ` · ${t.callOutcome[row.lastCallOutcome]}` : ""}`}
    </span>
  );
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, locale } = await getI18n();
  const to = t.orders;
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const view = orderViews.find((v) => v === params.view) ?? (q ? "all" : "to_call");
  const { supabase, organizationId, can } = await requireOrganization();
  const [orders, counts] = await Promise.all([
    listOrders(supabase, organizationId, { view, q, withContacts: can.seeContacts }),
    countOrdersByView(supabase, organizationId)
  ]);
  // eslint-disable-next-line react-hooks/purity -- a server render is a single point in time
  const now = Date.now();
  const countFor = (tab: OrderView) =>
    counts ? (tab === "to_call" ? counts.to_call : tab === "confirmed" ? counts.confirmed : tab === "preparing" ? counts.preparing : tab === "ready" ? counts.ready : null) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={to.title}
        description={to.description}
        actions={
          <>
            <ExportMenu dataset="orders" print={false} />
            {can.manageOrders ? (
              <Link href="/orders/import" className={buttonVariants({ variant: "secondary" })}>
                <Upload /> {t.imports.button}
              </Link>
            ) : null}
            {can.manageOrders ? (
              <Link href="/orders/new" className={buttonVariants()}>
                <Plus /> {to.new}
              </Link>
            ) : null}
          </>
        }
      />

      {counts && counts.due > 0 && view !== "to_call" ? (
        <Link href="/orders?view=to_call" className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm font-medium text-warning">
          <PhoneCall className="size-4 shrink-0" aria-hidden />
          {interpolate(to.dueBanner, { count: counts.due })}
        </Link>
      ) : null}

      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label={to.title}>
        {tabs.map((tab) => {
          const count = countFor(tab);
          const active = tab === view && !q;
          return (
            <Link
              key={tab}
              href={`/orders?view=${tab}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors pointer-coarse:h-10",
                active ? "border-transparent bg-foreground text-background" : "border-border bg-surface text-muted-foreground hover:text-foreground"
              )}
            >
              {to.views[tab]}
              {count ? (
                <span className={cn("tabular rounded-full px-1.5 text-xs", active ? "bg-background/20" : "bg-accent-soft text-accent-soft-foreground")}>{count}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <form method="get" className="flex gap-2" role="search">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{to.searchPlaceholder}</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
          <Input name="q" defaultValue={q} placeholder={to.searchPlaceholder} className="ps-9" type="search" />
        </label>
        <button type="submit" className={buttonVariants({ variant: "secondary" })}>
          <Search /> <span className="sr-only sm:not-sr-only">{t.topbar.search.replace("…", "")}</span>
        </button>
      </form>

      <Card className="overflow-hidden">
        {orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title={q ? t.topbar.searchEmpty : view === "to_call" ? to.emptyToCall : to.empty}
            description={q ? undefined : to.emptyHint}
            action={
              !q && can.manageOrders ? (
                <Link href="/orders/new" className={buttonVariants()}>
                  <Plus /> {to.new}
                </Link>
              ) : null
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-border sm:hidden">
              {orders.map((row) => (
                <li key={row.id}>
                  <Link href={`/orders/${row.id}`} className="flex flex-col gap-1.5 px-4 py-3.5 active:bg-surface-hover">
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate font-medium">{row.contact?.fullName ?? row.orderNumber}</span>
                      <span className="tabular shrink-0 font-semibold">{formatMoney(row.totalCents, locale)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                      <span className="min-w-0 truncate">
                        {[row.orderNumber, row.city].filter(Boolean).join(" · ")}
                      </span>
                      <OrderStatusBadge status={row.status} />
                    </div>
                    <CallInfo row={row} t={t} locale={locale} now={now} />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden sm:block">
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>{to.colOrder}</TH>
                    <TH>{to.colCustomer}</TH>
                    <TH>{to.colCity}</TH>
                    <TH className="text-end">{to.colTotal}</TH>
                    <TH>{to.colStatus}</TH>
                    <TH>{to.colCreated}</TH>
                  </TR>
                </THead>
                <TBody>
                  {orders.map((row) => (
                    <TR key={row.id}>
                      <TD>
                        <Link href={`/orders/${row.id}`} className="tabular font-medium text-foreground hover:text-accent">
                          {row.orderNumber}
                        </Link>
                        <p className="text-xs text-muted-foreground">{interpolate(to.itemsCount, { count: row.itemCount })}</p>
                      </TD>
                      <TD className="min-w-40 whitespace-normal">
                        {row.contact ? (
                          <>
                            <p className="font-medium">{row.contact.fullName}</p>
                            <p className="tabular text-xs text-muted-foreground" dir="ltr">
                              {formatMoroccanPhone(row.contact.phone)}
                            </p>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TD>
                      <TD>{row.city || "—"}</TD>
                      <TD className="tabular text-end font-medium">{formatMoney(row.totalCents, locale)}</TD>
                      <TD>
                        <div className="flex flex-col items-start gap-1">
                          <OrderStatusBadge status={row.status} />
                          <CallInfo row={row} t={t} locale={locale} now={now} />
                        </div>
                      </TD>
                      <TD className="text-muted-foreground">{formatDateTime(row.createdAt, locale, "short")}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

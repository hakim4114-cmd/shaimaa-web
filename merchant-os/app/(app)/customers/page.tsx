import { Search, ShieldBan, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BlockNumberForm, UnblockButton } from "@/components/orders/blocklist";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requireOrganization } from "@/lib/data/context";
import { listBlocklist, listCustomers } from "@/lib/data/orders";
import { formatDateTime } from "@/lib/datetime";
import { getI18n } from "@/lib/i18n/server";
import { formatMoroccanPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.customers.title };
}

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, locale } = await getI18n();
  const tc = t.customers;
  const params = await searchParams;
  const tab = params.tab === "blocked" ? "blocked" : "customers";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.seeContacts) redirect("/orders");

  const canBlock = can.manageOrders;
  const customers = tab === "customers" ? await listCustomers(supabase, organizationId, q) : [];
  const blocked = tab === "blocked" && canBlock ? await listBlocklist(supabase, organizationId) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={tc.title} description={tc.description} />

      <nav className="flex gap-1" aria-label={tc.title}>
        {(["customers", "blocked"] as const)
          .filter((value) => value === "customers" || canBlock)
          .map((value) => (
            <Link
              key={value}
              href={`/customers?tab=${value}`}
              aria-current={tab === value ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium pointer-coarse:h-10",
                tab === value ? "border-transparent bg-foreground text-background" : "border-border bg-surface text-muted-foreground hover:text-foreground"
              )}
            >
              {value === "customers" ? tc.tabCustomers : tc.tabBlocked}
            </Link>
          ))}
      </nav>

      {tab === "customers" ? (
        <>
          <form method="get" className="flex gap-2" role="search">
            <input type="hidden" name="tab" value="customers" />
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">{tc.searchPlaceholder}</span>
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
              <Input name="q" type="search" defaultValue={q} placeholder={tc.searchPlaceholder} className="ps-9" />
            </label>
            <button type="submit" className={buttonVariants({ variant: "secondary" })}>
              <Search /> <span className="sr-only sm:not-sr-only">{t.topbar.search.replace("…", "")}</span>
            </button>
          </form>
          <Card className="overflow-hidden">
            {customers.length === 0 ? (
              <EmptyState icon={Users} title={q ? t.topbar.searchEmpty : tc.empty} description={q ? undefined : tc.emptyHint} />
            ) : (
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>{tc.colName}</TH>
                    <TH>{tc.colPhone}</TH>
                    <TH>{tc.colCity}</TH>
                    <TH className="text-end">{tc.colOrders}</TH>
                  </TR>
                </THead>
                <TBody>
                  {customers.map((customer) => (
                    <TR key={customer.id}>
                      <TD className="min-w-36 whitespace-normal font-medium">
                        <Link href={`/orders?view=all&q=${encodeURIComponent(customer.phone)}`} className="hover:text-accent">
                          {customer.fullName}
                        </Link>
                      </TD>
                      <TD className="tabular" dir="ltr">
                        {formatMoroccanPhone(customer.phone)}
                      </TD>
                      <TD>{customer.city || "—"}</TD>
                      <TD className="tabular text-end">{customer.orders}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardHeader title={tc.addBlocked} description={tc.blockedHint} />
            <CardBody>
              <BlockNumberForm />
            </CardBody>
          </Card>
          <Card className="overflow-hidden">
            {blocked.length === 0 ? (
              <EmptyState icon={ShieldBan} title={tc.blockedEmpty} />
            ) : (
              <ul className="divide-y divide-border">
                {blocked.map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-3 px-5 py-3">
                    <div className="min-w-0 text-sm">
                      <p className="tabular font-medium" dir="ltr">
                        {formatMoroccanPhone(entry.phone)}
                      </p>
                      <p className="break-words text-muted-foreground">{entry.reason}</p>
                      <p className="text-xs text-subtle-foreground">{formatDateTime(entry.createdAt, locale, "short")}</p>
                    </div>
                    {can.overrideBlocklist ? <UnblockButton id={entry.id} phone={formatMoroccanPhone(entry.phone)} /> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

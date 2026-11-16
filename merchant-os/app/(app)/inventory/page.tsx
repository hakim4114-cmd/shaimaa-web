import { ChartColumn, History } from "lucide-react";
import Link from "next/link";
import { StockAction } from "@/components/inventory/stock-action";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Metric } from "@/components/ui/metric";
import { PageHeader } from "@/components/ui/page-header";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { listProducts } from "@/lib/data/catalog";
import { requireOrganization } from "@/lib/data/context";
import { interpolate } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.inventory.title };
}

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, locale } = await getI18n();
  const ti = t.inventory;
  const lowOnly = (await searchParams).low === "1";
  const { supabase, organizationId, can } = await requireOrganization();
  const products = (await listProducts(supabase, organizationId, {})).filter((p) => p.status !== "archived");

  const allRows = products.flatMap((product) =>
    product.variants
      .filter((variant) => variant.status === "active")
      .map((variant) => ({
        ...variant,
        productId: product.id,
        label: variant.title ? `${product.name} — ${variant.title}` : product.name,
        low: variant.stock.available <= variant.minStockLevel,
        out: variant.stock.available <= 0
      }))
  );
  const rows = lowOnly ? allRows.filter((row) => row.low) : allRows;
  const valued = allRows.filter((row) => row.costCents !== null);
  const totalValue = valued.reduce((sum, row) => sum + row.stock.onHand * (row.costCents ?? 0), 0);
  const unvalued = allRows.filter((row) => row.costCents === null && row.stock.onHand > 0).length;
  const lowCount = allRows.filter((row) => row.low).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={ti.title} description={ti.description} />

      {allRows.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Metric
            label={ti.valueTotal}
            value={can.seeCosts ? formatMoney(totalValue, locale) : null}
            unavailableReason={t.errors.FORBIDDEN}
            hint={unvalued > 0 ? interpolate(ti.valueUnknown, { count: unvalued }) : undefined}
          />
          <Metric label={ti.itemsLow} value={lowCount} />
        </div>
      ) : null}

      <div className="flex gap-2" role="group" aria-label={ti.title}>
        <Link href="/inventory" className={buttonVariants({ variant: lowOnly ? "ghost" : "secondary", size: "sm" })} aria-current={!lowOnly ? "page" : undefined}>
          {ti.all}
        </Link>
        <Link href="/inventory?low=1" className={buttonVariants({ variant: lowOnly ? "secondary" : "ghost", size: "sm" })} aria-current={lowOnly ? "page" : undefined}>
          {ti.lowOnly}
        </Link>
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={ChartColumn}
            title={lowOnly ? t.topbar.notificationsEmpty : ti.empty}
            description={lowOnly ? undefined : ti.emptyHint}
            action={
              !lowOnly && products.length === 0 && can.editCatalog ? (
                <Link href="/products/new" className={buttonVariants()}>
                  {t.products.new}
                </Link>
              ) : null
            }
          />
        ) : (
          <>
          <ul className="divide-y divide-border sm:hidden">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/products/${row.productId}`} className="font-medium hover:text-accent">
                      {row.label}
                    </Link>
                    <p className="tabular text-xs text-muted-foreground" dir="ltr">
                      {row.sku}
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    <span className={cn("tabular text-lg font-semibold", row.out ? "text-danger" : row.low ? "text-warning" : undefined)}>{row.stock.available}</span>
                    <p className="text-xs text-muted-foreground">{ti.colAvailable}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{interpolate(ti.buckets, row.stock)}</p>
                <div className="flex items-center gap-2">
                  {row.out ? <Badge tone="danger">{ti.out}</Badge> : row.low ? <Badge tone="warning">{ti.low}</Badge> : null}
                  <div className="ms-auto flex gap-1">
                    {can.moveStock ? <StockAction variantId={row.id} label={row.label} /> : null}
                    <Link href={`/inventory/${row.id}`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label={`${ti.history} — ${row.label}`}>
                      <History />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden sm:block">
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>{ti.colItem}</TH>
                <TH>{ti.colSku}</TH>
                <TH className="text-end">{ti.colOnHand}</TH>
                <TH className="text-end">{ti.colReserved}</TH>
                <TH className="text-end">{ti.colAvailable}</TH>
                <TH className="text-end">{ti.colDamaged}</TH>
                <TH className="text-end">{ti.colInspection}</TH>
                {can.seeCosts ? <TH className="text-end">{ti.colValue}</TH> : null}
                <TH>
                  <span className="sr-only">{ti.colActions}</span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((row) => (
                <TR key={row.id}>
                  <TD className="min-w-48 max-w-72 whitespace-normal">
                    <Link href={`/products/${row.productId}`} className="font-medium hover:text-accent">
                      {row.label}
                    </Link>
                  </TD>
                  <TD className="tabular text-muted-foreground" dir="ltr">
                    {row.sku}
                  </TD>
                  <TD className="tabular text-end">{row.stock.onHand}</TD>
                  <TD className="tabular text-end text-muted-foreground">{row.stock.reserved}</TD>
                  <TD className="tabular text-end">
                    <span className={cn("font-semibold", row.out ? "text-danger" : row.low ? "text-warning" : undefined)}>{row.stock.available}</span>
                    {row.out ? (
                      <Badge tone="danger" className="ms-2">
                        {ti.out}
                      </Badge>
                    ) : row.low ? (
                      <Badge tone="warning" className="ms-2">
                        {ti.low}
                      </Badge>
                    ) : null}
                  </TD>
                  <TD className="tabular text-end text-muted-foreground">{row.stock.damaged}</TD>
                  <TD className="tabular text-end text-muted-foreground">{row.stock.inspection}</TD>
                  {can.seeCosts ? (
                    <TD className="tabular text-end">
                      {row.costCents === null ? <span className="text-xs text-subtle-foreground">{t.products.costUnknown}</span> : formatMoney(row.stock.onHand * row.costCents, locale)}
                    </TD>
                  ) : null}
                  <TD>
                    <div className="flex justify-end gap-1">
                      {can.moveStock ? <StockAction variantId={row.id} label={row.label} /> : null}
                      <Link href={`/inventory/${row.id}`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label={`${ti.history} — ${row.label}`}>
                        <History />
                      </Link>
                    </div>
                  </TD>
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

import { Boxes, Plus, Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, NativeSelect } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { listProducts, type ProductStatus } from "@/lib/data/catalog";
import { requireOrganization } from "@/lib/data/context";
import { interpolate } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/money";

const statuses: ProductStatus[] = ["active", "draft", "archived"];
const statusTone = { active: "success", draft: "neutral", archived: "warning" } as const;

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.products.title };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, locale } = await getI18n();
  const tp = t.products;
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const status = statuses.find((s) => s === params.status);
  const { supabase, organizationId, can } = await requireOrganization();
  const products = await listProducts(supabase, organizationId, { q, status });
  const filtered = Boolean(q || status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tp.title}
        description={tp.description}
        actions={
          can.editCatalog ? (
            <Link href="/products/new" className={buttonVariants()}>
              <Plus /> {tp.new}
            </Link>
          ) : null
        }
      />

      <form method="get" className="flex flex-wrap gap-2" role="search">
        <label className="relative min-w-0 flex-1 basis-56">
          <span className="sr-only">{tp.searchPlaceholder}</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
          <Input name="q" defaultValue={q} placeholder={tp.searchPlaceholder} className="ps-9" />
        </label>
        <NativeSelect name="status" defaultValue={status ?? ""} aria-label={tp.colStatus} className="w-auto">
          <option value="">{tp.filterAll}</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {t.productStatus[value]}
            </option>
          ))}
        </NativeSelect>
        <button type="submit" className={buttonVariants({ variant: "secondary" })}>
          <Search /> <span className="sr-only sm:not-sr-only">{t.topbar.search.replace("…", "")}</span>
        </button>
      </form>

      <Card className="overflow-hidden">
        {products.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={filtered ? t.topbar.searchEmpty : tp.empty}
            description={filtered ? undefined : tp.emptyHint}
            action={
              !filtered && can.editCatalog ? (
                <Link href="/products/new" className={buttonVariants()}>
                  <Plus /> {tp.new}
                </Link>
              ) : null
            }
          />
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>{tp.colName}</TH>
                <TH>{tp.colVariants}</TH>
                <TH className="text-end">{tp.colStock}</TH>
                <TH className="text-end">{tp.colPrice}</TH>
                <TH>{tp.colStatus}</TH>
              </TR>
            </THead>
            <TBody>
              {products.map((product) => {
                const active = product.variants.filter((v) => v.status === "active");
                const prices = active.map((v) => v.priceCents);
                const min = prices.length ? Math.min(...prices) : 0;
                const max = prices.length ? Math.max(...prices) : 0;
                const available = active.reduce((sum, v) => sum + v.stock.available, 0);
                const low = active.some((v) => v.stock.available <= v.minStockLevel);
                return (
                  <TR key={product.id}>
                    <TD className="min-w-44 max-w-80 whitespace-normal">
                      <Link href={`/products/${product.id}`} className="font-medium text-foreground hover:text-accent">
                        {product.name}
                      </Link>
                      {product.category ? <p className="text-xs text-muted-foreground">{product.category}</p> : null}
                    </TD>
                    <TD className="text-muted-foreground">{interpolate(tp.variantsCount, { count: active.length })}</TD>
                    <TD className="tabular text-end">
                      <span className={low ? "font-semibold text-warning" : undefined}>{available}</span>
                    </TD>
                    <TD className="tabular text-end">
                      {min === max ? formatMoney(min, locale) : interpolate(tp.priceRange, { min: formatMoney(min, locale), max: formatMoney(max, locale) })}
                    </TD>
                    <TD>
                      <Badge tone={statusTone[product.status]} dot>
                        {t.productStatus[product.status]}
                      </Badge>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

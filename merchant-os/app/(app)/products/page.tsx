import { Boxes, Plus, Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, NativeSelect } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { listProducts, signProductImages, type ProductStatus } from "@/lib/data/catalog";
import { requireOrganization } from "@/lib/data/context";
import { interpolate } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

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
  const images = await signProductImages(supabase, products.map((p) => p.imagePath));
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
        {/* Phone: Enter on the keyboard searches; a lone button on its own line looked broken. */}
        <button type="submit" className={cn(buttonVariants({ variant: "secondary" }), "hidden sm:inline-flex")}>
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
          <>
          {/* Phone: one card per product (a table would cut the price column). */}
          <ul className="divide-y divide-border sm:hidden">
            {products.map((product) => {
              const active = product.variants.filter((v) => v.status === "active");
              const prices = active.map((v) => v.priceCents);
              const min = prices.length ? Math.min(...prices) : 0;
              const max = prices.length ? Math.max(...prices) : 0;
              const available = active.reduce((sum, v) => sum + v.stock.available, 0);
              const low = active.some((v) => v.stock.available <= v.minStockLevel);
              return (
                <li key={product.id}>
                  <Link href={`/products/${product.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface-hover">
                    <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-surface-muted ring-1 ring-border">
                      {product.imagePath && images[product.imagePath] ? (
                        // eslint-disable-next-line @next/next/no-img-element -- signed URL from private storage
                        <img src={images[product.imagePath]} alt="" className="size-full object-cover" loading="lazy" />
                      ) : null}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-semibold text-foreground">{product.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {interpolate(tp.variantsCount, { count: active.length })} ·{" "}
                        <span className={low ? "font-semibold text-warning" : undefined}>{interpolate(tp.availableShort, { count: available })}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="tabular text-sm font-semibold">{formatMoney(min, locale)}{min === max ? "" : "+"}</span>
                      <Badge tone={statusTone[product.status]} dot>
                        {t.productStatus[product.status]}
                      </Badge>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="hidden sm:block">
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
                      <div className="flex items-center gap-3">
                        <span className="size-10 shrink-0 overflow-hidden rounded-md bg-surface-muted ring-1 ring-border">
                          {product.imagePath && images[product.imagePath] ? (
                            // eslint-disable-next-line @next/next/no-img-element -- signed URL from private storage
                            <img src={images[product.imagePath]} alt="" className="size-full object-cover" loading="lazy" />
                          ) : null}
                        </span>
                        <div className="min-w-0">
                          <Link href={`/products/${product.id}`} className="font-medium text-foreground hover:text-accent">
                            {product.name}
                          </Link>
                          {product.category ? <p className="text-xs text-muted-foreground">{product.category}</p> : null}
                        </div>
                      </div>
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
          </div>
          </>
        )}
      </Card>
    </div>
  );
}

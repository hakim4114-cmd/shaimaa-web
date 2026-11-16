import { History } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StockAction } from "@/components/inventory/stock-action";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { listMovements } from "@/lib/data/catalog";
import { requireOrganization } from "@/lib/data/context";
import { interpolate } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const intlLocale = { ar: "ar-MA", fr: "fr-MA", en: "en-MA" } as const;

export default async function VariantHistoryPage({ params }: { params: Promise<{ variantId: string }> }) {
  const { variantId } = await params;
  if (!uuidPattern.test(variantId)) {
    notFound();
  }
  const { t, locale } = await getI18n();
  const ti = t.inventory;
  const { supabase, organizationId, can } = await requireOrganization();

  const { data: variant } = await supabase
    .from("product_variants")
    .select("id, sku, title, product:products(id, name), levels:inventory_levels(on_hand, reserved, damaged, inspection)")
    .eq("organization_id", organizationId)
    .eq("id", variantId)
    .maybeSingle();
  if (!variant) {
    notFound();
  }
  const movements = await listMovements(supabase, organizationId, variantId);
  const level = (variant.levels ?? []).reduce(
    (sum, l) => ({ onHand: sum.onHand + l.on_hand, reserved: sum.reserved + l.reserved, damaged: sum.damaged + l.damaged, inspection: sum.inspection + l.inspection }),
    { onHand: 0, reserved: 0, damaged: 0, inspection: 0 }
  );
  const label = variant.title ? `${variant.product?.name ?? ""} — ${variant.title}` : (variant.product?.name ?? variant.sku);
  const dateFormat = new Intl.DateTimeFormat(intlLocale[locale], { dateStyle: "medium", timeStyle: "short", numberingSystem: "latn" });

  const change = (m: (typeof movements)[number]) =>
    [
      [m.delta_on_hand, ti.colOnHand],
      [m.delta_reserved, ti.colReserved],
      [m.delta_damaged, ti.colDamaged],
      [m.delta_inspection, ti.colInspection]
    ]
      .filter(([delta]) => delta !== 0)
      .map(([delta, name]) => ({ text: `${Number(delta) > 0 ? "+" : ""}${delta} ${name}`, positive: Number(delta) > 0 }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/inventory" className="text-sm text-muted-foreground hover:text-foreground">
          {ti.backToStock}
        </Link>
        <div className="mt-2">
          <PageHeader
            title={label}
            description={interpolate(ti.buckets, level)}
            actions={can.moveStock ? <StockAction variantId={variant.id} label={label} /> : null}
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        {movements.length === 0 ? (
          <EmptyState icon={History} title={ti.historyEmpty} />
        ) : (
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>{ti.colDate}</TH>
                <TH>{ti.colType}</TH>
                <TH>{ti.colChange}</TH>
                <TH>{ti.colNote}</TH>
              </TR>
            </THead>
            <TBody>
              {movements.map((m) => (
                <TR key={m.id}>
                  <TD className="tabular text-muted-foreground">{dateFormat.format(new Date(m.created_at))}</TD>
                  <TD>{t.movementType[m.movement_type]}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {change(m).map((c) => (
                        <span key={c.text} className={cn("tabular text-sm", c.positive ? "text-success" : "text-danger")} dir="auto">
                          {c.text}
                        </span>
                      ))}
                    </div>
                  </TD>
                  <TD className="max-w-80 whitespace-normal text-muted-foreground">{m.note ?? "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

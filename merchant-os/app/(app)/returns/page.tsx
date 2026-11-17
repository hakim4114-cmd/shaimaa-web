import { Undo2 } from "lucide-react";
import Link from "next/link";
import { ReturnActions } from "@/components/money/return-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrganization } from "@/lib/data/context";
import { listReturns } from "@/lib/data/money";
import { formatDateTime } from "@/lib/datetime";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.money.returns.title };
}

const tone = { awaiting_receipt: "warning", received: "info", inspected: "accent", closed: "neutral" } as const;

export default async function ReturnsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, locale } = await getI18n();
  const tr = t.money.returns;
  const open = (await searchParams).view !== "closed";
  const { supabase, organizationId, can } = await requireOrganization();
  const rows = await listReturns(supabase, organizationId, open);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={tr.title} description={tr.description} />
      <nav className="flex gap-1" aria-label={tr.title}>
        {[true, false].map((value) => (
          <Link
            key={String(value)}
            href={value ? "/returns" : "/returns?view=closed"}
            aria-current={open === value ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium pointer-coarse:h-10",
              open === value ? "border-transparent bg-foreground text-background" : "border-border bg-surface text-muted-foreground hover:text-foreground"
            )}
          >
            {value ? tr.open : tr.closed}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={Undo2} title={tr.empty} description={tr.emptyHint} />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardHeader
                title={
                  <Link href={`/orders/${row.orderId}`} className="tabular hover:text-accent">
                    {row.orderNumber}
                  </Link>
                }
                description={`${tr.kinds[row.kind]} · ${formatDateTime(row.createdAt, locale, "short")}${row.returnShippingFeeCents ? ` · ${tr.returnFee}: ${formatMoney(row.returnShippingFeeCents, locale)}` : ""}`}
                action={<Badge tone={tone[row.status]} dot>{tr.statuses[row.status]}</Badge>}
              />
              <CardBody className="flex flex-col gap-3">
                {row.reason ? <p className="text-sm text-muted-foreground">{row.reason}</p> : null}
                <ReturnActions row={row} canReceive={can.receiveReturns} />
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

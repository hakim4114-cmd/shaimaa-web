import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrganization } from "@/lib/data/context";
import { formatDateTime } from "@/lib/datetime";
import { interpolate } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
import { ResolveButton } from "./resolve-button";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.problems.title };
}

type Source = "sendit_webhook" | "store_webhook" | "auto_ship" | "sendit_api" | "other";

export default async function ProblemsPage() {
  const { t, locale } = await getI18n();
  const tp = t.problems;
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) redirect("/");
  const { data } = await supabase
    .from("system_events")
    .select("id, source, message, details, occurrences, last_seen_at, order:orders(id, order_number)")
    .eq("organization_id", organizationId)
    .is("resolved_at", null)
    .order("last_seen_at", { ascending: false })
    .limit(100)
    .overrideTypes<
      { id: string; source: Source; message: string; details: { hint?: string }; occurrences: number; last_seen_at: string; order: { id: string; order_number: string } | null }[],
      { merge: false }
    >();
  const rows = data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title={tp.title} description={tp.description} />
      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={CircleCheck} title={tp.empty} description={tp.emptyHint} />
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Card className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="danger">{tp.sources[row.source]}</Badge>
                    {row.occurrences > 1 ? <Badge>{interpolate(tp.times, { count: row.occurrences })}</Badge> : null}
                    <span className="text-xs text-muted-foreground">{formatDateTime(row.last_seen_at, locale, "short")}</span>
                  </div>
                  <p dir="ltr" className="break-words text-start font-mono text-xs">
                    {row.message}
                  </p>
                  {row.details?.hint ? (
                    <p dir="ltr" className="text-start text-xs text-muted-foreground">
                      {row.details.hint}
                    </p>
                  ) : null}
                  {row.order ? (
                    <Link href={`/orders/${row.order.id}`} className="w-fit text-accent hover:underline">
                      {row.order.order_number}
                    </Link>
                  ) : null}
                </div>
                <ResolveButton id={row.id} />
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">{tp.footer}</p>
    </div>
  );
}

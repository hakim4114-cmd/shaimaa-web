import { ArrowRight, CalendarClock, CircleCheck, CircleDashed, Database, PackageCheck, PhoneCall, TriangleAlert, Truck, Undo2 } from "lucide-react";
import { RangeTabs } from "@/components/money/range-tabs";
import { Metric } from "@/components/ui/metric";
import { requireOrganization } from "@/lib/data/context";
import { getReport, getTodayCounts } from "@/lib/data/money";
import { formatMoney } from "@/lib/money";
import { parsePreset, resolveRange } from "@/lib/ranges";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { interpolate } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";

export default async function CommandCenterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, locale } = await getI18n();
  const configured = isSupabaseConfigured();
  const session = configured ? await getSessionContext() : null;

  if (session?.active) {
    const supabase = await createSupabaseServerClient();
    const orgId = session.active.organization.id;
    const head = { count: "exact" as const, head: true };
    // "Getting started": each step is checked from real records, in the order a new shop needs them.
    const [costed, rates, provider, cash, orders, parcels] = await Promise.all([
      supabase.from("product_variants").select("id", head).eq("organization_id", orgId).eq("status", "active").not("cost_cents", "is", null),
      supabase.from("shipping_rates").select("city_id", head).eq("organization_id", orgId).is("provider_id", null),
      supabase.from("shipping_providers").select("credentials_set, settings").eq("organization_id", orgId).eq("adapter_key", "sendit").maybeSingle(),
      supabase.from("cash_settings").select("organization_id", head).eq("organization_id", orgId),
      supabase.from("orders").select("id", head).eq("organization_id", orgId),
      supabase.from("shipments").select("id", head).eq("organization_id", orgId)
    ]);
    const pickupSet = Boolean((provider.data?.settings as { pickup_district_id?: unknown } | null)?.pickup_district_id);
    const tw = t.workspace;
    const readySteps: { label: string; hint: string; done: boolean; href?: string }[] = [
      { label: tw.stepCatalog, hint: tw.stepCatalogHint, done: (costed.count ?? 0) > 0, href: "/products" },
      { label: tw.stepRates, hint: tw.stepRatesHint, done: (rates.count ?? 0) > 0, href: "/settings" },
      { label: tw.stepSendit, hint: tw.stepSenditHint, done: Boolean(provider.data?.credentials_set) && pickupSet, href: "/settings" },
      { label: tw.stepCash, hint: tw.stepCashHint, done: (cash.count ?? 0) > 0, href: "/pay" },
      { label: tw.stepOrders, hint: tw.stepOrdersHint, done: (orders.count ?? 0) > 0, href: "/orders/new" },
      { label: tw.stepShip, hint: tw.stepShipHint, done: (parcels.count ?? 0) > 0, href: "/orders?view=confirmed" }
    ];
    const setupDone = readySteps.every((step) => step.done);
    const ctx = await requireOrganization();
    const preset = parsePreset((await searchParams).range, "7d");
    const { from, to } = resolveRange(preset);
    const [today, report] = await Promise.all([
      getTodayCounts(ctx.supabase, ctx.organizationId),
      ctx.can.seeMoney ? getReport(ctx.supabase, ctx.organizationId, from, to) : Promise.resolve(null)
    ]);
    const td = t.money.today;
    const tasks = [
      // Each kind of task keeps its own colour, so the eye finds it without reading.
      { icon: PhoneCall, label: td.calls, count: today.callsDue, href: ctx.can.manageOrders ? "/calls" : "/orders?view=to_call", chip: "bg-accent-soft text-accent-soft-foreground" },
      { icon: PackageCheck, label: td.prepare, count: today.toPrepare, href: "/orders?view=confirmed", chip: "bg-warning-soft text-warning" },
      { icon: Truck, label: td.pickup, count: today.toPickUp, href: "/shipping?view=to_pickup", chip: "bg-info-soft text-info" },
      { icon: TriangleAlert, label: td.problems, count: today.deliveryProblems, href: "/shipping?view=problems", chip: "bg-danger-soft text-danger" },
      { icon: Undo2, label: td.returns, count: today.returnsWaiting, href: "/returns", chip: "bg-success-soft text-success" },
      ...(ctx.can.seeMoney ? [{ icon: CalendarClock, label: td.obligations, count: today.obligationsDue, href: "/pay", chip: "bg-surface-muted text-foreground" }] : [])
    ];
    const rate = (v: number | null) => (v === null ? null : `${Math.round(v * 100)}%`);
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t.commandCenter.title} description={t.commandCenter.description} />

        <Card>
          <CardHeader title={td.title} description={td.description} />
          <ul className="grid divide-y divide-border sm:grid-cols-3 lg:grid-cols-6 sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse">
            {tasks.map((task) => (
              <li key={task.href}>
                <Link href={task.href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-hover sm:flex-col sm:items-start sm:gap-1.5">
                  <span className={task.count ? `flex size-9 shrink-0 items-center justify-center rounded-md ${task.chip}` : "flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-subtle-foreground"}>
                    <task.icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-muted-foreground">{task.label}</span>
                  <span className={task.count ? "tabular text-2xl font-bold" : "tabular text-2xl font-bold text-subtle-foreground"}>{task.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        {report ? (
          <>
            <RangeTabs basePath="/" current={preset} labels={t.money.ranges} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric tone="hero" label={t.money.pnl.netProfit} value={formatMoney(report.netProfitCents, locale)} hint={report.costMissingLines ? t.money.pnl.costMissingShort : undefined} />
              <Metric label={t.money.pnl.revenue} value={formatMoney(report.deliveredRevenueCents, locale)} hint={`${report.ordersDelivered} ${t.money.deliveredCol}`} />
              <Metric label={t.money.receivable} value={formatMoney(report.codReceivableCents, locale)} hint={t.money.receivableHint} />
              <Metric label={t.money.costPerDelivered} value={report.costPerDeliveredCents === null ? null : formatMoney(report.costPerDeliveredCents, locale)} unavailableReason={t.money.noDeliveries} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label={t.money.funnel.orders} value={report.ordersCreated} hint={formatMoney(report.bookedValueCents, locale)} />
              <Metric label={t.money.funnel.confirmation} value={rate(report.confirmationRate)} unavailableReason="—" hint={`${report.ordersConfirmed} / ${report.ordersCreated}`} />
              <Metric label={t.money.funnel.shipped} value={report.ordersShipped} />
              <Metric label={t.money.funnel.returnRate} value={rate(report.returnRate)} unavailableReason="—" hint={`${report.ordersRefused + report.ordersReturned} ${t.money.funnel.refusedReturned}`} />
            </div>
          </>
        ) : null}

        {setupDone ? null : (
        <Card>
          <CardHeader
            title={t.workspace.readyTitle}
            description={interpolate(t.workspace.readyDescription, {
              organization: session.active.organization.name,
              role: t.userMenu.role[session.active.role]
            })}
          />
          <CardBody>
            <ol className="flex flex-col divide-y divide-border">
              {readySteps.map((step) => (
                <li key={step.label} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  {step.done ? (
                    <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
                  ) : (
                    <CircleDashed className="mt-0.5 size-5 shrink-0 text-subtle-foreground" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1">
                    {step.href && !step.done ? (
                      <Link href={step.href} className="text-sm font-medium text-accent hover:underline">
                        {step.label}
                      </Link>
                    ) : (
                      <span className={step.done ? "text-sm text-muted-foreground line-through" : "text-sm text-foreground"}>{step.label}</span>
                    )}
                    {step.done ? null : <span className="block text-xs text-muted-foreground">{step.hint}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
        )}
      </div>
    );
  }

  // Phase 1 has no data access layer yet, so no metric is rendered at all:
  // the dashboard shows real figures from Phase 2 onwards, never placeholders.
  const steps = [
    { label: t.commandCenter.stepProject, state: "manual" as const },
    { label: t.commandCenter.stepMigrations, state: "manual" as const },
    { label: t.commandCenter.stepEnv, state: configured ? ("done" as const) : ("todo" as const) }
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.commandCenter.title} description={t.commandCenter.description} />

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Database className="size-4 text-accent" aria-hidden />
              {t.commandCenter.setupTitle}
            </span>
          }
          description={t.commandCenter.setupDescription}
        />
        <CardBody>
          <ol className="flex flex-col divide-y divide-border">
            {steps.map((step, index) => (
              <li key={step.label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                {step.state === "done" ? (
                  <CircleCheck className="size-5 shrink-0 text-success" aria-hidden />
                ) : (
                  <CircleDashed className="size-5 shrink-0 text-subtle-foreground" aria-hidden />
                )}
                <span className="tabular text-xs text-subtle-foreground">{index + 1}</span>
                <span className="min-w-0 flex-1 text-sm text-foreground [overflow-wrap:anywhere]">{step.label}</span>
                {step.state === "manual" ? (
                  <Badge>{t.commandCenter.manualStep}</Badge>
                ) : (
                  <Badge tone={step.state === "done" ? "success" : "warning"} dot>
                    {step.state === "done" ? t.commandCenter.configured : t.commandCenter.notConfigured}
                  </Badge>
                )}
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex items-start gap-3">
          <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
          <div>
            <p className="text-sm font-medium text-foreground">{t.commandCenter.nextTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.commandCenter.nextDescription}</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

import { ArrowRight, CircleCheck, CircleDashed, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionContext } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { interpolate } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";

export default async function CommandCenterPage() {
  const { t } = await getI18n();
  const configured = isSupabaseConfigured();
  const session = configured ? await getSessionContext() : null;

  if (session?.active) {
    const readySteps = [
      { label: t.workspace.stepDatabase, done: true },
      { label: t.workspace.stepOrganization, done: true },
      { label: t.workspace.stepCatalog, done: false },
      { label: t.workspace.stepOrders, done: false }
    ];
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t.commandCenter.title} description={t.commandCenter.description} />
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
                <li key={step.label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  {step.done ? (
                    <CircleCheck className="size-5 shrink-0 text-success" aria-hidden />
                  ) : (
                    <CircleDashed className="size-5 shrink-0 text-subtle-foreground" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 text-sm text-foreground">{step.label}</span>
                  {step.done ? null : <Badge>{t.workspace.upcoming}</Badge>}
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
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

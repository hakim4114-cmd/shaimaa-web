"use client";

import { Inbox, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Metric } from "@/components/ui/metric";
import { OrderStatusBadge } from "@/components/ui/order-status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { orderStatuses } from "@/lib/domain/order-status";
import { useI18n } from "@/lib/i18n/provider";
import { formatMoney } from "@/lib/money";

const exampleRows = [
  { number: "ORD-000101", city: "Casablanca", status: "confirmed", totalCents: 92000 },
  { number: "ORD-000102", city: "Marrakech", status: "shipped", totalCents: 118000 },
  { number: "ORD-000103", city: "Fès", status: "refused", totalCents: 89000 }
] as const;

export function DesignSystemShowcase() {
  const { t, locale } = useI18n();
  const ds = t.designSystem;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={ds.title}
        description={ds.description}
        actions={
          <Badge tone="warning" dot>
            {ds.sampleLabel}
          </Badge>
        }
      />

      <Card>
        <CardHeader title={ds.buttons} />
        <CardBody className="flex flex-wrap items-center gap-2">
          <Button>
            <Plus /> {t.common.save}
          </Button>
          <Button variant="secondary">{t.common.cancel}</Button>
          <Button variant="ghost">{t.common.close}</Button>
          <Button variant="danger">
            <Trash2 /> {t.common.delete}
          </Button>
          <Button size="sm" variant="secondary">
            sm
          </Button>
          <Button disabled>{t.common.loading}</Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={ds.inputs} />
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label={ds.fieldName} htmlFor="ds-name">
            <Input id="ds-name" placeholder="Amina Djellaba" />
          </Field>
          <Field label={ds.fieldPrice} htmlFor="ds-price" hint={ds.hintPrice}>
            <Input id="ds-price" inputMode="decimal" placeholder="890.00" />
          </Field>
          <Field label={ds.fieldCity} htmlFor="ds-city" error={t.common.required}>
            <NativeSelect id="ds-city" aria-invalid defaultValue="">
              <option value="" disabled>
                —
              </option>
              <option>Casablanca</option>
              <option>Rabat</option>
            </NativeSelect>
          </Field>
          <Field label={ds.fieldNotes} htmlFor="ds-notes">
            <Textarea id="ds-notes" />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={ds.badges} />
        <CardBody className="flex flex-wrap gap-2">
          {orderStatuses.map((status) => (
            <OrderStatusBadge key={status} status={status} />
          ))}
        </CardBody>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={ds.metrics}>
        <Metric label={t.orderStatus.delivered} value="128" delta={{ value: "12%", direction: "up", positive: true }} hint={ds.sampleLabel} />
        <Metric label={t.orderStatus.refused} value="9" delta={{ value: "3%", direction: "up", positive: false }} />
        <Metric label={t.nav.cod} value={formatMoney(4_520_000, locale)} />
        <Metric label={t.nav.finance} value={null} unavailableReason="—" />
      </section>

      <Card>
        <CardHeader title={ds.table} description={ds.sampleLabel} />
        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>#</TH>
              <TH>{ds.fieldCity}</TH>
              <TH>{t.nav.orders}</TH>
              <TH className="text-end">MAD</TH>
            </TR>
          </THead>
          <TBody>
            {exampleRows.map((row) => (
              <TR key={row.number}>
                <TD className="tabular font-medium">{row.number}</TD>
                <TD>{row.city}</TD>
                <TD>
                  <OrderStatusBadge status={row.status} />
                </TD>
                <TD className="tabular text-end">{formatMoney(row.totalCents, locale)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title={ds.feedback} />
          <CardBody className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => toast.success(ds.toastMessage)}>
              {ds.toastButton}
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant="danger">
                  <Trash2 /> {ds.dialogButton}
                </Button>
              }
              title={ds.dialogTitle}
              description={ds.dialogDescription}
              confirmLabel={t.common.delete}
              cancelLabel={t.common.cancel}
              onConfirm={() => {
                toast(ds.deleted);
              }}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={ds.emptyState} />
          <EmptyState icon={Inbox} title={t.topbar.notificationsEmpty} description={t.topbar.notificationsEmptyHint} />
        </Card>
        <Card>
          <CardHeader title={ds.skeleton} />
          <CardBody className="flex flex-col gap-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

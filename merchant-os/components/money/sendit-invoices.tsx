"use client";

import { FileSearch, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { loadSenditInvoices, previewSenditInvoice, recordSenditInvoice } from "@/app/(app)/cash/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { AppErrorCode } from "@/lib/data/errors";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { formatMoney } from "@/lib/money";
import type { SenditInvoiceSummary } from "@/lib/shipping/sendit";
import type { InvoicePreview } from "@/lib/shipping/sendit-core";

type Failure = { code: AppErrorCode; detail?: string };

export function SenditInvoices() {
  const { t, locale } = useI18n();
  const tc = t.money.cash;
  const router = useRouter();
  const [invoices, setInvoices] = useState<(SenditInvoiceSummary & { recorded: boolean })[] | null>(null);
  const [selected, setSelected] = useState<{ invoice: SenditInvoiceSummary; preview: InvoicePreview } | null>(null);
  const [acceptGap, setAcceptGap] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<Failure | null>(null);

  const load = () =>
    startTransition(async () => {
      setError(null);
      const result = await loadSenditInvoices(1);
      if (result.error) return setError({ code: result.error, detail: result.detail });
      setInvoices(result.data?.invoices ?? []);
    });

  const open = (code: string) =>
    startTransition(async () => {
      setError(null);
      setAcceptGap(false);
      const result = await previewSenditInvoice(code);
      if (result.error || !result.data) return setError({ code: result.error ?? "UNKNOWN", detail: result.detail });
      setSelected(result.data);
    });

  const record = () =>
    selected &&
    startTransition(async () => {
      const result = await recordSenditInvoice({ code: selected.invoice.code, acceptGap });
      if (result.error) return setError({ code: result.error, detail: result.detail });
      toast.success(tc.recorded);
      setSelected(null);
      setInvoices((list) => list?.map((i) => (i.code === selected.invoice.code ? { ...i, recorded: true } : i)) ?? null);
      router.refresh();
    });

  const p = selected?.preview;
  const blocked = Boolean(p && (p.mismatches.length > 0 || p.unknown.length > 0));
  const gap = p ? p.impliedOtherCents - p.explainedOtherCents : 0;

  return (
    <div className="flex flex-col gap-3">
      {error && !selected ? (
        <FormAlert>
          {t.errors[error.code]}
          {error.detail ? ` (${error.detail})` : ""}
        </FormAlert>
      ) : null}
      <Button variant="secondary" className="self-start" onClick={load} disabled={pending}>
        <RefreshCw /> {invoices ? tc.reload : tc.load}
      </Button>
      {invoices?.length === 0 ? <p className="text-sm text-muted-foreground">{tc.noInvoices}</p> : null}
      {invoices && invoices.length > 0 ? (
        <ul className="divide-y divide-border rounded-md ring-1 ring-border">
          {invoices.map((inv) => (
            <li key={inv.code} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="tabular font-medium">{inv.code}</span>
                <span className="tabular text-muted-foreground"> · {inv.date}</span>
                <span className="text-muted-foreground"> · {inv.status}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="tabular font-medium">{formatMoney(inv.amountCents, locale)}</span>
                {inv.recorded ? (
                  <Badge tone="success" dot>
                    {tc.recordedBadge}
                  </Badge>
                ) : (
                  <Button size="sm" onClick={() => open(inv.code)} disabled={pending}>
                    <FileSearch /> {tc.check}
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog open={selected !== null} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent closeLabel={t.common.close} className="max-h-[85dvh] overflow-y-auto">
          {selected && p ? (
            <>
              <DialogTitle>{interpolate(tc.invoiceTitle, { code: selected.invoice.code })}</DialogTitle>
              <DialogDescription>{tc.invoiceHint}</DialogDescription>
              <div className="mt-4 flex flex-col gap-3 text-sm">
                {error ? (
                  <FormAlert>
                    {t.errors[error.code]}
                    {error.detail ? ` (${error.detail})` : ""}
                  </FormAlert>
                ) : null}
                <dl className="grid gap-1.5 rounded-md bg-surface-muted p-3">
                  <div className="flex justify-between gap-3">
                    <dt>{interpolate(tc.deliveredLines, { count: p.settle.length })}</dt>
                    <dd className="tabular">{formatMoney(p.deliveredGrossCents, locale)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">− {tc.deliveryFees}</dt>
                    <dd className="tabular">{formatMoney(p.deliveredFeesCents, locale)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">− {interpolate(tc.otherLines, { count: p.otherLines.length })}</dt>
                    <dd className="tabular">{formatMoney(p.impliedOtherCents, locale)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-border pt-1.5 font-semibold">
                    <dt>{tc.invoiceAmount}</dt>
                    <dd className="tabular">{formatMoney(selected.invoice.amountCents, locale)}</dd>
                  </div>
                </dl>
                {p.mismatches.map((m) => (
                  <p key={m.trackingNumber} className="text-danger">
                    {interpolate(tc.mismatch, { code: m.trackingNumber, order: m.orderNumber, expected: formatMoney(m.expectedCents, locale), invoiced: formatMoney(m.invoicedCents, locale) })}
                  </p>
                ))}
                {p.unknown.length ? <p className="text-danger">{interpolate(tc.unknown, { codes: p.unknown.join(", ") })}</p> : null}
                {p.alreadySettled.length ? <p className="text-muted-foreground">{interpolate(tc.alreadySettled, { codes: p.alreadySettled.join(", ") })}</p> : null}
                {blocked ? <p className="font-medium text-danger">{tc.blocked}</p> : null}
                {!blocked && gap !== 0 ? (
                  <label className="flex items-start gap-2 rounded-md bg-warning-soft p-3 text-warning">
                    <input type="checkbox" className="mt-0.5 size-5 accent-[var(--accent)]" checked={acceptGap} onChange={(e) => setAcceptGap(e.target.checked)} />
                    <span>{interpolate(tc.gap, { amount: formatMoney(gap, locale) })}</span>
                  </label>
                ) : null}
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setSelected(null)}>
                    {t.common.cancel}
                  </Button>
                  <Button onClick={record} disabled={pending || blocked || (gap !== 0 && !acceptGap)}>
                    {tc.record}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

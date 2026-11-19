"use client";

import { ExternalLink, Printer, RefreshCw, Search, Truck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { cancelSenditParcel, refreshSenditShipment, searchSenditDistricts, senditLabels, shipWithSendit } from "@/app/(app)/shipping/actions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormAlert } from "@/components/auth/form-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import type { AppErrorCode } from "@/lib/data/errors";
import type { ShipmentRow } from "@/lib/data/shipping";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { formatMoney } from "@/lib/money";
import type { SenditDistrict } from "@/lib/shipping/sendit";
import { cn } from "@/lib/utils";

type Failure = { code: AppErrorCode; detail?: string };

function ErrorLine({ error }: { error: Failure | null }) {
  const { t } = useI18n();
  if (!error) return null;
  // Sendit answers "Page non trouvée" (404) for a parcel deleted on its side.
  if (error.code === "SENDIT_REJECTED" && /non trouv|not found|introuvable/i.test(error.detail ?? "")) {
    return <FormAlert>{t.shipping.parcelGone}</FormAlert>;
  }
  return (
    <FormAlert>
      {t.errors[error.code]}
      {error.detail ? ` (${error.detail})` : ""}
    </FormAlert>
  );
}

export const shipmentTone = {
  pending: "neutral",
  picked_up: "info",
  in_transit: "info",
  out_for_delivery: "accent",
  failed_attempt: "warning",
  delivered: "success",
  returned_to_sender: "danger",
  cancelled: "neutral"
} as const;

/** Order page: ship with Sendit, or follow the existing parcel. */
export function ShipmentPanel({
  orderId,
  orderCity,
  shipment,
  senditEnabled,
  canShip
}: {
  orderId: string;
  orderCity: string;
  shipment: ShipmentRow | null;
  senditEnabled: boolean;
  canShip: boolean;
}) {
  const { t, locale } = useI18n();
  const ts = t.shipping;

  if (!shipment) {
    if (!canShip) return null;
    return (
      <Card>
        <CardHeader title={ts.shipTitle} description={senditEnabled ? ts.shipDescription : ts.senditOff} />
        {senditEnabled ? (
          <CardBody>
            <ShipDialog orderId={orderId} defaultQuery={orderCity} />
          </CardBody>
        ) : null}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={ts.parcel}
        description={shipment.trackingNumber ?? undefined}
        action={<Badge tone={shipmentTone[shipment.status]} dot>{ts.status[shipment.status]}</Badge>}
      />
      <CardBody className="flex flex-col gap-3 text-sm">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          {shipment.carrierStatus ? (
            <>
              <dt className="text-muted-foreground">Sendit</dt>
              <dd className="font-medium">{ts.senditStatus[shipment.carrierStatus as keyof typeof ts.senditStatus] ?? shipment.carrierStatus}</dd>
            </>
          ) : null}
          {shipment.carrierDistrictName ? (
            <>
              <dt className="text-muted-foreground">{ts.district}</dt>
              <dd className="break-words">{shipment.carrierDistrictName}</dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">{ts.carrierFee}</dt>
          <dd className="tabular">{formatMoney(shipment.shippingCostCents, locale)}</dd>
          {shipment.unreachableCount > 0 ? (
            <>
              <dt className="text-muted-foreground">{ts.unreachable}</dt>
              <dd className="font-medium text-warning">{interpolate(ts.unreachableCount, { count: shipment.unreachableCount })}</dd>
            </>
          ) : null}
          {shipment.deliverBy ? (
            <>
              <dt className="text-muted-foreground">{ts.nextAttempt}</dt>
              <dd className="tabular">{shipment.deliverBy}</dd>
            </>
          ) : null}
        </dl>
        {shipment.carrierMessage ? <p className="rounded-md bg-surface-muted p-3">{shipment.carrierMessage}</p> : null}
        {shipment.proofUrl ? (
          <a href={shipment.proofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1.5 text-accent hover:underline">
            <ExternalLink className="size-4" aria-hidden /> {ts.proof}
          </a>
        ) : null}
        {shipment.isSendit && shipment.trackingNumber && canShip ? <ParcelActions shipmentId={shipment.id} code={shipment.trackingNumber} cancellable={shipment.status === "pending"} /> : null}
      </CardBody>
    </Card>
  );
}

function ParcelActions({ shipmentId, code, cancellable }: { shipmentId: string; code: string; cancellable: boolean }) {
  const { t } = useI18n();
  const ts = t.shipping;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<Failure | null>(null);

  function label(thermal: boolean) {
    setError(null);
    // Open the tab synchronously so pop-up blockers allow it, then point it at the PDF.
    const tab = window.open("about:blank", "_blank");
    startTransition(async () => {
      const result = await senditLabels([code], thermal);
      if (result.error || !result.data) {
        tab?.close();
        setError({ code: result.error ?? "UNKNOWN", detail: result.detail });
        return;
      }
      if (tab) tab.location.href = result.data;
      else window.location.href = result.data;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <ErrorLine error={error} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => label(true)} disabled={pending}>
          <Printer /> {ts.labelThermal}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => label(false)} disabled={pending}>
          <Printer /> {ts.labelA4}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await refreshSenditShipment(shipmentId);
              if (result.error) {
                setError({ code: result.error, detail: result.detail });
                return;
              }
              toast.success(ts.refreshed);
              router.refresh();
            })
          }
        >
          <RefreshCw /> {ts.refresh}
        </Button>
        {cancellable ? (
          <CancelParcelDialog
            pending={pending}
            onConfirm={(cancelOrder, reason) =>
              startTransition(async () => {
                setError(null);
                const result = await cancelSenditParcel(shipmentId, { cancelOrder, reason });
                if (result.error) {
                  setError({ code: result.error, detail: result.detail });
                  router.refresh();
                  return;
                }
                toast.success(cancelOrder ? ts.parcelAndOrderCancelled : ts.parcelCancelled);
                router.refresh();
              })
            }
          />
        ) : null}
      </div>
    </div>
  );
}

/** Cancelling a parcel asks why: ship again (order back to preparing) or the customer cancelled (order cancelled, stock released). */
function CancelParcelDialog({ pending, onConfirm }: { pending: boolean; onConfirm: (cancelOrder: boolean, reason: string) => void }) {
  const { t } = useI18n();
  const ts = t.shipping;
  const id = useId();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"reship" | "cancel_order">("reship");
  const [reason, setReason] = useState("");
  const ready = mode === "reship" || reason.trim().length > 0;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" disabled={pending}>
          <XCircle /> {ts.cancelParcel}
        </Button>
      </DialogTrigger>
      <DialogContent role="alertdialog" closeLabel={t.common.close}>
        <DialogTitle>{ts.cancelParcel}</DialogTitle>
        <DialogDescription>{ts.cancelParcelWhy}</DialogDescription>
        <div className="mt-4 flex flex-col gap-3 text-sm" role="radiogroup" aria-label={ts.cancelParcelWhy}>
          {(["reship", "cancel_order"] as const).map((value) => (
            <label key={value} className="flex cursor-pointer items-start gap-2 rounded-md p-2 ring-1 ring-border has-[:checked]:ring-accent">
              <input type="radio" name={`${id}-mode`} className="mt-1 accent-[var(--accent)]" checked={mode === value} onChange={() => setMode(value)} />
              <span>
                <span className="font-medium">{value === "reship" ? ts.cancelParcelReship : ts.cancelParcelOrder}</span>
                <span className="block text-xs text-muted-foreground">{value === "reship" ? ts.cancelParcelReshipHint : ts.cancelParcelOrderHint}</span>
              </span>
            </label>
          ))}
          {mode === "cancel_order" ? (
            <label className="flex flex-col gap-1">
              <span className="font-medium">{t.orders.cancelReason}</span>
              <Textarea value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
            </label>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button
            variant="danger"
            disabled={!ready || pending}
            onClick={() => {
              onConfirm(mode === "cancel_order", reason);
              setOpen(false);
            }}
          >
            {ts.cancelParcel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShipDialog({ orderId, defaultQuery }: { orderId: string; defaultQuery: string }) {
  const { t, locale } = useI18n();
  const ts = t.shipping;
  const id = useId();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<SenditDistrict[] | null>(null);
  const [selected, setSelected] = useState<SenditDistrict | null>(null);
  const [searching, startSearch] = useTransition();
  const [shipping, startShip] = useTransition();
  const [error, setError] = useState<Failure | null>(null);

  // Search as the user types (debounced).
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) return;
    const timer = setTimeout(() => {
      startSearch(async () => {
        const result = await searchSenditDistricts(q);
        if (result.error) {
          setError({ code: result.error, detail: result.detail });
          return;
        }
        setError(null);
        setResults(result.data ?? []);
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [query, open]);

  function ship() {
    if (!selected) return;
    setError(null);
    startShip(async () => {
      const result = await shipWithSendit({ orderId, district: { id: selected.id, name: selected.name, feeCents: selected.feeCents } });
      if (result.error) {
        setError({ code: result.error, detail: result.detail });
        return;
      }
      toast.success(interpolate(ts.shipped, { code: result.data?.code ?? "" }));
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Truck /> {ts.shipWithSendit}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={t.common.close} className="max-h-[85dvh] overflow-y-auto">
        <DialogTitle>{ts.shipWithSendit}</DialogTitle>
        <DialogDescription>{ts.chooseDistrict}</DialogDescription>
        <div className="mt-4 flex flex-col gap-3">
          <ErrorLine error={error} />
          <label className="relative" htmlFor={`${id}-q`}>
            <span className="sr-only">{ts.searchDistrict}</span>
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
            <Input id={`${id}-q`} value={query} autoFocus placeholder={ts.searchDistrict} className="ps-9" onChange={(e) => setQuery(e.target.value)} />
          </label>
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto" role="listbox" aria-label={ts.chooseDistrict}>
            {searching && !results ? <li className="px-2 py-3 text-sm text-muted-foreground">{t.common.loading}</li> : null}
            {results?.length === 0 ? <li className="px-2 py-3 text-sm text-muted-foreground">{t.topbar.searchEmpty}</li> : null}
            {results?.map((district) => (
              <li key={district.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected?.id === district.id}
                  onClick={() => setSelected(district)}
                  className={cn(
                    "flex min-h-11 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-start text-sm",
                    selected?.id === district.id ? "border-accent bg-accent-soft" : "border-transparent hover:bg-surface-hover"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-medium break-words">{locale === "ar" && district.arabicName ? district.arabicName : district.name}</span>
                    {district.delay ? <span className="text-xs text-muted-foreground">{district.delay}</span> : null}
                  </span>
                  <span className="tabular shrink-0 text-muted-foreground">{formatMoney(district.feeCents, locale)}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={ship} disabled={!selected || shipping}>
              {shipping ? t.common.loading : ts.createParcel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { MessageCircle, Phone, Truck } from "lucide-react";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { addOrderNote, setDeliveryDate } from "@/app/(app)/orders/actions";
import { DeliveryDayPicker } from "@/components/orders/delivery-day";
import { formatDay } from "@/lib/datetime";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { formatMoney } from "@/lib/money";
import { daysSince, trackingTemplate, type TrackedStatus } from "@/lib/orders/tracking";
import { whatsappLanguages, whatsappLink, whatsappMessage, type WhatsappLanguage } from "@/lib/orders/whatsapp";
import { cn } from "@/lib/utils";

export type TrackedParcel = {
  shipmentId: string;
  orderId: string;
  orderNumber: string;
  name: string;
  phone: string | null;
  city: string;
  status: TrackedStatus;
  carrierMessage: string | null;
  tracking: string | null;
  codCents: number;
  since: string;
  shippedAt: string;
  unreachable: number;
  deliverOn: string | null;
  later: boolean;
};

const statusTone: Record<TrackedStatus, string> = {
  failed_attempt: "bg-danger-soft text-danger",
  out_for_delivery: "bg-success-soft text-success",
  in_transit: "bg-info-soft text-info",
  picked_up: "bg-info-soft text-info"
};

export function TrackingBoard({ parcels, storeName }: { parcels: TrackedParcel[]; storeName: string }) {
  const { t, locale } = useI18n();
  const tt = t.tracking;
  const [language, setLanguage] = useState<WhatsappLanguage>("darija");
  // Read once on the client; the day counts need no live update.
  const [now] = useState(() => Date.now());
  function pickLanguage(value: WhatsappLanguage) {
    setLanguage(value);
  }

  const counts = {
    missed: parcels.filter((p) => p.status === "failed_attempt").length,
    today: parcels.filter((p) => p.status === "out_for_delivery").length,
    onTheWay: parcels.filter((p) => p.status === "in_transit" || p.status === "picked_up").length
  };

  return (
    <div className="flex flex-col gap-4">
      {/* One summary strip: three counts side by side, short labels, a coloured dot per kind. */}
      <dl className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-card rtl:divide-x-reverse">
        {[
          { label: tt.missedShort, value: counts.missed, tone: "text-danger", dot: "bg-danger" },
          { label: tt.todayShort, value: counts.today, tone: "text-success", dot: "bg-success" },
          { label: tt.onTheWayShort, value: counts.onTheWay, tone: "text-info", dot: "bg-info" }
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-1 px-3 py-3 sm:px-4">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("size-2 shrink-0 rounded-full", s.dot)} aria-hidden />
              <span className="truncate">{s.label}</span>
            </dt>
            <dd className={cn("tabular text-2xl font-bold", s.value > 0 ? s.tone : "text-subtle-foreground")}>{s.value}</dd>
          </div>
        ))}
      </dl>

      {parcels.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm" role="radiogroup" aria-label={tt.messageLanguage}>
          <span className="text-muted-foreground">{tt.messageLanguage}</span>
          {whatsappLanguages.map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={language === l}
              onClick={() => pickLanguage(l)}
              className={cn(
                "min-h-9 rounded-full border px-3 text-sm font-medium transition-colors",
                language === l ? "border-accent bg-accent-soft text-accent-soft-foreground" : "border-border bg-surface hover:bg-surface-hover"
              )}
            >
              {t.orders.languages[l]}
            </button>
          ))}
        </div>
      ) : null}

      {parcels.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={tt.emptyTitle}
          description={tt.emptyDescription}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/shipping?view=to_pickup" className={buttonVariants({ variant: "secondary" })}>
                {tt.toShipping}
              </Link>
              <Link href="/calls" className={buttonVariants()}>
                {tt.toCalls}
              </Link>
            </div>
          }
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {parcels.map((p) => (
            <ParcelCard key={p.shipmentId} parcel={p} language={language} storeName={storeName} now={now} money={(c) => formatMoney(c, locale)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ParcelCard({
  parcel,
  language,
  storeName,
  now,
  money
}: {
  parcel: TrackedParcel;
  language: WhatsappLanguage;
  storeName: string;
  now: number;
  money: (cents: number) => string;
}) {
  const { t } = useI18n();
  const tt = t.tracking;
  const id = useId();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [postponing, setPostponing] = useState(false);
  const router = useRouter();
  const { locale } = useI18n();

  function postpone(day: string, dayNote: string) {
    startTransition(async () => {
      const result = await setDeliveryDate({ orderId: parcel.orderId, day, note: dayNote });
      if (result.error) {
        toast.error(t.errors[result.error]);
        return;
      }
      toast.success(interpolate(tt.postponedSaved, { day: formatDay(day, locale) }));
      setPostponing(false);
      router.refresh();
    });
  }
  const template = trackingTemplate(parcel.status);
  const message = whatsappMessage(language, template, {
    customerName: parcel.name,
    storeName,
    orderNumber: parcel.orderNumber,
    items: "",
    total: money(parcel.codCents),
    city: parcel.city,
    tracking: parcel.tracking
  });
  const wa = parcel.phone ? whatsappLink(parcel.phone, message) : null;
  const days = daysSince(parcel.shippedAt, now);

  function saveNote() {
    startTransition(async () => {
      const result = await addOrderNote(parcel.orderId, `${tt.notePrefix} ${note}`);
      if (result.error) {
        toast.error(t.errors[result.error]);
        return;
      }
      toast.success(tt.noteSaved);
      setNote("");
    });
  }

  return (
    <li className={cn("flex flex-col gap-3 rounded-xl border bg-surface p-4 shadow-card", parcel.status === "failed_attempt" ? "border-danger/40" : "border-border")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <Link href={`/orders/${parcel.orderId}`} className="truncate font-semibold underline-offset-2 hover:underline">
            {parcel.name}
          </Link>
          <span className="text-xs text-muted-foreground">
            {parcel.city} · <span dir="ltr">{parcel.orderNumber}</span>
            {parcel.tracking ? (
              <>
                {" "}
                · <span dir="ltr">{parcel.tracking}</span>
              </>
            ) : null}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", statusTone[parcel.status])}>{tt.status[parcel.status]}</span>
          {parcel.deliverOn ? (
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", parcel.later ? "bg-surface-muted text-foreground" : "bg-warning-soft text-warning")}>
              {interpolate(parcel.later ? tt.postponedTo : tt.dueToday, { day: formatDay(parcel.deliverOn, locale) })}
            </span>
          ) : null}
          <span className="tabular text-sm font-semibold">{money(parcel.codCents)}</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {interpolate(tt.shippedDays, { days })}
        {parcel.unreachable > 0 ? ` · ${interpolate(tt.unreachable, { count: parcel.unreachable })}` : ""}
        {parcel.carrierMessage ? ` · ${parcel.carrierMessage}` : ""}
      </p>

      <div className="flex gap-2">
        {parcel.phone ? (
          <a href={`tel:${parcel.phone}`} className={cn(buttonVariants({ variant: "secondary" }), "h-11 flex-1")}>
            <Phone /> {tt.call}
          </a>
        ) : null}
        {wa ? (
          <a href={wa} target="_blank" rel="noreferrer" className={cn(buttonVariants(), "h-11 flex-[2]")}>
            <MessageCircle /> {t.orders.templates[template]}
          </a>
        ) : null}
      </div>

      {postponing ? (
        <DeliveryDayPicker initial={parcel.deliverOn} pending={pending} confirmLabel={tt.postpone} onPick={postpone} onCancel={() => setPostponing(false)} />
      ) : (
        <button type="button" onClick={() => setPostponing(true)} className="self-start text-sm font-medium text-accent underline-offset-2 hover:underline">
          {tt.postponeAsk}
        </button>
      )}

      <div className="flex gap-2">
        <label htmlFor={`${id}-note`} className="sr-only">
          {tt.note}
        </label>
        <Input id={`${id}-note`} value={note} maxLength={500} placeholder={tt.notePlaceholder} onChange={(e) => setNote(e.target.value)} />
        <Button variant="secondary" disabled={pending || !note.trim()} onClick={saveNote}>
          {tt.saveNote}
        </Button>
      </div>
    </li>
  );
}

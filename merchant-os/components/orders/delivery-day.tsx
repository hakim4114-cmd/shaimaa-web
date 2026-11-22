"use client";

import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { setDeliveryDate } from "@/app/(app)/orders/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { businessDay, formatDay } from "@/lib/datetime";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { addDays, deliveryPresets, shipsLater } from "@/lib/orders/delivery-day";
import { cn } from "@/lib/utils";

/**
 * Pick the day the customer wants it, the way the conversation goes: tomorrow,
 * the day after, Saturday, or another day. Optional note ("after 6 pm").
 */
export function DeliveryDayPicker({
  initial,
  pending,
  confirmLabel,
  onPick,
  onCancel
}: {
  initial?: string | null;
  pending?: boolean;
  confirmLabel: string;
  onPick: (day: string, note: string) => void;
  onCancel?: () => void;
}) {
  const { t, locale } = useI18n();
  const td = t.deliveryDay;
  const id = useId();
  const [today] = useState(() => businessDay(new Date()));
  const presets = deliveryPresets(today);
  const [day, setDay] = useState(initial ?? "");
  const [note, setNote] = useState("");
  const chips = [
    { label: td.tomorrow, value: presets.tomorrow },
    { label: td.dayAfter, value: presets.dayAfter },
    { label: td.saturday, value: presets.saturday }
  ];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={td.pick}>
        {chips.map((c) => (
          <button
            key={c.label}
            type="button"
            role="radio"
            aria-checked={day === c.value}
            onClick={() => setDay(c.value)}
            className={cn(
              "flex min-h-11 flex-col items-start rounded-lg border px-3 py-1.5 text-start transition-colors",
              day === c.value ? "border-accent bg-accent-soft text-accent-soft-foreground" : "border-border bg-surface hover:bg-surface-hover"
            )}
          >
            <span className="text-sm font-semibold">{c.label}</span>
            <span className="text-xs opacity-80">{formatDay(c.value, locale)}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label htmlFor={`${id}-day`} className="flex flex-col gap-1 text-xs text-muted-foreground">
          {td.other}
          <Input id={`${id}-day`} type="date" dir="ltr" min={today} max={addDays(today, 60)} value={day} onChange={(e) => setDay(e.target.value)} className="w-44" />
        </label>
        <label htmlFor={`${id}-note`} className="flex min-w-40 flex-1 flex-col gap-1 text-xs text-muted-foreground">
          {td.note}
          <Input id={`${id}-note`} value={note} maxLength={200} placeholder={td.notePlaceholder} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={pending || !day} onClick={() => onPick(day, note)}>
          <CalendarDays /> {day ? `${confirmLabel} · ${formatDay(day, locale)}` : confirmLabel}
        </Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            {t.common.cancel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** On the order page: when the customer wants it, and a way to change it. */
export function DeliveryDayCard({ orderId, deliverOn, editable }: { orderId: string; deliverOn: string | null; editable: boolean }) {
  const { t, locale } = useI18n();
  const td = t.deliveryDay;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [today] = useState(() => businessDay(new Date()));

  function save(day: string | null, note = "") {
    startTransition(async () => {
      const result = await setDeliveryDate({ orderId, day, note });
      if (result.error) {
        toast.error(t.errors[result.error]);
        return;
      }
      toast.success(day ? interpolate(td.savedOn, { day: formatDay(day, locale) }) : td.savedAsap);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-xs text-muted-foreground">{td.title}</span>
          <span className="font-semibold">{deliverOn ? formatDay(deliverOn, locale) : td.asap}</span>
          {deliverOn && shipsLater(deliverOn, today) ? (
            <span className="text-xs text-info">{interpolate(td.shipsOn, { day: formatDay(addDays(deliverOn, -1), locale) })}</span>
          ) : null}
        </div>
        {editable && !open ? (
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            <CalendarDays /> {td.change}
          </Button>
        ) : null}
      </div>
      {open ? (
        <>
          <DeliveryDayPicker initial={deliverOn} pending={pending} confirmLabel={td.save} onPick={(day, note) => save(day, note)} onCancel={() => setOpen(false)} />
          {deliverOn ? (
            <Button size="sm" variant="ghost" className="self-start" disabled={pending} onClick={() => save(null)}>
              {td.backToAsap}
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

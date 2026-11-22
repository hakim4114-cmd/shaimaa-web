"use client";

import { MessageCircle, Phone, PhoneCall } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { changeOrderStatus, logCall } from "@/app/(app)/orders/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { useAutoShipAfterConfirm } from "@/components/orders/order-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import type { AppErrorCode } from "@/lib/data/errors";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { formatMoney } from "@/lib/money";
import type { CallOutcome } from "@/lib/orders/calls";
import { waitLevel, waitMinutes, waitParts, type WaitLevel } from "@/lib/orders/wait";
import { whatsappLink } from "@/lib/orders/whatsapp";
import { cn } from "@/lib/utils";

export type QueueItem = { id: string; name: string; city: string; amountCents: number; createdAt: string; attempts: number; nextCallAt: string | null };

type Current = {
  id: string;
  orderNumber: string;
  name: string;
  phone: string | null;
  address: string;
  city: string;
  createdAt: string;
  attempts: number;
  items: { id: string; label: string; quantity: number; totalCents: number }[];
  shippingFeeCents: number;
  codAmountCents: number;
  campaignName: string | null;
  history: { orders: number; delivered: number; refused: number; blocked: boolean } | null;
  lastCall: { outcome: CallOutcome; note: string | null } | null;
};

const waitTone: Record<WaitLevel, string> = {
  ok: "bg-success-soft text-success",
  mid: "bg-warning-soft text-warning",
  late: "bg-danger-soft text-danger"
};

// Less frequent outcomes, behind "other".
const moreOutcomes: CallOutcome[] = ["busy", "unreachable", "wrong_number", "other"];

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function inOneHour() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return date;
}

function tomorrowMorning() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return date;
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function CallWorkspace({
  queue,
  givenUp,
  dueCount,
  stats,
  current
}: {
  queue: QueueItem[];
  givenUp: { id: string; name: string; city: string; attempts: number }[];
  dueCount: number;
  stats: { confirmedToday: number; noAnswerToday: number; rate: number | null };
  current: Current | null;
}) {
  const { t, locale } = useI18n();
  const tc = t.calls;
  const now = useNow();
  const m = (c: number) => formatMoney(c, locale);
  const waitText = (since: string) => {
    const p = waitParts(waitMinutes(since, now));
    return p.days > 0 ? interpolate(tc.waitDays, { d: p.days, h: p.hours }) : p.hours > 0 ? interpolate(tc.waitHours, { h: p.hours, m: p.minutes }) : interpolate(tc.waitMinutes, { m: p.minutes });
  };
  const position = current ? queue.findIndex((o) => o.id === current.id) : -1;
  const next = current ? (queue.slice(position + 1).find((o) => o.id !== current.id) ?? queue.find((o) => o.id !== current.id) ?? null) : null;

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: tc.left, value: String(dueCount), tone: "" },
          { label: tc.confirmedToday, value: String(stats.confirmedToday), tone: "text-success" },
          { label: tc.noAnswerToday, value: String(stats.noAnswerToday), tone: "text-muted-foreground" },
          { label: tc.rateToday, value: stats.rate === null ? "—" : `${Math.round(stats.rate * 100)}%`, tone: "", hint: tc.rateHint }
        ].map((s) => (
          <div key={s.label} title={"hint" in s ? s.hint : undefined} className="rounded-lg border border-border bg-surface px-3 py-2 shadow-card">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className={cn("tabular text-xl font-bold", s.tone)}>{s.value}</dd>
          </div>
        ))}
      </dl>

      {givenUp.length > 0 ? <GivenUp items={givenUp} /> : null}

      {queue.length === 0 || !current ? (
        <EmptyState icon={PhoneCall} title={tc.emptyTitle} description={tc.emptyDescription} />
      ) : (
        <div className="flex flex-col-reverse gap-4 lg:flex-row">
          <section aria-label={tc.queue} className="overflow-hidden rounded-xl border border-border bg-surface shadow-card lg:w-96 lg:shrink-0">
            <ul className="max-h-[28rem] divide-y divide-border overflow-y-auto lg:max-h-[calc(100dvh-16rem)]">
              {queue.map((o) => {
                const later = o.nextCallAt && Date.parse(o.nextCallAt) > now;
                const level = waitLevel(waitMinutes(o.createdAt, now));
                return (
                  <li key={o.id}>
                    <Link
                      href={`/calls?order=${o.id}`}
                      aria-current={o.id === current.id ? "true" : undefined}
                      className={cn(
                        "flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-hover",
                        o.id === current.id && "bg-accent-soft shadow-[inset_4px_0_0_var(--color-accent)] rtl:shadow-[inset_-4px_0_0_var(--color-accent)]",
                        later && "opacity-60"
                      )}
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-semibold">{o.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {o.city}
                          {o.attempts > 0 ? ` · ${interpolate(tc.attempts, { count: o.attempts })}` : ""}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", later ? "bg-surface-muted text-muted-foreground" : waitTone[level])}>
                          {later ? tc.later : waitText(o.createdAt)}
                        </span>
                        <span className="tabular text-sm font-semibold">{m(o.amountCents)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <CurrentOrder key={current.id} current={current} position={position + 1} total={queue.length} nextId={next?.id ?? null} nextName={next?.name ?? null} waitText={waitText(current.createdAt)} waitClass={waitTone[waitLevel(waitMinutes(current.createdAt, now))]} />
        </div>
      )}
    </div>
  );
}

function CurrentOrder({
  current,
  position,
  total,
  nextId,
  nextName,
  waitText,
  waitClass
}: {
  current: Current;
  position: number;
  total: number;
  nextId: string | null;
  nextName: string | null;
  waitText: string;
  waitClass: string;
}) {
  const { t, locale } = useI18n();
  const tc = t.calls;
  const id = useId();
  const router = useRouter();
  const afterConfirm = useAutoShipAfterConfirm();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"buttons" | "callback" | "cancel">("buttons");
  const [note, setNote] = useState("");
  const [callBack, setCallBack] = useState("");
  const [error, setError] = useState<AppErrorCode | null>(null);
  const m = (c: number) => formatMoney(c, locale);
  const wa = current.phone ? whatsappLink(current.phone) : null;

  function record(outcome: CallOutcome, channel: "phone" | "whatsapp" = "phone") {
    setError(null);
    const callBackAt = outcome === "call_back_requested" && callBack ? new Date(callBack).toISOString() : null;
    startTransition(async () => {
      const result = await logCall({ orderId: current.id, outcome, note, callBackAt, channel });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(`${current.name}: ${t.callOutcome[outcome]}`);
      afterConfirm(current.id, result.confirmed);
      // Straight to the next order: no going back to the list.
      router.push(nextId ? `/calls?order=${nextId}` : "/calls");
      router.refresh();
    });
  }

  return (
    <section aria-label={tc.current} className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {interpolate(tc.position, { n: position, total })} ·{" "}
            <Link href={`/orders/${current.id}`} dir="ltr" className="underline-offset-2 hover:underline">
              {current.orderNumber}
            </Link>
          </span>
          <h2 className="text-xl font-bold">{current.name}</h2>
          {current.phone ? (
            <span dir="ltr" className="tabular text-base">
              {current.phone}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", waitClass)}>{interpolate(tc.waited, { time: waitText })}</span>
          {current.history ? (
            <span className={cn("rounded-full px-2.5 py-1 text-xs", current.history.blocked || current.history.refused > 0 ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent-soft-foreground")}>
              {current.history.orders <= 1 ? tc.newCustomer : interpolate(tc.returning, { orders: current.history.orders - 1, delivered: current.history.delivered, refused: current.history.refused })}
            </span>
          ) : null}
        </div>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-surface-muted px-3 py-2">
          <dt className="text-xs text-muted-foreground">{tc.city}</dt>
          <dd className="font-semibold">{current.city || "—"}</dd>
        </div>
        <div className="rounded-lg bg-surface-muted px-3 py-2">
          <dt className="text-xs text-muted-foreground">{tc.address}</dt>
          <dd className="font-semibold">{current.address || "—"}</dd>
        </div>
        <div className="rounded-lg bg-surface-muted px-3 py-2">
          <dt className="text-xs text-muted-foreground">{tc.campaign}</dt>
          <dd className="font-semibold">{current.campaignName ?? tc.noCampaign}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm">
        {current.items.map((i) => (
          <div key={i.id} className="flex justify-between gap-3">
            <span>
              {i.label} × {i.quantity}
            </span>
            <span className="tabular">{m(i.totalCents)}</span>
          </div>
        ))}
        <div className="flex justify-between gap-3 text-muted-foreground">
          <span>{tc.delivery}</span>
          <span className="tabular">{m(current.shippingFeeCents)}</span>
        </div>
        <div className="flex justify-between gap-3 border-t border-border pt-2 font-bold">
          <span>{tc.cod}</span>
          <span className="tabular">{m(current.codAmountCents)}</span>
        </div>
        <Link href={`/orders/${current.id}/edit`} className="self-start text-sm text-accent underline-offset-2 hover:underline">
          {tc.editOrder}
        </Link>
      </div>

      {current.lastCall ? (
        <p className="text-xs text-muted-foreground">
          {interpolate(tc.lastCall, { outcome: t.callOutcome[current.lastCall.outcome] })}
          {current.lastCall.note ? ` — ${current.lastCall.note}` : ""}
        </p>
      ) : null}

      <div className="flex gap-2">
        {current.phone ? (
          <a href={`tel:${current.phone}`} className={cn(buttonVariants({ size: "md" }), "h-14 flex-[2] text-base")}>
            <Phone /> {interpolate(tc.callName, { name: current.name.split(" ")[0] ?? current.name })}
          </a>
        ) : null}
        {wa ? (
          <a href={wa} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "md", variant: "secondary" }), "h-14 flex-1 text-base")}>
            <MessageCircle /> {tc.whatsapp}
          </a>
        ) : null}
      </div>

      {error ? <FormAlert>{t.errors[error]}</FormAlert> : null}

      {mode === "buttons" ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button type="button" disabled={pending} onClick={() => record("confirmed")} className="min-h-14 rounded-lg bg-success px-3 text-base font-bold text-white dark:text-background transition-opacity hover:opacity-90 disabled:opacity-50">
            ✓ {tc.confirmed}
          </button>
          <button type="button" disabled={pending} onClick={() => record("no_answer")} className="min-h-14 rounded-lg bg-surface-muted px-3 text-base font-semibold text-foreground ring-1 ring-border transition-colors hover:bg-surface-hover disabled:opacity-50">
            {tc.noAnswer}
          </button>
          <button type="button" disabled={pending} onClick={() => setMode("callback")} className="min-h-14 rounded-lg bg-warning-soft px-3 text-base font-semibold text-warning ring-1 ring-warning/40 transition-colors hover:opacity-90 disabled:opacity-50">
            {tc.callBack}
          </button>
          <button type="button" disabled={pending} onClick={() => setMode("cancel")} className="min-h-14 rounded-lg bg-danger px-3 text-base font-bold text-white dark:text-background transition-opacity hover:opacity-90 disabled:opacity-50">
            ✕ {tc.cancelled}
          </button>
        </div>
      ) : null}

      {mode === "callback" ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <Field label={tc.callBackWhen} htmlFor={`${id}-cb`}>
            <Input id={`${id}-cb`} type="datetime-local" dir="ltr" value={callBack} onChange={(e) => setCallBack(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setCallBack(toLocalInput(inOneHour()))}>
              {t.orders.presetHour}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setCallBack(toLocalInput(tomorrowMorning()))}>
              {t.orders.presetTomorrow}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button disabled={pending || !callBack} onClick={() => record("call_back_requested")}>
              {tc.save}
            </Button>
            <Button variant="ghost" onClick={() => setMode("buttons")}>
              {t.common.cancel}
            </Button>
          </div>
        </div>
      ) : null}

      {mode === "cancel" ? (
        <div className="flex flex-col gap-2 rounded-lg border border-danger/40 p-3">
          <Field label={tc.cancelReason} htmlFor={`${id}-why`}>
            <Input id={`${id}-why`} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button variant="danger" disabled={pending || !note.trim()} onClick={() => record("cancelled")}>
              {tc.cancelled}
            </Button>
            <Button variant="ghost" onClick={() => setMode("buttons")}>
              {t.common.cancel}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        {mode === "buttons" ? (
          <div className="min-w-48 flex-1">
            <Field label={tc.note} htmlFor={`${id}-note`}>
              <Input id={`${id}-note`} value={note} maxLength={1000} placeholder={tc.notePlaceholder} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
        ) : null}
        <div className="w-48">
        <Field label={tc.other} htmlFor={`${id}-other`}>
          <NativeSelect
            id={`${id}-other`}
            value=""
            disabled={pending}
            onChange={(e) => {
              if (e.target.value) record(e.target.value as CallOutcome);
            }}
          >
            <option value="">—</option>
            {moreOutcomes.map((o) => (
              <option key={o} value={o}>
                {t.callOutcome[o]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{nextName ? interpolate(tc.next, { name: nextName }) : tc.lastOne}</p>
    </section>
  );
}

/** Orders that did not answer five times: cancel them in one tap (the reason is written for you). */
function GivenUp({ items }: { items: { id: string; name: string; city: string; attempts: number }[] }) {
  const { t } = useI18n();
  const tc = t.calls;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function cancel(id: string, attempts: number) {
    startTransition(async () => {
      const result = await changeOrderStatus({ orderId: id, to: "cancelled", note: interpolate(tc.givenUpReason, { count: attempts }) });
      if (result.error) {
        toast.error(t.errors[result.error]);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-warning/40 bg-warning-soft/40 p-3">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full min-h-11 items-center justify-between gap-3 text-start text-sm font-semibold text-warning">
        <span>{interpolate(tc.givenUpTitle, { count: items.length })}</span>
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <ul className="mt-2 divide-y divide-border rounded-lg bg-surface">
          {items.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <Link href={`/orders/${o.id}`} className="font-medium underline-offset-2 hover:underline">
                {o.name} <span className="text-xs text-muted-foreground">· {o.city} · {interpolate(tc.attempts, { count: o.attempts })}</span>
              </Link>
              <div className="flex gap-2">
                <Link href={`/calls?order=${o.id}`} className={buttonVariants({ size: "sm", variant: "secondary" })}>
                  {tc.tryAgain}
                </Link>
                <Button size="sm" variant="danger" disabled={pending} onClick={() => cancel(o.id, o.attempts)}>
                  {tc.cancelled}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

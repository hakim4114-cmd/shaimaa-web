"use client";

import { Ban, MessageCircle, Phone, StickyNote } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import type { AutoShipResult } from "@/lib/shipping/ship-order";
import { addOrderNote, autoShipOrder, blockNumber, changeOrderStatus, logCall } from "@/app/(app)/orders/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import type { AppErrorCode } from "@/lib/data/errors";
import type { OrderStatus } from "@/lib/domain/order-status";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { callOutcomes, outcomeNeedsNote, outcomeNeedsTime, type CallOutcome } from "@/lib/orders/calls";
import {
  whatsappLanguages,
  whatsappLink,
  whatsappMessage,
  whatsappTemplates,
  type WhatsappContext,
  type WhatsappLanguage,
  type WhatsappTemplate
} from "@/lib/orders/whatsapp";
import { cn } from "@/lib/utils";

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function callBackPresets() {
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
  inOneHour.setMinutes(Math.ceil(inOneHour.getMinutes() / 15) * 15, 0, 0);
  const evening = new Date(now);
  evening.setHours(18, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  return { inOneHour, evening: evening > now ? evening : null, tomorrow };
}

/**
 * After a confirmation: asks the server to send the parcel to Sendit (if the
 * merchant turned it on), as a separate request so the confirmation itself
 * never waits for Sendit, then tells the user what happened.
 */
export function useAutoShipAfterConfirm() {
  const { t } = useI18n();
  const ts = t.shipping;
  const router = useRouter();
  const report = (result: AutoShipResult) => {
    if (result.status === "off") return;
    if (result.status === "shipped") toast.success(interpolate(ts.autoShipped, { code: result.code, district: result.district }));
    else if (result.status === "skipped") toast.info(result.reason === "district_unknown" ? ts.autoShipNoDistrict : ts.autoShipNotPossible);
    else toast.error(`${ts.autoShipFailed} ${t.errors[result.error]}${result.detail ? ` (${result.detail})` : ""}`);
  };
  return (orderId: string, confirmed: boolean | undefined) => {
    if (!confirmed) return;
    void autoShipOrder(orderId)
      .then((result) => {
        report(result);
        if (result.status !== "off") router.refresh();
      })
      .catch(() => toast.error(ts.autoShipFailed));
  };
}

/** Records the outcome of one confirmation call. */

export function CallPanel({ orderId, phoneHref }: { orderId: string; phoneHref: string | null }) {
  const { t } = useI18n();
  const afterConfirm = useAutoShipAfterConfirm();
  const to = t.orders;
  const id = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);
  const [note, setNote] = useState("");
  const [callBack, setCallBack] = useState("");
  const [channel, setChannel] = useState<"phone" | "whatsapp">("phone");
  const [error, setError] = useState<AppErrorCode | null>(null);
  const presets = callBackPresets();

  function save() {
    if (!outcome) return;
    setError(null);
    const callBackAt = outcomeNeedsTime(outcome) && callBack ? new Date(callBack).toISOString() : null;
    startTransition(async () => {
      const result = await logCall({ orderId, outcome, note, callBackAt, channel });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(to.callSaved);
      afterConfirm(orderId, result.confirmed);
      setOutcome(null);
      setNote("");
      setCallBack("");
      setChannel("phone");
      router.refresh();
    });
  }

  return (
    <Card className="border-accent/40">
      <CardHeader
        title={to.sectionCalls}
        description={to.logCall}
        action={
          phoneHref ? (
            <a href={phoneHref} className={buttonVariants({ size: "sm" })}>
              <Phone /> {to.call}
            </a>
          ) : null
        }
      />
      <CardBody className="flex flex-col gap-4">
        {error ? <FormAlert>{t.errors[error]}</FormAlert> : null}
        <div className="flex flex-wrap items-center gap-2 text-sm" role="radiogroup" aria-label={to.channel}>
          <span className="text-muted-foreground">{to.channel}</span>
          {(["phone", "whatsapp"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={channel === value}
              onClick={() => setChannel(value)}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
                channel === value ? "border-accent bg-accent-soft text-accent-soft-foreground" : "border-border bg-surface text-foreground hover:bg-surface-hover"
              )}
            >
              {value === "phone" ? <Phone className="size-4" aria-hidden /> : <MessageCircle className="size-4" aria-hidden />}
              {to.channels[value]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={to.logCall}>
          {callOutcomes.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={outcome === value}
              onClick={() => setOutcome(value)}
              className={cn(
                "min-h-11 rounded-md border px-3 py-2 text-start text-sm font-medium transition-colors",
                outcome === value
                  ? value === "confirmed"
                    ? "border-success bg-success-soft text-success"
                    : value === "cancelled"
                      ? "border-danger bg-danger-soft text-danger"
                      : "border-accent bg-accent-soft text-accent-soft-foreground"
                  : "border-border bg-surface text-foreground hover:bg-surface-hover"
              )}
            >
              {t.callOutcome[value]}
            </button>
          ))}
        </div>

        {outcome && outcomeNeedsTime(outcome) ? (
          <div className="flex flex-col gap-2">
            <Field label={to.callBackTime} htmlFor={`${id}-callback`}>
              <Input id={`${id}-callback`} type="datetime-local" dir="ltr" value={callBack} onChange={(e) => setCallBack(e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setCallBack(toLocalInput(presets.inOneHour))}>
                {to.presetHour}
              </Button>
              {presets.evening ? (
                <Button size="sm" variant="secondary" onClick={() => setCallBack(toLocalInput(presets.evening!))}>
                  {to.presetEvening}
                </Button>
              ) : null}
              <Button size="sm" variant="secondary" onClick={() => setCallBack(toLocalInput(presets.tomorrow))}>
                {to.presetTomorrow}
              </Button>
            </div>
          </div>
        ) : null}

        {outcome ? (
          <Field label={outcomeNeedsNote(outcome) ? to.callNoteRequired : to.callNote} htmlFor={`${id}-note`}>
            <Textarea id={`${id}-note`} value={note} maxLength={1000} rows={2} className="min-h-16" onChange={(e) => setNote(e.target.value)} />
          </Field>
        ) : null}

        <div className="flex justify-end">
          <Button
            onClick={save}
            disabled={!outcome || pending || (outcomeNeedsNote(outcome) && !note.trim()) || (outcomeNeedsTime(outcome) && !callBack)}
          >
            {pending ? t.common.loading : to.saveCall}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

/** Manual workflow steps available before shipping (step 5 adds shipping). */
export function StatusActions({ orderId, status, canManage, canPrepare }: { orderId: string; status: OrderStatus; canManage: boolean; canPrepare: boolean }) {
  const { t } = useI18n();
  const afterConfirm = useAutoShipAfterConfirm();
  const to = t.orders;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AppErrorCode | null>(null);

  const next: OrderStatus | null =
    status === "confirmed" ? "preparing" : status === "preparing" ? "ready_to_ship" : status === "new" || status === "confirmation_pending" ? "confirmed" : null;
  const nextAllowed = next === "confirmed" ? canManage : canPrepare;
  const cancellable = canManage && ["new", "confirmation_pending", "confirmed", "preparing", "ready_to_ship"].includes(status);

  function move(target: OrderStatus, note = "") {
    setError(null);
    startTransition(async () => {
      const result = await changeOrderStatus({ orderId, to: target, note });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(t.orderStatus[target]);
      afterConfirm(orderId, result.confirmed);
      router.refresh();
    });
  }

  if (!(next && nextAllowed) && !cancellable) {
    return status === "ready_to_ship" ? <p className="text-sm text-muted-foreground">{to.shippingLater}</p> : null;
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <FormAlert>{t.errors[error]}</FormAlert> : null}
      <div className="flex flex-wrap gap-2">
        {next && nextAllowed ? (
          <Button onClick={() => move(next)} disabled={pending} variant={next === "confirmed" ? "secondary" : "primary"}>
            {next === "confirmed" ? to.confirmWithoutCall : `${to.moveTo} ${t.orderStatus[next]}`}
          </Button>
        ) : null}
        {cancellable ? <CancelOrderButton pending={pending} onCancel={(reason) => move("cancelled", reason)} /> : null}
      </div>
      {status === "ready_to_ship" ? <p className="text-sm text-muted-foreground">{to.shippingLater}</p> : null}
    </div>
  );
}

function CancelOrderButton({ pending, onCancel }: { pending: boolean; onCancel: (reason: string) => void }) {
  const { t } = useI18n();
  const to = t.orders;
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" disabled={pending}>
          {to.cancelOrder}
        </Button>
      </DialogTrigger>
      <DialogContent role="alertdialog" closeLabel={t.common.close}>
        <DialogTitle>{to.cancelOrder}</DialogTitle>
        <DialogDescription>{to.cancelDescription}</DialogDescription>
        <div className="mt-4">
          <Field label={to.cancelReason} htmlFor={`${id}-reason`}>
            <Textarea id={`${id}-reason`} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button
            variant="danger"
            disabled={!reason.trim() || pending}
            onClick={() => {
              onCancel(reason);
              setOpen(false);
            }}
          >
            {to.confirmCancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Prefilled WhatsApp messages, opened in WhatsApp (nothing is sent automatically). */
export function WhatsappPanel({ phone, context, defaultTemplate }: { phone: string; context: WhatsappContext; defaultTemplate: WhatsappTemplate }) {
  const { t, locale } = useI18n();
  const to = t.orders;
  const id = useId();
  const [language, setLanguage] = useState<WhatsappLanguage>(locale === "fr" ? "fr" : "darija");
  const [template, setTemplate] = useState<WhatsappTemplate>(defaultTemplate);
  const message = whatsappMessage(language, template, context);
  const link = whatsappLink(phone, message);

  return (
    <Card>
      <CardHeader title={to.whatsappTitle} />
      <CardBody className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label={to.whatsappTemplate} htmlFor={`${id}-template`}>
            <NativeSelect id={`${id}-template`} value={template} onChange={(e) => setTemplate(e.target.value as WhatsappTemplate)}>
              {whatsappTemplates.map((value) => (
                <option key={value} value={value}>
                  {to.templates[value]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={to.whatsappLanguage} htmlFor={`${id}-language`}>
            <NativeSelect id={`${id}-language`} value={language} onChange={(e) => setLanguage(e.target.value as WhatsappLanguage)}>
              {whatsappLanguages.map((value) => (
                <option key={value} value={value}>
                  {to.languages[value]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <p dir={language === "fr" ? "ltr" : "rtl"} className="whitespace-pre-line rounded-md bg-surface-muted p-3 text-sm leading-6">
          {message}
        </p>
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants(), "self-start")}>
            <MessageCircle /> {to.openWhatsapp}
          </a>
        ) : null}
      </CardBody>
    </Card>
  );
}

export function NoteForm({ orderId }: { orderId: string }) {
  const { t } = useI18n();
  const to = t.orders;
  const id = useId();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AppErrorCode | null>(null);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await addOrderNote(orderId, note);
          if (result.error) {
            setError(result.error);
            return;
          }
          setNote("");
          router.refresh();
        });
      }}
    >
      {error ? <FormAlert>{t.errors[error]}</FormAlert> : null}
      <label htmlFor={`${id}-note`} className="sr-only">
        {to.addNote}
      </label>
      <Textarea id={`${id}-note`} value={note} maxLength={2000} rows={2} className="min-h-16" placeholder={to.notePlaceholder} onChange={(e) => setNote(e.target.value)} />
      <Button type="submit" variant="secondary" size="sm" className="self-end" disabled={!note.trim() || pending}>
        <StickyNote /> {to.addNote}
      </Button>
    </form>
  );
}

export function BlockNumberButton({ phone, defaultReason }: { phone: string; defaultReason?: string }) {
  const { t } = useI18n();
  const to = t.orders;
  const id = useId();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(defaultReason ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AppErrorCode | null>(null);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft hover:text-danger">
          <Ban /> {to.blockNumber}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={t.common.close}>
        <DialogTitle>{to.blockNumber}</DialogTitle>
        <DialogDescription>{to.blockDescription}</DialogDescription>
        <div className="mt-4 flex flex-col gap-3">
          {error ? <FormAlert>{t.errors[error]}</FormAlert> : null}
          <Field label={t.customers.reason} htmlFor={`${id}-reason`}>
            <Textarea id={`${id}-reason`} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button
            variant="danger"
            disabled={reason.trim().length < 2 || pending}
            onClick={() =>
              startTransition(async () => {
                const result = await blockNumber(phone, reason);
                if (result.error) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
                toast.success(to.blocked);
                router.refresh();
              })
            }
          >
            {to.blockNumber}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

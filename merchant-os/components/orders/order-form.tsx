"use client";

import { CircleAlert, History, Plus, ShieldAlert, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { createOrder, lookupCustomer, updateOrder, type LookupResult, type OrderInput } from "@/app/(app)/orders/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import type { AppErrorCode } from "@/lib/data/errors";
import type { CityOption, SellableVariant } from "@/lib/data/orders";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { formatMoney, parseMoneyToCents } from "@/lib/money";
import { orderSources, type OrderSource } from "@/lib/orders/calls";
import { formatMoroccanPhone, normalizeMoroccanPhone } from "@/lib/phone";
import { parseCustomerMessage } from "@/lib/orders/paste";
import { cn } from "@/lib/utils";

const OTHER_CITY = "other";

export type OrderFormValue = {
  phone: string;
  fullName: string;
  cityId: number | null;
  cityOther: string;
  address: string;
  items: { variantId: string; quantity: number }[];
  shippingFee: string;
  discount: string;
  source: OrderSource;
  notes: string;
  internalNotes: string;
  campaignId?: string | null;
};

type Line = { key: string; variantId: string; quantity: number };


function centsToInput(cents: number) {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

export function OrderForm({
  mode,
  orderId,
  initial,
  cities,
  variants,
  fees,
  canOverrideBlocklist,
  campaigns = [],
  deliveryIncluded = false
}: {
  mode: "create" | "edit";
  orderId?: string;
  initial: OrderFormValue;
  cities: CityOption[];
  variants: SellableVariant[];
  fees: Record<number, number>;
  canOverrideBlocklist: boolean;
  campaigns?: { id: string; name: string }[];
  /** Organization default: the product price already includes delivery. */
  deliveryIncluded?: boolean;
}) {
  const { t, locale } = useI18n();
  const to = t.orders;
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AppErrorCode | null>(null);

  const [phone, setPhone] = useState(initial.phone);
  const [fullName, setFullName] = useState(initial.fullName);
  const [cityValue, setCityValue] = useState(initial.cityId ? String(initial.cityId) : initial.cityOther ? OTHER_CITY : "");
  const [cityOther, setCityOther] = useState(initial.cityOther);
  const [address, setAddress] = useState(initial.address);
  const [pasted, setPasted] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  // Keys must be identical on the server and the client (hydration), so they come from the index first.
  const [lines, setLines] = useState<Line[]>(() =>
    (initial.items.length ? initial.items : [{ variantId: "", quantity: 1 }]).map((item, index) => ({ ...item, key: `line-${index}` }))
  );
  const lineCounter = useRef(lines.length);
  const newKey = () => `line-${lineCounter.current++}`;
  const [shippingFee, setShippingFee] = useState(initial.shippingFee);
  const [shippingTouched, setShippingTouched] = useState(mode === "edit");
  // Delivery included in the price (fee 0) or paid by the customer; the default comes from Settings.
  const [included, setIncluded] = useState(mode === "edit" ? deliveryIncluded && initial.shippingFee.trim() === "0" : deliveryIncluded);
  const [discount, setDiscount] = useState(initial.discount);
  const [source, setSource] = useState<OrderSource>(initial.source);
  const [notes, setNotes] = useState(initial.notes);
  const [internalNotes, setInternalNotes] = useState(initial.internalNotes);
  const [allowBlocked, setAllowBlocked] = useState(false);
  const [campaignId, setCampaignId] = useState(initial.campaignId ?? "");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const lookedUp = useRef<string | null>(null);

  const cityLabel = (city: CityOption) => (locale === "ar" ? city.nameAr : city.nameFr);
  const sortedCities = useMemo(
    () => [...cities].sort((a, b) => cityLabel(a).localeCompare(cityLabel(b), locale)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cities, locale]
  );
  const variantById = useMemo(() => new Map(variants.map((variant) => [variant.id, variant])), [variants]);

  const normalizedPhone = normalizeMoroccanPhone(phone);
  const phoneInvalid = phone.trim().length >= 9 && !normalizedPhone;

  // Customer history as soon as the number is complete (create mode only).
  useEffect(() => {
    if (mode !== "create" || !normalizedPhone || lookedUp.current === normalizedPhone) return;
    lookedUp.current = normalizedPhone;
    let cancelled = false;
    lookupCustomer(normalizedPhone).then((result) => {
      if (cancelled) return;
      setLookup(result);
      if (result.customer) {
        setFullName((current) => current || result.customer!.fullName);
        setAddress((current) => current || result.customer!.address);
        const known = cities.find((city) => city.nameFr === result.customer!.city);
        if (known) {
          setCityValue((current) => current || String(known.id));
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mode, normalizedPhone, cities]);

  const cityId = cityValue && cityValue !== OTHER_CITY ? Number(cityValue) : null;
  const rateCents = cityId !== null ? fees[cityId] : undefined;

  // The shipping fee follows the city's rate until the user types their own.
  const effectiveShipping = included ? "0" : shippingTouched ? shippingFee : rateCents !== undefined ? centsToInput(rateCents) : "";

  const subtotal = lines.reduce((sum, line) => sum + (variantById.get(line.variantId)?.priceCents ?? 0) * line.quantity, 0);
  const shippingCents = parseMoneyToCents(effectiveShipping) ?? 0;
  const discountCents = parseMoneyToCents(discount) ?? 0;
  const total = Math.max(0, subtotal - discountCents) + shippingCents;
  const history = lookup?.phone === normalizedPhone ? lookup.history : null;
  const blocked = Boolean(history?.blocked);

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const input: OrderInput = {
      phone,
      fullName,
      cityId,
      cityOther: cityValue === OTHER_CITY ? cityOther : "",
      address,
      items: lines.filter((line) => line.variantId).map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
      shippingFee: effectiveShipping,
      discount,
      source,
      notes,
      internalNotes,
      allowBlocked,
      campaignId: mode === "create" && campaignId ? campaignId : null
    };
    startTransition(async () => {
      const result = mode === "create" ? await createOrder(input) : await updateOrder(orderId!, input);
      if (result.error) {
        setError(result.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.push(`/orders/${result.orderId}`);
      router.refresh();
    });
  }

  if (variants.length === 0 && mode === "create") {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3 py-8">
          <p className="font-medium">{to.noProducts}</p>
          <p className="text-sm text-muted-foreground">{to.noProductsHint}</p>
          <Link href="/products/new" className={buttonVariants()}>
            <Plus /> {t.products.new}
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      {error ? <FormAlert>{t.errors[error]}</FormAlert> : null}

      <Card>
        <CardHeader title={to.sectionCustomer} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          {mode === "create" ? (
            <details className="rounded-md bg-surface-muted p-3 text-sm sm:col-span-2" open={pasteOpen} onToggle={(e) => setPasteOpen(e.currentTarget.open)}>
              <summary className="cursor-pointer font-medium">{to.pasteTitle}</summary>
              <div className="mt-2 flex flex-col gap-2">
                <Textarea
                  value={pasted}
                  rows={4}
                  maxLength={2000}
                  placeholder={to.pastePlaceholder}
                  aria-label={to.pasteTitle}
                  onChange={(e) => setPasted(e.target.value)}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!pasted.trim()}
                    onClick={() => {
                      const found = parseCustomerMessage(pasted, cities);
                      if (found.phone) setPhone(formatMoroccanPhone(found.phone));
                      if (found.fullName) setFullName(found.fullName);
                      if (found.cityId !== null) setCityValue(String(found.cityId));
                      if (found.address) setAddress(found.address);
                      setPasteOpen(false);
                      setPasted("");
                    }}
                  >
                    {to.pasteApply}
                  </Button>
                  <span className="text-xs text-muted-foreground">{to.pasteHint}</span>
                </div>
              </div>
            </details>
          ) : null}
          <Field label={to.phone} htmlFor={`${id}-phone`} hint={mode === "edit" ? to.phoneLocked : to.phoneHint} error={phoneInvalid ? t.errors.PHONE_INVALID : undefined}>
            <Input
              id={`${id}-phone`}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              dir="ltr"
              autoFocus={mode === "create"}
              value={phone}
              readOnly={mode === "edit"}
              aria-invalid={phoneInvalid || undefined}
              placeholder="06 12 34 56 78"
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => normalizedPhone && setPhone(formatMoroccanPhone(normalizedPhone))}
            />
          </Field>
          <Field label={to.fullName} htmlFor={`${id}-name`}>
            <Input id={`${id}-name`} value={fullName} maxLength={120} autoComplete="off" onChange={(e) => setFullName(e.target.value)} />
          </Field>

          {history ? (
            <div className="sm:col-span-2">
              <CustomerHistoryNote history={history} />
              {blocked && canOverrideBlocklist ? (
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={allowBlocked} onChange={(e) => setAllowBlocked(e.target.checked)} />
                  {to.allowBlocked}
                </label>
              ) : null}
            </div>
          ) : null}

          <Field label={to.city} htmlFor={`${id}-city`}>
            <NativeSelect id={`${id}-city`} value={cityValue} onChange={(e) => setCityValue(e.target.value)}>
              <option value="">{to.cityPlaceholder}</option>
              {sortedCities.map((city) => (
                <option key={city.id} value={city.id}>
                  {cityLabel(city)}
                </option>
              ))}
              <option value={OTHER_CITY}>{to.cityOther}</option>
            </NativeSelect>
          </Field>
          <Field label={to.source} htmlFor={`${id}-source`}>
            <NativeSelect id={`${id}-source`} value={source} disabled={mode === "edit"} onChange={(e) => setSource(e.target.value as OrderSource)}>
              {orderSources.map((value) => (
                <option key={value} value={value}>
                  {t.orderSource[value]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {mode === "create" && campaigns.length > 0 ? (
            <Field label={t.money.campaign} htmlFor={`${id}-campaign`} hint={t.money.attributionHint}>
              <NativeSelect id={`${id}-campaign`} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
                <option value="">{t.money.noCampaign}</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ) : null}
          {cityValue === OTHER_CITY ? (
            <div className="sm:col-span-2">
              <Field label={to.cityOtherLabel} htmlFor={`${id}-city-other`}>
                <Input id={`${id}-city-other`} value={cityOther} maxLength={80} onChange={(e) => setCityOther(e.target.value)} />
              </Field>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <Field label={to.address} htmlFor={`${id}-address`} hint={to.addressHint}>
              <Textarea id={`${id}-address`} value={address} maxLength={500} rows={2} className="min-h-16" onChange={(e) => setAddress(e.target.value)} />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={to.sectionItems} />
        <CardBody className="flex flex-col gap-4">
          {lines.map((line, index) => {
            const variant = variantById.get(line.variantId);
            return (
              <div key={line.key} className="grid grid-cols-[1fr_5.5rem_auto] items-end gap-2 sm:grid-cols-[1fr_7rem_auto] sm:gap-3">
                <Field label={index === 0 ? to.product : `${to.product} ${index + 1}`} htmlFor={`${id}-${line.key}-variant`}>
                  <NativeSelect id={`${id}-${line.key}-variant`} value={line.variantId} onChange={(e) => updateLine(line.key, { variantId: e.target.value })}>
                    <option value="">{to.productPlaceholder}</option>
                    {variants.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label} · {formatMoney(option.priceCents, locale)}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label={to.quantity} htmlFor={`${id}-${line.key}-qty`}>
                  <Input
                    id={`${id}-${line.key}-qty`}
                    type="number"
                    inputMode="numeric"
                    dir="ltr"
                    min={1}
                    max={1000}
                    value={line.quantity}
                    onChange={(e) => updateLine(line.key, { quantity: Math.min(1000, Math.max(1, Math.floor(Number(e.target.value) || 1))) })}
                  />
                </Field>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={to.removeItem}
                  disabled={lines.length === 1}
                  onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                >
                  <Trash2 />
                </Button>
                {variant ? (
                  <p className={cn("col-span-3 -mt-1 text-xs", variant.available < line.quantity ? "font-medium text-warning" : "text-muted-foreground")}>
                    <span className="text-foreground">{variant.label}</span> ·{" "}
                    {variant.available > 0 ? interpolate(to.availableStock, { count: variant.available }) : to.outOfStock}
                    {variant.available < line.quantity ? ` · ${to.stockWarning}` : ""}
                  </p>
                ) : null}
              </div>
            );
          })}
          <div>
            <Button variant="secondary" onClick={() => setLines((current) => [...current, { key: newKey(), variantId: "", quantity: 1 }])} disabled={lines.length >= 50}>
              <Plus /> {to.addItem}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={to.sectionPayment} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-wrap items-center gap-2 text-sm sm:col-span-2" role="radiogroup" aria-label={to.deliveryMode}>
            <span className="text-muted-foreground">{to.deliveryMode}</span>
            {([false, true] as const).map((value) => (
              <button
                key={String(value)}
                type="button"
                role="radio"
                aria-checked={included === value}
                onClick={() => setIncluded(value)}
                className={cn(
                  "min-h-9 rounded-full border px-3 text-sm font-medium transition-colors",
                  included === value ? "border-accent bg-accent-soft text-accent-soft-foreground" : "border-border bg-surface text-foreground hover:bg-surface-hover"
                )}
              >
                {value ? to.deliveryIncluded : to.deliveryPaid}
              </button>
            ))}
          </div>
          {included ? (
            <p className="text-sm text-muted-foreground sm:col-span-1">{to.deliveryIncludedHint}</p>
          ) : (
            <Field
              label={to.shippingFee}
              htmlFor={`${id}-shipping`}
              hint={cityId !== null && rateCents === undefined && !shippingTouched ? to.noRate : to.shippingFeeHint}
            >
              <Input
                id={`${id}-shipping`}
                dir="ltr"
                inputMode="decimal"
                value={effectiveShipping}
                placeholder="0"
                onChange={(e) => {
                  setShippingTouched(true);
                  setShippingFee(e.target.value);
                }}
              />
            </Field>
          )}
          <Field label={to.discount} htmlFor={`${id}-discount`}>
            <Input id={`${id}-discount`} dir="ltr" inputMode="decimal" value={discount} placeholder="0" onChange={(e) => setDiscount(e.target.value)} />
          </Field>
          <dl className="grid gap-1.5 rounded-md bg-surface-muted p-4 text-sm sm:col-span-2">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{to.subtotal}</dt>
              <dd className="tabular">{formatMoney(subtotal, locale)}</dd>
            </div>
            {discountCents > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{to.discount}</dt>
                <dd className="tabular">−{formatMoney(discountCents, locale)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{to.shippingFee}</dt>
              <dd className="tabular">{formatMoney(shippingCents, locale)}</dd>
            </div>
            <div className="mt-1 flex justify-between gap-4 border-t border-border pt-2 text-base font-semibold">
              <dt>{to.cod}</dt>
              <dd className="tabular">{formatMoney(total, locale)}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={to.sectionNotes} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label={to.notes} htmlFor={`${id}-notes`}>
            <Textarea id={`${id}-notes`} value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <Field label={to.internalNotes} htmlFor={`${id}-internal`}>
            <Textarea id={`${id}-internal`} value={internalNotes} maxLength={4000} onChange={(e) => setInternalNotes(e.target.value)} />
          </Field>
        </CardBody>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <span className="tabular me-auto text-sm font-semibold sm:hidden">{formatMoney(total, locale)}</span>
        <Link href={mode === "edit" ? `/orders/${orderId}` : "/orders"} className={buttonVariants({ variant: "secondary" })}>
          {t.common.cancel}
        </Link>
        <Button type="submit" disabled={pending || (blocked && !allowBlocked)}>
          {pending ? t.common.loading : mode === "create" ? to.create : to.saveChanges}
        </Button>
      </div>
    </form>
  );
}

export function CustomerHistoryNote({ history }: { history: NonNullable<LookupResult["history"]> }) {
  const { t } = useI18n();
  const to = t.orders;
  if (history.blocked) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">{to.blockedTitle}</p>
          {history.blockReason ? <p>{interpolate(to.blockedReason, { reason: history.blockReason })}</p> : null}
        </div>
      </div>
    );
  }
  if (history.ordersTotal === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <UserRound className="size-4" aria-hidden /> {to.historyNew}
      </p>
    );
  }
  const risky = history.refused > 0 || history.returned > 0;
  return (
    <div className={cn("flex items-start gap-2 rounded-md px-3 py-2.5 text-sm", risky ? "bg-warning-soft text-warning" : "bg-surface-muted text-foreground")}>
      {risky ? <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> : <History className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />}
      <div>
        <p className="font-medium">
          {interpolate(to.historyStats, {
            total: history.ordersTotal,
            delivered: history.delivered,
            refused: history.refused,
            cancelled: history.cancelled
          })}
        </p>
        {risky ? <p>{to.historyRisk}</p> : null}
      </div>
    </div>
  );
}

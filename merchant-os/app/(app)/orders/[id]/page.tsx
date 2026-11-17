import { ArrowLeft, MapPin, Pencil, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlockNumberButton, CallPanel, NoteForm, StatusActions, WhatsappPanel } from "@/components/orders/order-actions";
import { CustomerHistoryNote } from "@/components/orders/order-form";
import { ShipmentPanel } from "@/components/shipping/shipment-panel";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/ui/order-status-badge";
import { requireOrganization } from "@/lib/data/context";
import { getCustomerHistory, getOrder } from "@/lib/data/orders";
import { getActiveShipment, getSenditProvider } from "@/lib/data/shipping";
import { formatDateTime } from "@/lib/datetime";
import { interpolate } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/money";
import type { WhatsappTemplate } from "@/lib/orders/whatsapp";
import { formatMoroccanPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

const uuid = /^[0-9a-f-]{36}$/i;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { t } = await getI18n();
  const { id } = await params;
  return { title: `${t.orders.title} · ${id.slice(0, 8)}` };
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.test(id)) notFound();
  const { t, locale } = await getI18n();
  const to = t.orders;
  const { supabase, organizationId, organizationName, can } = await requireOrganization();
  const order = await getOrder(supabase, organizationId, id, { withContacts: can.seeContacts, withCalls: can.manageOrders });
  if (!order) notFound();

  const awaitingConfirmation = order.status === "new" || order.status === "confirmation_pending";
  const shippable = ["confirmed", "preparing", "ready_to_ship"].includes(order.status);
  const [shipment, sendit] = await Promise.all([
    getActiveShipment(supabase, organizationId, order.id),
    shippable ? getSenditProvider(supabase, organizationId) : Promise.resolve(null)
  ]);
  const history = can.manageOrders && order.contact ? await getCustomerHistory(supabase, organizationId, order.contact.phone) : null;
  const itemsText = order.items.map((item) => `• ${item.productName}${item.variantTitle ? ` (${item.variantTitle})` : ""} × ${item.quantity}`).join("\n");
  const defaultTemplate: WhatsappTemplate =
    order.status === "cancelled" ? "cancelled" : awaitingConfirmation ? (order.callAttempts > 0 ? "noAnswer" : "confirm") : "confirmed";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link href="/orders" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> {to.title}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="tabular text-xl font-semibold tracking-tight">{order.orderNumber}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          {awaitingConfirmation && can.manageOrders ? (
            <Link href={`/orders/${order.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <Pencil /> {to.edit}
            </Link>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {interpolate(to.createdAt, { date: formatDateTime(order.createdAt, locale) })} · {t.orderSource[order.source]}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {awaitingConfirmation && can.manageOrders ? <CallPanel orderId={order.id} phoneHref={order.contact ? `tel:${order.contact.phone}` : null} /> : null}

          <Card>
            <CardHeader title={to.sectionItems} />
            <ul className="divide-y divide-border">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="font-medium break-words">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {[item.variantTitle, item.sku].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="tabular shrink-0 text-end text-sm">
                    <p className="font-medium">{formatMoney(item.lineTotalCents, locale)}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {formatMoney(item.unitPriceCents, locale)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="grid gap-1.5 border-t border-border px-5 py-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{to.subtotal}</dt>
                <dd className="tabular">{formatMoney(order.subtotalCents, locale)}</dd>
              </div>
              {order.discountCents > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{to.discount}</dt>
                  <dd className="tabular">−{formatMoney(order.discountCents, locale)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{to.shippingFee}</dt>
                <dd className="tabular">{formatMoney(order.shippingFeeCents, locale)}</dd>
              </div>
              <div className="mt-1 flex justify-between gap-4 border-t border-border pt-2 text-base font-semibold">
                <dt>{to.cod}</dt>
                <dd className="tabular">{formatMoney(order.codAmountCents, locale)}</dd>
              </div>
            </dl>
          </Card>

          {shipment || (shippable && can.prepareOrders) ? (
            <ShipmentPanel
              orderId={order.id}
              orderCity={order.city}
              shipment={shipment}
              senditEnabled={Boolean(sendit?.isActive)}
              canShip={can.prepareOrders && can.seeContacts}
            />
          ) : null}

          {(can.manageOrders || can.prepareOrders) && !shipment ? (
            <Card>
              <CardHeader title={to.statusActions} />
              <CardBody>
                <StatusActions orderId={order.id} status={order.status} canManage={can.manageOrders} canPrepare={can.prepareOrders} />
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title={to.history} />
            <CardBody className="flex flex-col gap-4">
              <NoteForm orderId={order.id} />
              <ol className="flex flex-col gap-3">
                {order.events.map((event) => (
                  <li key={event.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-border-strong" aria-hidden />
                    <div className="min-w-0">
                      <p className="font-medium">
                        {event.type === "status_changed" && event.toStatus
                          ? `${to.events.status_changed}: ${t.orderStatus[event.toStatus]}`
                          : (to.events[event.type as keyof typeof to.events] ?? event.type)}
                      </p>
                      {event.note ? <p className="whitespace-pre-line break-words text-muted-foreground">{event.type === "call" ? formatCallNote(event.note, t.callOutcome) : event.note}</p> : null}
                      <p className="text-xs text-subtle-foreground">{formatDateTime(event.createdAt, locale)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title={to.customer} />
            <CardBody className="flex flex-col gap-3 text-sm">
              {order.contact ? (
                <>
                  <p className="text-base font-semibold break-words">{order.contact.fullName}</p>
                  <a href={`tel:${order.contact.phone}`} className="tabular inline-flex w-fit items-center gap-2 text-accent hover:underline" dir="ltr">
                    <Phone className="size-4" aria-hidden /> {formatMoroccanPhone(order.contact.phone)}
                  </a>
                  <p className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span className="break-words">{[order.city, order.contact.address].filter(Boolean).join(" — ") || "—"}</span>
                  </p>
                  {history ? <CustomerHistoryNote history={history} /> : null}
                  {can.manageOrders && history && !history.blocked ? (
                    <div>
                      <BlockNumberButton phone={order.contact.phone} />
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-muted-foreground">{to.noContactAccess}</p>
              )}
              {order.notes ? (
                <div className="rounded-md bg-surface-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">{to.notes}</p>
                  <p className="whitespace-pre-line break-words">{order.notes}</p>
                </div>
              ) : null}
              {order.internalNotes && can.manageOrders ? (
                <div className="rounded-md bg-surface-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">{to.internalNotes}</p>
                  <p className="whitespace-pre-line break-words">{order.internalNotes}</p>
                </div>
              ) : null}
            </CardBody>
          </Card>

          {order.contact && can.manageOrders ? (
            <WhatsappPanel
              phone={order.contact.phone}
              defaultTemplate={defaultTemplate}
              context={{
                customerName: order.contact.fullName,
                storeName: organizationName,
                orderNumber: order.orderNumber,
                items: itemsText,
                total: formatMoney(order.codAmountCents, locale),
                city: order.city
              }}
            />
          ) : null}

          {can.manageOrders && order.calls.length > 0 ? (
            <Card>
              <CardHeader title={interpolate(to.attempts, { count: order.calls.length })} />
              <ul className="divide-y divide-border">
                {order.calls.map((call) => (
                  <li key={call.id} className="px-5 py-3 text-sm">
                    <p className={cn("font-medium", call.outcome === "confirmed" && "text-success", call.outcome === "cancelled" && "text-danger")}>
                      {t.callOutcome[call.outcome]}
                    </p>
                    {call.callBackAt ? <p className="text-xs text-warning">{interpolate(to.callBackAt, { time: formatDateTime(call.callBackAt, locale, "short") })}</p> : null}
                    {call.note ? <p className="break-words text-muted-foreground">{call.note}</p> : null}
                    <p className="text-xs text-subtle-foreground">{formatDateTime(call.createdAt, locale, "short")}</p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Call events are stored as "<outcome>: <note>" (see log_call_attempt).
function formatCallNote(note: string, labels: Record<string, string>) {
  const [outcome, ...rest] = note.split(": ");
  const label = outcome ? labels[outcome] : undefined;
  return label ? [label, rest.join(": ")].filter(Boolean).join(" — ") : note;
}

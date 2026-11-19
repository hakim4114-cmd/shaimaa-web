import { notFound, redirect } from "next/navigation";
import { OrderForm } from "@/components/orders/order-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrganization } from "@/lib/data/context";
import { defaultShippingFees, getOrder, listCities, listSellableVariants } from "@/lib/data/orders";
import { interpolate } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
import { formatMoroccanPhone } from "@/lib/phone";

const uuid = /^[0-9a-f-]{36}$/i;

function centsToInput(cents: number) {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.orders.edit };
}

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.test(id)) notFound();
  const { t } = await getI18n();
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.manageOrders) redirect(`/orders/${id}`);
  const order = await getOrder(supabase, organizationId, id, { withContacts: true, withCalls: false });
  if (!order) notFound();
  if (order.status !== "new" && order.status !== "confirmation_pending") redirect(`/orders/${id}`);

  const [cities, sellable, fees, org] = await Promise.all([
    listCities(supabase),
    listSellableVariants(supabase, organizationId),
    defaultShippingFees(supabase, organizationId),
    supabase.from("organizations").select("delivery_included").eq("id", organizationId).maybeSingle()
  ]);
  const deliveryIncluded = org.data?.delivery_included ?? false;
  // Lines whose variant is no longer on sale stay visible so they are not dropped silently.
  const known = new Set(sellable.map((v) => v.id));
  const variants = [
    ...sellable,
    ...order.items
      .filter((item) => !known.has(item.variantId))
      .map((item) => ({
        id: item.variantId,
        label: `${item.productName}${item.variantTitle ? ` — ${item.variantTitle}` : ""} (${t.orders.notOnSale})`,
        productName: item.productName,
        variantTitle: item.variantTitle,
        priceCents: item.unitPriceCents,
        available: 0
      }))
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title={interpolate(t.orders.editTitle, { number: order.orderNumber })} description={t.orders.editDescription} />
      <OrderForm
        deliveryIncluded={deliveryIncluded}
        mode="edit"
        orderId={order.id}
        cities={cities}
        variants={variants}
        fees={fees}
        canOverrideBlocklist={can.overrideBlocklist}
        initial={{
          phone: order.contact ? formatMoroccanPhone(order.contact.phone) : "",
          fullName: order.contact?.fullName ?? "",
          cityId: order.cityId,
          cityOther: order.cityId ? "" : order.city,
          address: order.contact?.address ?? "",
          items: order.items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
          shippingFee: centsToInput(order.shippingFeeCents),
          discount: order.discountCents ? centsToInput(order.discountCents) : "",
          source: order.source,
          notes: order.notes,
          internalNotes: order.internalNotes
        }}
      />
    </div>
  );
}

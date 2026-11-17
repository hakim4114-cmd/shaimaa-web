import { redirect } from "next/navigation";
import { OrderForm } from "@/components/orders/order-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrganization } from "@/lib/data/context";
import { defaultShippingFees, listCities, listSellableVariants } from "@/lib/data/orders";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.orders.newTitle };
}

export default async function NewOrderPage() {
  const { t } = await getI18n();
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.manageOrders) {
    redirect("/orders");
  }
  const [cities, variants, fees] = await Promise.all([
    listCities(supabase),
    listSellableVariants(supabase, organizationId),
    defaultShippingFees(supabase, organizationId)
  ]);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title={t.orders.newTitle} description={t.orders.newDescription} />
      <OrderForm
        mode="create"
        cities={cities}
        variants={variants}
        fees={fees}
        canOverrideBlocklist={can.overrideBlocklist}
        initial={{ phone: "", fullName: "", cityId: null, cityOther: "", address: "", items: [], shippingFee: "", discount: "", source: "whatsapp", notes: "", internalNotes: "" }}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { OrderForm } from "@/components/orders/order-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrganization } from "@/lib/data/context";
import { listCampaigns } from "@/lib/data/money";
import { defaultShippingFees, listCities, listSellableVariants } from "@/lib/data/orders";
import { businessDay } from "@/lib/datetime";
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
  const [cities, variants, fees, campaigns] = await Promise.all([
    listCities(supabase),
    listSellableVariants(supabase, organizationId),
    defaultShippingFees(supabase, organizationId),
    listCampaigns(supabase, organizationId)
  ]);
  const today = businessDay(new Date());
  const activeCampaigns = campaigns.filter((c) => !c.endsOn || c.endsOn >= today).map((c) => ({ id: c.id, name: c.name }));
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title={t.orders.newTitle} description={t.orders.newDescription} />
      <OrderForm
        mode="create"
        cities={cities}
        variants={variants}
        fees={fees}
        canOverrideBlocklist={can.overrideBlocklist}
        campaigns={activeCampaigns}
        initial={{ phone: "", fullName: "", cityId: null, cityOther: "", address: "", items: [], shippingFee: "", discount: "", source: "whatsapp", notes: "", internalNotes: "" }}
      />
    </div>
  );
}

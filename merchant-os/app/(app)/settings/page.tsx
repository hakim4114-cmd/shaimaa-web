import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SenditSettingsForm } from "@/components/shipping/sendit-settings-form";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrganization } from "@/lib/data/context";
import { getSenditProvider } from "@/lib/data/shipping";
import { defaultShippingFees, listCities } from "@/lib/data/orders";
import { ShippingRatesForm } from "@/components/shipping/shipping-rates-form";
import { getI18n } from "@/lib/i18n/server";
import { formatMoroccanPhone } from "@/lib/phone";
import { senditKeys } from "@/lib/shipping/sendit";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.shipping.settingsTitle };
}

export default async function SettingsPage() {
  const { t } = await getI18n();
  const ts = t.shipping;
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) redirect("/");
  const [provider, cities, fees] = await Promise.all([getSenditProvider(supabase, organizationId), listCities(supabase), defaultShippingFees(supabase, organizationId)]);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || (host ? `${proto}://${host}` : "");
  const s = provider?.settings;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title={ts.settingsTitle} description={ts.settingsDescription} />
      <Card>
        <CardHeader title="Sendit" description={ts.senditDescription} />
        <CardBody>
          <SenditSettingsForm
            keysConfigured={Boolean(senditKeys())}
            webhookUrl={provider ? `${origin}/api/webhooks/sendit/${provider.id}` : null}
            initial={{
              active: provider?.isActive ?? true,
              pickupDistrictId: s?.pickupDistrictId ?? null,
              pickupCity: s?.pickupCity ?? "",
              pickupName: s?.pickupName ?? "",
              pickupPhone: s?.pickupPhone ? formatMoroccanPhone(s.pickupPhone) : "",
              pickupAddress: s?.pickupAddress ?? "",
              allowOpen: s?.allowOpen ?? true,
              allowTry: s?.allowTry ?? true
            }}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={ts.ratesTitle} description={ts.ratesDescription} />
        <CardBody>
          <ShippingRatesForm cities={cities.map((c) => ({ id: c.id, nameFr: c.nameFr, nameAr: c.nameAr }))} fees={fees} />
        </CardBody>
      </Card>
    </div>
  );
}

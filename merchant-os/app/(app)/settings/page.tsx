import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SenditSettingsForm } from "@/components/shipping/sendit-settings-form";
import { Bot, MapPinned, Store, Truck } from "lucide-react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { interpolate } from "@/lib/i18n/dictionaries";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrganization } from "@/lib/data/context";
import { getSenditProvider } from "@/lib/data/shipping";
import { defaultShippingFees, listCities } from "@/lib/data/orders";
import { ShippingRatesForm } from "@/components/shipping/shipping-rates-form";
import { DeliveryPricingForm } from "@/components/shipping/delivery-pricing-form";
import { SenditRatesImport } from "@/components/shipping/sendit-rates-import";
import { AssistantLinks } from "@/components/shipping/assistant-links";
import { StoreConnections, type StoreRow } from "@/components/stores/store-connections";
import { getI18n } from "@/lib/i18n/server";
import { formatMoroccanPhone } from "@/lib/phone";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.shipping.settingsTitle };
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const { t } = await getI18n();
  const ts = t.shipping;
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) redirect("/");
  const [provider, cities, fees, tokens, stores, org] = await Promise.all([
    getSenditProvider(supabase, organizationId),
    listCities(supabase),
    defaultShippingFees(supabase, organizationId),
    supabase.from("assistant_tokens").select("id, name, created_at, last_used_at").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("stores").select("id, name, platform, is_active, last_order_at").eq("organization_id", organizationId).order("created_at"),
    supabase.from("organizations").select("delivery_included").eq("id", organizationId).maybeSingle()
  ]);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || (host ? `${proto}://${host}` : "");
  const s = provider?.settings;
  // A link (or a test) can open one section directly: /settings?section=sendit
  const open = (await searchParams).section;
  const tset = t.settingsPage;
  const storeRows = stores.data ?? [];
  const activeStores = storeRows.filter((r) => r.is_active).length;
  const pricedCities = Object.keys(fees).length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      <PageHeader title={ts.settingsTitle} description={ts.settingsDescription} />
      <CollapsibleCard
        id="stores"
        icon={Store}
        title={t.stores.title}
        status={storeRows.length ? interpolate(tset.storesStatus, { active: activeStores, total: storeRows.length }) : tset.storesNone}
        tone={activeStores ? "ok" : "neutral"}
        defaultOpen={open === "stores"}
      >
        <p className="mb-4 text-sm text-muted-foreground">{t.stores.description}</p>
        <StoreConnections
          origin={origin}
          stores={storeRows.map((row): StoreRow => ({ id: row.id, name: row.name, platform: row.platform, active: row.is_active, lastOrderAt: row.last_order_at }))}
        />
      </CollapsibleCard>
      <CollapsibleCard
        id="sendit"
        icon={Truck}
        title="Sendit"
        status={provider?.credentialsSet ? (s?.autoShip ? tset.senditAuto : tset.senditReady) : tset.senditTodo}
        tone={provider?.credentialsSet ? "ok" : "todo"}
        defaultOpen={open === "sendit" || !provider?.credentialsSet}
      >
        <p className="mb-4 text-sm text-muted-foreground">{ts.senditDescription}</p>
        <SenditSettingsForm
          keysConfigured={provider?.credentialsSet ?? false}
          webhookUrl={provider ? `${origin}/api/webhooks/sendit/${provider.id}` : null}
          initial={{
            active: provider?.isActive ?? true,
            pickupDistrictId: s?.pickupDistrictId ?? null,
            pickupCity: s?.pickupCity ?? "",
            pickupName: s?.pickupName ?? "",
            pickupPhone: s?.pickupPhone ? formatMoroccanPhone(s.pickupPhone) : "",
            pickupAddress: s?.pickupAddress ?? "",
            allowOpen: s?.allowOpen ?? true,
            allowTry: s?.allowTry ?? true,
            autoShip: s?.autoShip ?? false
          }}
        />
      </CollapsibleCard>
      <CollapsibleCard
        id="rates"
        icon={MapPinned}
        title={ts.ratesTitle}
        status={interpolate(org.data?.delivery_included ? tset.ratesIncluded : tset.ratesPaid, { count: pricedCities, total: cities.length })}
        tone={pricedCities ? "ok" : "todo"}
        defaultOpen={open === "rates"}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{ts.ratesDescription}</p>
          <DeliveryPricingForm included={org.data?.delivery_included ?? false} />
          {provider?.credentialsSet ? <SenditRatesImport /> : null}
          <ShippingRatesForm cities={cities.map((c) => ({ id: c.id, nameFr: c.nameFr, nameAr: c.nameAr }))} fees={fees} />
        </div>
      </CollapsibleCard>
      <CollapsibleCard
        id="assistant"
        icon={Bot}
        title={t.assistant.title}
        status={interpolate(tset.assistantStatus, { count: (tokens.data ?? []).length })}
        defaultOpen={open === "assistant"}
      >
        <p className="mb-4 text-sm text-muted-foreground">{t.assistant.description}</p>
        <AssistantLinks links={(tokens.data ?? []).map((k) => ({ id: k.id, name: k.name, createdAt: k.created_at, lastUsedAt: k.last_used_at }))} />
      </CollapsibleCard>
    </div>
  );
}

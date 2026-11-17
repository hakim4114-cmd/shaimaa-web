import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { listProducts } from "@/lib/data/catalog";
import { requireOrganization } from "@/lib/data/context";
import { getPricingDefaults } from "@/lib/data/pricing";
import { getI18n } from "@/lib/i18n/server";
import { PricingSimulator } from "./pricing-simulator";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.pricing.title };
}

export default async function PricingPage() {
  const { t } = await getI18n();
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.seeMoney) redirect("/");
  const [products, defaults] = await Promise.all([listProducts(supabase, organizationId, {}), getPricingDefaults(supabase, organizationId)]);
  const variants = products
    .filter((p) => p.status !== "archived")
    .flatMap((p) =>
      p.variants
        .filter((v) => v.status === "active")
        .map((v) => ({
          id: v.id,
          label: v.title ? `${p.name} — ${v.title}` : p.name,
          productName: p.name,
          variantTitle: v.title,
          priceCents: v.priceCents,
          costCents: v.costCents,
          available: v.stock.available
        }))
    );
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.pricing.title} description={t.pricing.description} />
      <PricingSimulator variants={variants} defaults={defaults} />
    </div>
  );
}

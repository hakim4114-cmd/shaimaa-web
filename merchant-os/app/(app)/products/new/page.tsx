import { redirect } from "next/navigation";
import { ProductForm } from "@/components/products/product-form";
import { PageHeader } from "@/components/ui/page-header";
import { listCategories } from "@/lib/data/catalog";
import { requireOrganization } from "@/lib/data/context";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.products.new };
}

export default async function NewProductPage() {
  const { t } = await getI18n();
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.editCatalog) {
    redirect("/products");
  }
  const categories = await listCategories(supabase, organizationId);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.products.new} />
      <ProductForm categories={categories} initial={{ name: "", description: "", category: "", status: "draft", options: [], variants: [] }} />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { FormAlert } from "@/components/auth/form-alert";
import { ProductForm } from "@/components/products/product-form";
import { PageHeader } from "@/components/ui/page-header";
import { getProduct, listCategories, signProductImages } from "@/lib/data/catalog";
import { ProductImage } from "@/components/products/product-image";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { requireOrganization } from "@/lib/data/context";
import { getI18n } from "@/lib/i18n/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function centsToInput(cents: number | null) {
  if (cents === null) return "";
  return (cents / 100).toFixed(2).replace(/\.00$/, "");
}

export default async function EditProductPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!uuidPattern.test(id)) {
    notFound();
  }
  const { t } = await getI18n();
  const { supabase, organizationId, can } = await requireOrganization();
  const [product, categories] = await Promise.all([getProduct(supabase, organizationId, id), listCategories(supabase, organizationId)]);
  if (!product) {
    notFound();
  }
  const saved = (await searchParams).saved === "1";
  const images = await signProductImages(supabase, [product.imagePath]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/products" className="text-sm text-muted-foreground hover:text-foreground">
          {t.products.back}
        </Link>
        <div className="mt-2">
          <PageHeader title={product.name} description={product.category || undefined} />
        </div>
      </div>
      {saved ? <FormAlert tone="success">{t.products.saved}</FormAlert> : null}
      <Card>
        <CardHeader title={t.products.image} description={t.products.imageHint} />
        <CardBody>
          <ProductImage productId={product.id} url={product.imagePath ? (images[product.imagePath] ?? null) : null} canEdit={can.editCatalog} />
        </CardBody>
      </Card>
      {can.editCatalog ? (
        <ProductForm
          categories={categories}
          initial={{
            id: product.id,
            name: product.name,
            description: product.description,
            category: product.category,
            status: product.status,
            options: product.options,
            variants: product.variants.map((variant) => ({
              id: variant.id,
              sku: variant.sku,
              barcode: variant.barcode ?? "",
              optionValues: variant.optionValues,
              price: centsToInput(variant.priceCents),
              cost: centsToInput(variant.costCents),
              minStock: variant.minStockLevel,
              active: variant.status === "active"
            }))
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t.errors.FORBIDDEN}</p>
      )}
    </div>
  );
}

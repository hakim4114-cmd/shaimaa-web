import { AdminButton, AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminUI";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductPerformanceTable } from "@/components/admin/ProductPerformanceTable";

export default function AdminProductsPage() {
  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Catalog"
        title="Products"
        description="Wassilni/Base44 is the planned source of truth for product, pricing, media, and availability data. This page remains a read-only storefront integration monitor."
        actions={
          <>
            <AdminButton disabled>Add product</AdminButton>
            <AdminButton disabled>Edit product</AdminButton>
            <AdminButton disabled>Manage media</AdminButton>
          </>
        }
      />

      <AdminEmptyState
        title="Product management belongs in Wassilni/Base44"
        description="Maison Shaimaa should display published product output from Wassilni/Base44, not duplicate catalog editing. Current local products remain the fallback until a live product API is available."
      />

      <div>
        <div className="mb-4">
          <h2 className="font-display text-3xl font-semibold text-cedar">Product catalog</h2>
          <p className="mt-2 text-sm leading-6 text-coffee">
            Slugs are stable and should not be changed because public product routes depend on them.
          </p>
        </div>
        <ProductPerformanceTable />
      </div>

      <AdminEmptyState
        title="Saving product changes requires storage"
        description="A real product editor needs a database, CMS, or safe repository workflow. Until then, use this page to audit product coverage and plan media."
        href="/admin/media"
        actionLabel="Review media plan"
      />
    </AdminShell>
  );
}

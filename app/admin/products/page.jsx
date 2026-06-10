import { AdminPageHeader } from "@/components/admin/AdminUI";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductManagerClient } from "@/components/admin/ProductManagerClient";

export default function AdminProductsPage() {
  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Catalog"
        title="Products"
        description="Add, edit, hide, or delete the products shown on the website. Upload a photo, set the price, and mark the product Active to publish it."
      />

      <ProductManagerClient />
    </AdminShell>
  );
}

import { AdminEmptyState, AdminPageHeader, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminUI";
import { AdminShell } from "@/components/admin/AdminShell";
import { products } from "@/data/products";

const mediaTypes = [
  "Product images",
  "Gallery images",
  "Detail images",
  "Videos",
  "Logo",
  "Favicon",
  "Open Graph images"
];

const storageOptions = ["Cloudinary", "Vercel Blob", "Supabase Storage", "S3-compatible storage"];

export default function AdminMediaPage() {
  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Assets"
        title="Media"
        description="Wassilni/Base44 should own product media and asset references once connected. This page is a read-only media readiness monitor."
      />

      <AdminSectionCard
        title="Wassilni/Base44 media ownership"
        description="Product images, gallery images, videos, logo, favicon, and Open Graph assets should be managed in Wassilni/Base44 or its chosen storage provider."
      >
        <div className="flex flex-wrap gap-2">
          <AdminStatusBadge tone="warning">Connected to Wassilni planned</AdminStatusBadge>
          <AdminStatusBadge>Read-only integration monitor</AdminStatusBadge>
          <AdminStatusBadge>Upload disabled</AdminStatusBadge>
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Product media coverage" description="Current product data uses placeholders until final images are available.">
        <div className="grid gap-4 md:grid-cols-3">
          {products.map((product) => (
            <div key={product.slug} className="border border-brass/25 bg-pearl p-4">
              <div className="h-32 border border-brass/25" style={{ background: product.placeholderGradient }} />
              <p className="mt-4 font-display text-2xl font-semibold text-cedar">{product.name}</p>
              <p className="mt-1 font-mono text-xs text-coffee">{product.slug}</p>
              <div className="mt-3">
                <AdminStatusBadge tone={product.hasFinalImage ? "success" : "warning"}>
                  {product.hasFinalImage ? "Final image ready" : "Placeholder in use"}
                </AdminStatusBadge>
              </div>
            </div>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Media categories" description="Planned asset groups for a full store-management workflow.">
        <div className="flex flex-wrap gap-2">
          {mediaTypes.map((type) => (
            <AdminStatusBadge key={type}>{type}</AdminStatusBadge>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Recommended storage architecture" description="Choose one provider before adding upload controls.">
        <div className="grid gap-3 md:grid-cols-4">
          {storageOptions.map((option) => (
            <div key={option} className="border border-brass/25 bg-pearl p-4 text-sm font-semibold text-cedar">
              {option}
            </div>
          ))}
        </div>
      </AdminSectionCard>

      <AdminEmptyState
        title="No runtime upload yet"
        description="This page intentionally avoids fake upload buttons because uploads need storage, validation, and asset deletion rules."
      />
    </AdminShell>
  );
}

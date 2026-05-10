import { AdminEmptyState, AdminPageHeader, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminUI";
import { AdminShell } from "@/components/admin/AdminShell";
import { products } from "@/data/products";

const defaultSeo = {
  title: "Maison Shaimaa | Moroccan Traditional Fashion",
  description:
    "Premium Moroccan djellaba and traditional fashion with elegant craftsmanship, limited collections, and cash on delivery in Morocco.",
  openGraphImage: "Not configured"
};

export default function AdminSeoPage() {
  const productsWithDescriptions = products.filter((product) => product.description).length;
  const productsWithFinalImages = products.filter((product) => product.hasFinalImage).length;

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Discovery"
        title="SEO"
        description="A practical SEO audit for the current static product catalog."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatusBadge tone="success">Product metadata generated</AdminStatusBadge>
        <AdminStatusBadge tone={productsWithDescriptions === products.length ? "success" : "warning"}>
          {productsWithDescriptions}/{products.length} descriptions
        </AdminStatusBadge>
        <AdminStatusBadge tone={productsWithFinalImages === products.length ? "success" : "warning"}>
          {productsWithFinalImages}/{products.length} final OG images
        </AdminStatusBadge>
      </div>

      <AdminSectionCard title="Default metadata" description="Root layout metadata currently used by the site.">
        <div className="divide-y divide-brass/20 border-y border-brass/20">
          <div className="grid gap-2 py-4 md:grid-cols-[220px_1fr]">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-coffee">Default title</p>
            <p className="font-semibold text-cedar">{defaultSeo.title}</p>
          </div>
          <div className="grid gap-2 py-4 md:grid-cols-[220px_1fr]">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-coffee">Default description</p>
            <p className="leading-6 text-cedar">{defaultSeo.description}</p>
          </div>
          <div className="grid gap-2 py-4 md:grid-cols-[220px_1fr]">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-coffee">Open Graph image</p>
            <p className="font-semibold text-cedar">{defaultSeo.openGraphImage}</p>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Product SEO coverage" description="Product pages have generated title, description, canonical path, and OG metadata when images exist.">
        <div className="grid gap-3">
          {products.map((product) => (
            <div key={product.slug} className="grid gap-3 border border-brass/25 bg-pearl p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <p className="font-semibold text-cedar">{product.name}</p>
                <p className="mt-1 font-mono text-xs text-coffee">/products/{product.slug}</p>
              </div>
              <AdminStatusBadge tone={product.description ? "success" : "warning"}>
                {product.description ? "Description ready" : "Missing description"}
              </AdminStatusBadge>
              <AdminStatusBadge tone={product.hasFinalImage ? "success" : "warning"}>
                {product.hasFinalImage ? "OG image ready" : "Needs final image"}
              </AdminStatusBadge>
            </div>
          ))}
        </div>
      </AdminSectionCard>

      <AdminEmptyState
        title="Multilingual SEO is planned"
        description="The site has language switching but not localized routes. Avoid complex hreflang work until language-specific URLs exist."
      />
    </AdminShell>
  );
}

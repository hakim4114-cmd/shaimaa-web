import { AdminEmptyState, AdminPageHeader, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminUI";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminStoreConfig } from "@/data/adminStoreConfig";

export default function AdminBrandingPage() {
  const branding = adminStoreConfig.branding;

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Identity"
        title="Branding"
        description="A clear read-only overview of brand assets and visual system readiness."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSectionCard title="Brand assets" description="URL-based assets are safest until a storage provider exists.">
          <div className="divide-y divide-brass/20 border-y border-brass/20">
            {[
              ["Logo URL", branding.logoUrl],
              ["Favicon URL", branding.faviconUrl],
              ["Open Graph image URL", branding.openGraphImageUrl],
              ["Homepage hero image", branding.homepageHeroImage]
            ].map(([label, value]) => (
              <div key={label} className="grid gap-2 py-4 md:grid-cols-[220px_1fr]">
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-coffee">{label}</p>
                <p className="font-semibold text-cedar">{value}</p>
              </div>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Visual system" description="Current project-level brand foundations.">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-coffee">Brand colors</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {branding.brandColors.map((color) => (
              <div key={color} className="flex items-center gap-2 rounded-full border border-brass/25 bg-pearl px-3 py-2">
                <span className="h-5 w-5 rounded-full border border-brass/30" style={{ backgroundColor: color }} />
                <span className="font-mono text-xs text-cedar">{color}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.12em] text-coffee">Typography</p>
          <p className="mt-2 leading-6 text-cedar">{branding.typography}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <AdminStatusBadge tone="success">Arabic RTL fonts configured</AdminStatusBadge>
            <AdminStatusBadge tone="success">Latin fonts configured</AdminStatusBadge>
          </div>
        </AdminSectionCard>
      </div>

      <AdminEmptyState
        title="Uploads are intentionally not enabled"
        description="Runtime file uploads cannot reliably save into the project folder on production hosting. Use URL fields or connect Cloudinary, Vercel Blob, Supabase Storage, or S3-compatible storage later."
      />
    </AdminShell>
  );
}

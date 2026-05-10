import { AdminEmptyState, AdminPageHeader, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminUI";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminStoreConfig } from "@/data/adminStoreConfig";

const settingRows = [
  ["Store name", adminStoreConfig.storeName],
  ["WhatsApp number", adminStoreConfig.whatsappNumber],
  ["Support phone", adminStoreConfig.supportPhone],
  ["Support email", adminStoreConfig.supportEmail],
  ["Default delivery fee", adminStoreConfig.defaultDeliveryFee],
  ["Currency", adminStoreConfig.currency],
  ["Payment method", adminStoreConfig.paymentMethod],
  ["Market", adminStoreConfig.market],
  ["Announcement bar Arabic", adminStoreConfig.announcementBarTranslations.ar],
  ["Announcement bar French", adminStoreConfig.announcementBarTranslations.fr],
  ["Announcement bar English", adminStoreConfig.announcementBarTranslations.en]
];

export default function AdminSettingsPage() {
  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Configuration"
        title="Store Settings"
        description="Read-only operational settings for the current no-database architecture."
      />

      <AdminSectionCard
        title="Store basics"
        description="These values are shown from project configuration. Saving from the browser requires future storage."
      >
        <div className="divide-y divide-brass/20 border-y border-brass/20">
          {settingRows.map(([label, value]) => (
            <div key={label} className="grid gap-2 py-4 md:grid-cols-[240px_1fr]">
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-coffee">{label}</p>
              <p className="font-semibold text-cedar">{value}</p>
            </div>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Store switches" description="Status only. These are not browser-editable yet.">
        <div className="flex flex-wrap gap-3">
          <AdminStatusBadge tone={adminStoreConfig.codEnabled ? "success" : "danger"}>COD enabled</AdminStatusBadge>
          <AdminStatusBadge tone={adminStoreConfig.orderTrackingEnabled ? "success" : "warning"}>
            Order tracking page enabled
          </AdminStatusBadge>
          <AdminStatusBadge>Delivery fee confirmed manually</AdminStatusBadge>
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Social links" description="Configured links should be stored in code or future settings storage.">
        <div className="grid gap-3 md:grid-cols-3">
          {Object.entries(adminStoreConfig.socialLinks).map(([platform, value]) => (
            <div key={platform} className="border border-brass/25 bg-pearl p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-henna">{platform}</p>
              <p className="mt-2 text-sm font-semibold text-cedar">{value}</p>
            </div>
          ))}
        </div>
      </AdminSectionCard>

      <AdminEmptyState
        title="Saving settings needs a persistence layer"
        description="Use a database, CMS, or protected Apps Script settings endpoint before enabling editable settings forms."
      />
    </AdminShell>
  );
}

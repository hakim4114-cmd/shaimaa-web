import { AdminEmptyState, AdminPageHeader, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminUI";
import { AdminOrdersClient } from "@/components/admin/AdminOrdersClient";
import { AdminShell } from "@/components/admin/AdminShell";

export default function AdminOrdersPage() {
  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="COD operations"
        title="Orders"
        description="Wassilni/Base44 is the planned source of truth for order operations. This page is a read-only integration monitor, with current Google Sheets admin reads kept as transition support."
      />

      <AdminSectionCard
        title="Wassilni/Base44 ownership"
        description="Order confirmation, cancellation, fake-order marking, and fulfillment status should be managed in Wassilni/Base44 once its API is connected."
      >
        <div className="flex flex-wrap gap-2">
          <AdminStatusBadge tone="warning">Wassilni connection planned</AdminStatusBadge>
          <AdminStatusBadge>Read-only monitor</AdminStatusBadge>
          <AdminStatusBadge>Not source of truth</AdminStatusBadge>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Order workflow"
        description="Recommended statuses for the Google Sheets manual workflow."
      >
        <div className="flex flex-wrap gap-2">
          {["New", "Confirmed", "Preparing", "Dispatched", "Out for delivery", "Delivered", "Could not reach customer", "Cancelled", "Returned"].map((status) => (
            <AdminStatusBadge key={status}>{status}</AdminStatusBadge>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Search and filters"
        description="UI placeholders are shown for the future read/update layer. They do not query Google Sheets yet."
      >
        <div className="grid gap-3 md:grid-cols-4">
          <input className="border border-brass/30 bg-pearl px-4 py-3 text-sm text-cedar" placeholder="Search order, phone, city" disabled />
          <select className="border border-brass/30 bg-pearl px-4 py-3 text-sm text-cedar" disabled>
            <option>Status</option>
          </select>
          <select className="border border-brass/30 bg-pearl px-4 py-3 text-sm text-cedar" disabled>
            <option>Risk</option>
          </select>
          <button className="rounded-full border border-brass/50 px-4 py-3 text-sm font-bold text-cedar opacity-50" disabled>
            Apply filters
          </button>
        </div>
      </AdminSectionCard>

      <div>
        <div className="mb-4">
          <h2 className="font-display text-3xl font-semibold text-cedar">COD order list</h2>
          <p className="mt-2 text-sm leading-6 text-coffee">
            Read-only transition data from Google Sheets through the protected admin API. Wassilni/Base44 should replace this once live API details are available.
          </p>
        </div>
        <AdminOrdersClient />
      </div>

      <AdminEmptyState
        title="Persisted order actions need a write endpoint"
        description="Confirm, cancel, mark fake, WhatsApp message copy, and status updates should be connected only after a safe Apps Script update endpoint or authenticated backend is added."
      />
    </AdminShell>
  );
}

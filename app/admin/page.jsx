import { AdminEmptyState, AdminPageHeader, AdminSectionCard, AdminStatCard } from "@/components/admin/AdminUI";
import { AdminShell } from "@/components/admin/AdminShell";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { demoOrders } from "@/data/demoOrders";

export default function AdminPage() {
  const totalOrders = demoOrders.length;
  const pendingOrders = demoOrders.filter((order) => order.status === "Pending").length;
  const confirmedOrders = demoOrders.filter((order) => order.status === "Confirmed").length;
  const suspiciousOrders = demoOrders.filter((order) => order.risk).length;
  const deliveredOrders = demoOrders.filter((order) => order.status === "Delivered").length;

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Store operations"
        title="Dashboard"
        description="A practical COD command center. Live Google Sheets reads are not connected yet, so numbers below use local demo data and manual-state messaging."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard label="Total orders" value={totalOrders} detail="Demo orders loaded locally." />
        <AdminStatCard label="Pending confirmation" value={pendingOrders} detail="Call before dispatch." tone="warning" />
        <AdminStatCard label="Suspicious notes" value={suspiciousOrders} detail="Review before preparing." tone="warning" />
        <AdminStatCard label="Confirmed" value={confirmedOrders} detail="Ready for preparation." tone="success" />
        <AdminStatCard label="Delivered" value={deliveredOrders} detail="Needs live status data." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div>
          <div className="mb-4">
            <h2 className="font-display text-3xl font-semibold text-cedar">Recent COD orders</h2>
            <p className="mt-2 text-sm leading-6 text-coffee">
              Read-only operational preview. Real order management should read from Google Sheets or a future backend endpoint.
            </p>
          </div>
          <OrdersTable orders={demoOrders} sourceLabel="Demo dashboard preview" isFallback />
        </div>

        <AdminSectionCard title="Operational reminders" description="Simple guardrails for Moroccan COD follow-up.">
          <div className="grid gap-3 text-sm leading-6 text-coffee">
            <p>Confirm phone, city, color, size, and delivery fee before dispatch.</p>
            <p>Review internal risk notes before preparing high-risk COD orders.</p>
            <p>Use WhatsApp only after customer consent or an order request.</p>
            <p>Keep product availability manual until inventory storage exists.</p>
          </div>
        </AdminSectionCard>
      </div>

      <AdminEmptyState
        title="Live admin data is not connected yet"
        description="To make this dashboard fully operational, add a secure read/update layer for Google Sheets or introduce a proper store database and authentication."
        href="/admin/advanced"
        actionLabel="Review advanced status"
      />
    </AdminShell>
  );
}

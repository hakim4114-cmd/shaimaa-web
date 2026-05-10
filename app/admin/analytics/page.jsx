import { AdminEmptyState, AdminPageHeader, AdminStatCard } from "@/components/admin/AdminUI";
import { AdminShell } from "@/components/admin/AdminShell";
import { AnalyticsChart } from "@/components/admin/AnalyticsChart";
import { ProductPerformanceTable } from "@/components/admin/ProductPerformanceTable";

export default function AdminAnalyticsPage() {
  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Performance"
        title="Analytics"
        description="A future home for COD conversion, product demand, and fulfillment metrics. No live analytics provider is connected yet."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatCard label="Conversion source" value="Manual" detail="Orders currently arrive through Google Sheets." />
        <AdminStatCard label="Top products" value="Planned" detail="Needs order reads grouped by product slug." />
        <AdminStatCard label="Delivery status" value="Planned" detail="Needs tracking fields or provider data." />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div>
          <div className="mb-4">
            <h2 className="font-display text-3xl font-semibold text-cedar">Trend preview</h2>
            <p className="mt-2 text-sm leading-6 text-coffee">Visual placeholder only.</p>
          </div>
          <AnalyticsChart />
        </div>
        <div>
          <div className="mb-4">
            <h2 className="font-display text-3xl font-semibold text-cedar">Product coverage</h2>
            <p className="mt-2 text-sm leading-6 text-coffee">Metadata and catalog readiness, not live sales performance.</p>
          </div>
          <ProductPerformanceTable />
        </div>
      </div>

      <AdminEmptyState
        title="Live analytics need a data source"
        description="Connect Google Sheets reads, privacy-safe event analytics, or a future database before showing real conversion numbers."
      />
    </AdminShell>
  );
}

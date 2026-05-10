import { AdminEmptyState, AdminPageHeader, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminUI";
import { AdminShell } from "@/components/admin/AdminShell";

function statusTone(isEnabled) {
  return isEnabled ? "success" : "warning";
}

export default function AdminAdvancedPage() {
  const adminRoutesEnabled =
    process.env.NODE_ENV === "development" || process.env.MAISON_ADMIN_ROUTES_ENABLED === "true";
  const adminPasswordConfigured = Boolean(process.env.ADMIN_PASSWORD);
  const adminSessionSecretConfigured = Boolean(process.env.ADMIN_SESSION_SECRET);
  const orderScriptConfigured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL);
  const trackingScriptConfigured = Boolean(process.env.GOOGLE_TRACKING_SCRIPT_URL);
  const adminOrdersScriptConfigured = Boolean(process.env.GOOGLE_ADMIN_ORDERS_SCRIPT_URL);
  const wassilniApiConfigured = Boolean(process.env.WASSILNI_API_BASE_URL && process.env.WASSILNI_API_KEY);
  const wassilniWebhookConfigured = Boolean(process.env.WASSILNI_WEBHOOK_SECRET);
  const deploymentEnvironment = process.env.NODE_ENV === "production" ? "Production build" : "Local development";

  const featureStatuses = [
    ["Deployment state", process.env.NODE_ENV === "production", "Current runtime mode only. The project is still treated as local/not public until deployed behind production env vars."],
    ["Admin route gate", adminRoutesEnabled, "Production requires MAISON_ADMIN_ROUTES_ENABLED=true."],
    ["Admin password", adminPasswordConfigured, "Required for /admin/login. Secret value is never shown."],
    ["Admin session secret", adminSessionSecretConfigured, "Required to sign the httpOnly admin cookie."],
    ["COD order script", orderScriptConfigured, "Google Sheets remains the primary COD receiver. Only configured status is shown, not the URL."],
    ["Tracking script", trackingScriptConfigured, "Private env var for /api/track-order."],
    ["Admin orders script", adminOrdersScriptConfigured, "Private env var for read-only admin order data."],
    ["Wassilni/Base44 API", wassilniApiConfigured, "Secondary shadow sync only. It is not primary yet."],
    ["Wassilni webhook secret", wassilniWebhookConfigured, "Optional server-only secret for Wassilni verification if required."],
    ["Anti-fake order validation", true, "Frontend utility and Apps Script documentation are present."],
    ["COD availability", true, "COD form remains enabled."],
    ["Delivery provider API", false, "Planned, not integrated."],
    ["Backup/export", false, "Planned for a future data layer."]
  ];

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="System"
        title="Advanced"
        description="Safe operational status without exposing secrets or pretending unavailable integrations are active."
      />

      <AdminSectionCard
        title="Deployment readiness"
        description="Current operational mode for the storefront and integrations."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="border border-brass/25 bg-pearl p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-coffee">Runtime</p>
            <p className="mt-2 font-display text-2xl font-semibold text-cedar">{deploymentEnvironment}</p>
          </div>
          <div className="border border-brass/25 bg-pearl p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-coffee">Primary order flow</p>
            <p className="mt-2 font-display text-2xl font-semibold text-cedar">Google Sheets</p>
          </div>
          <div className="border border-brass/25 bg-pearl p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-coffee">Wassilni/Base44</p>
            <p className="mt-2 font-display text-2xl font-semibold text-cedar">Shadow sync only</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-coffee">
          Production deployment is required before real customer traffic. Until the migration is complete, Wassilni/Base44
          receives secondary order copies only after Google Sheets accepts the primary COD order.
        </p>
      </AdminSectionCard>

      <AdminSectionCard title="Configuration status" description="This page shows booleans only. Secret values are never displayed.">
        <div className="grid gap-3">
          {featureStatuses.map(([label, enabled, description]) => (
            <div key={label} className="grid gap-3 border border-brass/25 bg-pearl p-4 md:grid-cols-[240px_auto_1fr] md:items-center">
              <p className="font-semibold text-cedar">{label}</p>
              <AdminStatusBadge tone={statusTone(enabled)}>{enabled ? "Enabled" : "Not configured"}</AdminStatusBadge>
              <p className="text-sm leading-6 text-coffee">{description}</p>
            </div>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Planned safe toggles" description="Do not enable toggles until there is authenticated persistence.">
        <div className="grid gap-3 md:grid-cols-2">
          {["Maintenance mode", "COD pause", "Delivery provider integration", "Manual backup export"].map((item) => (
            <div key={item} className="flex items-center justify-between gap-4 border border-brass/25 bg-pearl p-4">
              <p className="font-semibold text-cedar">{item}</p>
              <AdminStatusBadge>Planned</AdminStatusBadge>
            </div>
          ))}
        </div>
      </AdminSectionCard>

      <AdminEmptyState
        title="Authentication should come before write controls"
        description="This production gate is useful, but real admin edits should wait for authentication, authorization, and audit logs."
      />
    </AdminShell>
  );
}

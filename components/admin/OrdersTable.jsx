import { AdminButton, AdminStatusBadge } from "@/components/admin/AdminUI";

function getStatusTone(status) {
  if (status === "Confirmed" || status === "Delivered") {
    return "success";
  }

  if (status === "Cancelled" || status === "Returned") {
    return "danger";
  }

  return "warning";
}

function normalizeDisplayOrder(order) {
  return {
    orderId: order.orderId || order.id || "Unknown",
    createdAt: order.createdAt || "",
    fullName: order.fullName || order.customer || "",
    phoneNumber: order.phoneNumber || order.phone || "",
    city: order.city || "",
    productName: order.productName || order.product || "",
    color: order.color || "",
    size: order.size || "",
    quantity: order.quantity || "",
    notes: order.notes || "",
    orderStatus: order.orderStatus || order.status || "New",
    deliveryStatus: order.deliveryStatus || "",
    riskStatus: order.riskStatus || order.risk || "",
    lastUpdated: order.lastUpdated || ""
  };
}

export function OrdersTable({ orders = [], sourceLabel = "Google Sheets", isFallback = false }) {
  const displayOrders = orders.map((order) => normalizeDisplayOrder(order));

  return (
    <div className="overflow-x-auto bg-ivory shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brass/20 px-5 py-4">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-coffee">{sourceLabel}</p>
        {isFallback ? <AdminStatusBadge tone="warning">Demo fallback</AdminStatusBadge> : <AdminStatusBadge tone="success">Read-only live data</AdminStatusBadge>}
      </div>
      <table className="w-full min-w-[1280px] text-left text-sm">
        <thead className="bg-cedar text-ivory">
          <tr>
            <th className="p-4">Created</th>
            <th className="p-4">Order</th>
            <th className="p-4">Customer</th>
            <th className="p-4">Phone</th>
            <th className="p-4">City</th>
            <th className="p-4">Product</th>
            <th className="p-4">Variant</th>
            <th className="p-4">Qty</th>
            <th className="p-4">Status</th>
            <th className="p-4">Risk note</th>
            <th className="p-4">Notes</th>
            <th className="p-4">Updated</th>
            <th className="p-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {displayOrders.map((order) => (
            <tr key={order.orderId} className="align-top border-b border-brass/20">
              <td className="p-4 font-mono text-xs text-coffee">{order.createdAt || "Not provided"}</td>
              <td className="p-4 font-semibold text-cedar">{order.orderId}</td>
              <td className="p-4">{order.fullName}</td>
              <td className="p-4 font-mono text-xs">{order.phoneNumber}</td>
              <td className="p-4">{order.city}</td>
              <td className="p-4">{order.productName}</td>
              <td className="p-4 text-xs leading-5 text-coffee">
                <span className="font-semibold text-cedar">{order.color || "Color not set"}</span>
                <br />
                {order.size || "Size not set"}
              </td>
              <td className="p-4">{order.quantity || "1"}</td>
              <td className="p-4">
                <AdminStatusBadge tone={getStatusTone(order.orderStatus)}>{order.orderStatus}</AdminStatusBadge>
                {order.deliveryStatus ? <p className="mt-2 text-xs text-coffee">{order.deliveryStatus}</p> : null}
              </td>
              <td className="max-w-56 p-4 text-xs leading-5 text-coffee">
                {order.riskStatus ? <span className="font-semibold text-henna">{order.riskStatus}</span> : "No risk note"}
              </td>
              <td className="max-w-64 p-4 text-xs leading-5 text-coffee">{order.notes || "No notes"}</td>
              <td className="p-4 font-mono text-xs text-coffee">{order.lastUpdated || "Not updated"}</td>
              <td className="p-4">
                <div className="flex flex-wrap gap-2">
                  <AdminButton disabled>Confirm</AdminButton>
                  <AdminButton disabled>Cancel</AdminButton>
                  <AdminButton disabled>Mark fake</AdminButton>
                  <AdminButton disabled>WhatsApp</AdminButton>
                  <AdminButton disabled>Copy message</AdminButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-brass/20 px-5 py-4 text-sm leading-6 text-coffee">
        Actions are intentionally disabled until a write-capable admin API or Google Sheets update endpoint is added.
      </p>
    </div>
  );
}

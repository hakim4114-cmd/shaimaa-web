"use client";

import { useEffect, useState } from "react";
import { AdminEmptyState, AdminStatusBadge } from "@/components/admin/AdminUI";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { demoOrders } from "@/data/demoOrders";

function getErrorMessage(status) {
  if (status === 401) {
    return "You are not authorized to view admin orders. Please log in again.";
  }

  if (status === 503) {
    return "The admin orders service is not configured yet.";
  }

  return "Orders could not be loaded from Google Sheets right now.";
}

export function AdminOrdersClient() {
  const [state, setState] = useState({
    status: "loading",
    orders: [],
    errorMessage: ""
  });

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      try {
        const response = await fetch("/api/admin/orders", {
          cache: "no-store"
        });
        const result = await response.json().catch(() => ({}));

        if (!isMounted) {
          return;
        }

        if (!response.ok || result?.success === false) {
          setState({
            status: response.status === 401 ? "unauthorized" : "error",
            orders: [],
            errorMessage: getErrorMessage(response.status)
          });
          return;
        }

        setState({
          status: "success",
          orders: Array.isArray(result.orders) ? result.orders : [],
          errorMessage: ""
        });
      } catch {
        if (isMounted) {
          setState({
            status: "error",
            orders: [],
            errorMessage: getErrorMessage(0)
          });
        }
      }
    }

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="bg-ivory p-6 shadow-soft">
        <div className="h-4 w-40 bg-brass/20" />
        <div className="mt-5 grid gap-3">
          <div className="h-12 bg-pearl" />
          <div className="h-12 bg-pearl" />
          <div className="h-12 bg-pearl" />
        </div>
      </div>
    );
  }

  if (state.status === "unauthorized") {
    return (
      <AdminEmptyState
        title="Admin session required"
        description={state.errorMessage}
        href="/admin/login"
        actionLabel="Go to login"
      />
    );
  }

  if (state.status === "error") {
    return (
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3 bg-henna/10 p-4 text-sm font-semibold leading-6 text-henna">
          <AdminStatusBadge tone="warning">Fallback mode</AdminStatusBadge>
          <span>{state.errorMessage}</span>
        </div>
        <OrdersTable orders={demoOrders} sourceLabel="Demo fallback orders" isFallback />
      </div>
    );
  }

  if (state.orders.length === 0) {
    return (
      <AdminEmptyState
        title="No orders found"
        description="The admin orders endpoint is connected, but it did not return any safe order rows yet."
      />
    );
  }

  return <OrdersTable orders={state.orders} sourceLabel="Google Sheets orders" />;
}

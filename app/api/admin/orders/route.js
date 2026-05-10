import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminSessionCookieName, verifyAdminSessionValue } from "@/lib/adminSession";
import { sanitizeAdminOrders } from "@/lib/adminOrders";

export const dynamic = "force-dynamic";

async function hasValidAdminSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(adminSessionCookieName)?.value;

  return verifyAdminSessionValue(sessionCookie, process.env.ADMIN_SESSION_SECRET || "");
}

function getRawOrders(result) {
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.orders)) {
    return result.orders;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  return [];
}

export async function GET() {
  if (!(await hasValidAdminSession())) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const scriptUrl = process.env.GOOGLE_ADMIN_ORDERS_SCRIPT_URL;

  if (!scriptUrl) {
    return NextResponse.json(
      { success: false, message: "ADMIN_ORDERS_SERVICE_UNAVAILABLE", orders: [] },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({ action: "adminListOrders" }),
      cache: "no-store"
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: "ADMIN_ORDERS_SERVICE_UNAVAILABLE", orders: [] },
        { status: 502 }
      );
    }

    const result = await response.json();

    if (result?.success === false) {
      return NextResponse.json(
        { success: false, message: "ADMIN_ORDERS_SERVICE_UNAVAILABLE", orders: [] },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      source: "google-sheets",
      orders: sanitizeAdminOrders(getRawOrders(result))
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "ADMIN_ORDERS_SERVICE_UNAVAILABLE", orders: [] },
      { status: 502 }
    );
  }
}

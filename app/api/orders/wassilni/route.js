import { NextResponse } from "next/server";
import { products } from "@/data/products";
import { submitOrder } from "@/lib/integrations/wassilni";
import { validateCODOrder } from "@/lib/orderValidation";

export const dynamic = "force-dynamic";

function getOrderFromBody(body) {
  return body?.order || body?.orderData || body;
}

function getSelectedProduct(order) {
  return products.find((product) => product.slug === order?.productSlug) || null;
}

function buildWassilniOrderPayload(order) {
  const payload = {
    fullName: order.fullName,
    phoneNumber: order.phoneNumber,
    city: order.city,
    fullAddress: order.fullAddress,
    productSlug: order.productSlug,
    productName: order.productName,
    price: order.price,
    color: order.color,
    size: order.size,
    quantity: order.quantity,
    notes: order.notes,
    paymentMethod: order.paymentMethod,
    orderStatus: order.orderStatus,
    source: order.source
  };

  if (order.orderId) {
    payload.orderId = String(order.orderId);
  }

  return payload;
}

function createSyncWarning(message) {
  return {
    success: false,
    accepted: true,
    receiver: "wassilni",
    warning: message
  };
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, accepted: false, warning: "INVALID_ORDER_DETAILS" }, { status: 400 });
  }

  const order = getOrderFromBody(body);
  const selectedProduct = getSelectedProduct(order);
  const validation = validateCODOrder(order || {}, selectedProduct);

  if (!validation.isValid) {
    return NextResponse.json({ success: false, accepted: false, warning: "INVALID_ORDER_DETAILS" }, { status: 400 });
  }

  const result = await submitOrder(buildWassilniOrderPayload(order));

  if (!result.success) {
    console.warn("[wassilni-order-sync]", result.message || "WASSILNI_ORDER_SYNC_FAILED");

    return NextResponse.json(createSyncWarning(result.message || "WASSILNI_ORDER_SYNC_FAILED"), { status: 202 });
  }

  return NextResponse.json({
    success: true,
    accepted: true,
    receiver: "wassilni",
    orderId: result.orderId || ""
  });
}

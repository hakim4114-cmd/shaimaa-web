export const safeAdminOrderFields = [
  "orderId",
  "createdAt",
  "fullName",
  "phoneNumber",
  "city",
  "productName",
  "color",
  "size",
  "quantity",
  "notes",
  "orderStatus",
  "deliveryStatus",
  "riskStatus",
  "lastUpdated"
];

function cleanText(value) {
  return String(value || "").trim();
}

function pickFirstValue(source, keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null && cleanText(source[key]) !== "") {
      return source[key];
    }
  }

  return "";
}

export function sanitizeAdminOrder(rawOrder = {}) {
  const order = {
    orderId: cleanText(pickFirstValue(rawOrder, ["orderId", "order_id", "Order ID", "id"])),
    createdAt: cleanText(pickFirstValue(rawOrder, ["createdAt", "created_at", "Created At"])),
    fullName: cleanText(pickFirstValue(rawOrder, ["fullName", "full_name", "Full Name", "customer"])),
    phoneNumber: cleanText(pickFirstValue(rawOrder, ["phoneNumber", "phone_number", "Phone Number", "phone"])),
    city: cleanText(pickFirstValue(rawOrder, ["city", "City"])),
    productName: cleanText(pickFirstValue(rawOrder, ["productName", "product_name", "Product Name", "product"])),
    color: cleanText(pickFirstValue(rawOrder, ["color", "Color"])),
    size: cleanText(pickFirstValue(rawOrder, ["size", "Size"])),
    quantity: pickFirstValue(rawOrder, ["quantity", "Quantity"]) || "",
    notes: cleanText(pickFirstValue(rawOrder, ["notes", "Notes"])),
    orderStatus: cleanText(pickFirstValue(rawOrder, ["orderStatus", "order_status", "Order Status", "status"])) || "New",
    deliveryStatus: cleanText(pickFirstValue(rawOrder, ["deliveryStatus", "delivery_status", "Delivery Status"])),
    riskStatus: cleanText(pickFirstValue(rawOrder, ["riskStatus", "risk_status", "Risk Status", "riskNote", "risk"])),
    lastUpdated: cleanText(pickFirstValue(rawOrder, ["lastUpdated", "last_updated", "Last Updated", "Tracking Updated At"]))
  };

  return safeAdminOrderFields.reduce((safeOrder, field) => {
    return {
      ...safeOrder,
      [field]: order[field]
    };
  }, {});
}

export function sanitizeAdminOrders(rawOrders) {
  if (!Array.isArray(rawOrders)) {
    return [];
  }

  return rawOrders.map((order) => sanitizeAdminOrder(order)).filter((order) => order.orderId || order.phoneNumber);
}

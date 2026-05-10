const manualStatusMap = {
  new: "New",
  confirmed: "Confirmed",
  preparing: "Preparing",
  dispatched: "Dispatched",
  "out for delivery": "Out for delivery",
  delivered: "Delivered",
  "could not reach customer": "Could not reach customer",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  returned: "Returned"
};

export const publicTrackingFields = ["found", "orderStatus", "deliveryStatus", "lastUpdated", "message"];

export function normalizeOrderId(orderId) {
  return String(orderId || "").trim().toUpperCase();
}

export function normalizeTrackingPhone(phoneNumber) {
  return String(phoneNumber || "").trim().replace(/[\s().-]/g, "");
}

export function isValidTrackingPhone(phoneNumber) {
  const normalizedPhone = normalizeTrackingPhone(phoneNumber);
  return /^(?:0[5-7]\d{8}|\+?212[5-7]\d{8})$/.test(normalizedPhone);
}

export function validateTrackingRequest({ orderId, phoneNumber }) {
  if (normalizeOrderId(orderId).length < 4) {
    return "orderId";
  }

  if (!isValidTrackingPhone(phoneNumber)) {
    return "phoneNumber";
  }

  return "";
}

export function normalizeManualSheetStatus(status) {
  const normalizedStatus = String(status || "").trim().toLowerCase();
  return manualStatusMap[normalizedStatus] || "New";
}

export function normalizeDeliveryProviderStatus(providerResponse) {
  return {
    orderStatus: normalizeManualSheetStatus(providerResponse?.orderStatus),
    deliveryStatus: providerResponse?.deliveryStatus ? normalizeManualSheetStatus(providerResponse.deliveryStatus) : "",
    lastUpdated: providerResponse?.lastUpdated || ""
  };
}

export function buildSafeTrackingResponse(rawResult) {
  if (!rawResult || rawResult.found !== true) {
    return {
      found: false,
      message: "ORDER_NOT_FOUND"
    };
  }

  return {
    found: true,
    orderStatus: normalizeManualSheetStatus(rawResult.orderStatus),
    deliveryStatus: rawResult.deliveryStatus ? normalizeManualSheetStatus(rawResult.deliveryStatus) : "",
    lastUpdated: rawResult.lastUpdated || rawResult.trackingUpdatedAt || "",
    message: rawResult.message || ""
  };
}

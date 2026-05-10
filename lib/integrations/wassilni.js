import { adminStoreConfig } from "@/data/adminStoreConfig";
import { products } from "@/data/products";
import { buildSafeTrackingResponse } from "@/lib/trackingUtils";

const requestTimeoutMs = 3000;

function isWassilniConfigured() {
  return Boolean(process.env.WASSILNI_API_BASE_URL && process.env.WASSILNI_API_KEY);
}

function getWassilniUrl(path) {
  const baseUrl = process.env.WASSILNI_API_BASE_URL?.trim();

  if (!baseUrl) {
    return "";
  }

  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function getWassilniHeaders() {
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${process.env.WASSILNI_API_KEY}`,
    "Content-Type": "application/json"
  };

  if (process.env.WASSILNI_WEBHOOK_SECRET) {
    headers["X-Wassilni-Webhook-Secret"] = process.env.WASSILNI_WEBHOOK_SECRET;
  }

  return headers;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseJsonResponse(response) {
  const responseText = await response.text();

  if (!responseText) {
    return {};
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return {};
  }
}

function getFallbackTrackingResponse() {
  return buildSafeTrackingResponse({
    found: false,
    message: "WASSILNI_NOT_CONFIGURED"
  });
}

export async function getStoreSettings() {
  return {
    source: isWassilniConfigured() ? "wassilni-planned" : "local-fallback",
    data: adminStoreConfig
  };
}

export async function getProducts() {
  return {
    source: isWassilniConfigured() ? "wassilni-planned" : "local-fallback",
    data: products
  };
}

export async function getProductBySlug(slug) {
  const product = products.find((item) => item.slug === slug) || null;

  return {
    source: isWassilniConfigured() ? "wassilni-planned" : "local-fallback",
    data: product
  };
}

export async function submitOrder(order) {
  if (!isWassilniConfigured()) {
    return {
      success: false,
      skipped: true,
      source: "current-google-sheets-flow",
      message: "WASSILNI_NOT_CONFIGURED"
    };
  }

  try {
    const response = await fetchWithTimeout(getWassilniUrl("/orders"), {
      method: "POST",
      headers: getWassilniHeaders(),
      body: JSON.stringify(order),
      cache: "no-store"
    });

    const result = await parseJsonResponse(response);

    if (!response.ok || result?.success === false) {
      return {
        success: false,
        skipped: false,
        source: "wassilni",
        message: "WASSILNI_ORDER_SYNC_FAILED"
      };
    }

    return {
      success: true,
      skipped: false,
      source: "wassilni",
      orderId: result?.orderId ? String(result.orderId) : ""
    };
  } catch {
    return {
      success: false,
      skipped: false,
      source: "wassilni",
      message: "WASSILNI_ORDER_SYNC_FAILED"
    };
  }

}

export async function trackOrder(orderId, phoneNumber) {
  return {
    source: isWassilniConfigured() ? "wassilni-planned" : "current-tracking-flow",
    data: getFallbackTrackingResponse(),
    request: {
      orderId,
      phoneNumber
    }
  };
}

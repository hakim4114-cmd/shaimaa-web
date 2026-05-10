import { NextResponse } from "next/server";
import {
  buildSafeTrackingResponse,
  normalizeOrderId,
  normalizeTrackingPhone,
  validateTrackingRequest
} from "@/lib/trackingUtils";

const genericNotFoundResponse = {
  found: false,
  message: "ORDER_NOT_FOUND"
};

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(genericNotFoundResponse, { status: 400 });
  }

  const orderId = normalizeOrderId(body?.orderId);
  const phoneNumber = normalizeTrackingPhone(body?.phoneNumber);
  const validationError = validateTrackingRequest({ orderId, phoneNumber });

  if (validationError) {
    return NextResponse.json(genericNotFoundResponse, { status: 400 });
  }

  const trackingScriptUrl = process.env.GOOGLE_TRACKING_SCRIPT_URL;

  if (!trackingScriptUrl) {
    return NextResponse.json(
      {
        found: false,
        message: "TRACKING_SERVICE_UNAVAILABLE"
      },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(trackingScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action: "trackOrder",
        orderId,
        phoneNumber
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("TRACKING_REQUEST_FAILED");
    }

    const result = await response.json();
    return NextResponse.json(buildSafeTrackingResponse(result));
  } catch {
    return NextResponse.json(
      {
        found: false,
        message: "TRACKING_SERVICE_UNAVAILABLE"
      },
      { status: 502 }
    );
  }
}

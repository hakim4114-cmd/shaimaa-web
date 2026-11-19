import { NextResponse, type NextRequest } from "next/server";
import { mapSenditStatus, verifySenditSignature, type ShipmentStatus } from "@/lib/shipping/sendit-core";
import { SenditError, getDelivery } from "@/lib/shipping/sendit";
import type { Json } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadSenditKeysForProvider } from "@/lib/shipping/sendit-keys";
import { reportSystemEvent } from "@/lib/data/system-events";

// Sendit → Merchant OS status updates (guide-webhook-sendit.pdf).
// The URL carries our provider id so several organizations can each have
// their own Sendit account.
//
// Trust: when the X-Sendit-Signature matches (HMAC-SHA256 of the raw body
// with that organization's keys) the payload is applied as received.
// Otherwise the payload is never trusted: it is only a hint that a parcel
// changed, and the real status is read from the Sendit API with the
// organization's own keys. A forged call can at most trigger that read.
// (2026-11-19: Sendit's signature did not match any HMAC of the body with the
// account's public or secret key, so this verified pull is what applies
// real events until the signing scheme is known.)
export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const parcelCode = /^[A-Za-z0-9._/-]{3,64}$/;

export async function POST(request: NextRequest, { params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  if (!uuid.test(providerId)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const raw = await request.text();
  if (raw.length > 100_000) return NextResponse.json({ error: "too_large" }, { status: 413 });
  const keys = await loadSenditKeysForProvider(providerId);
  if (!keys) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const code = typeof payload.code === "string" ? payload.code.trim() : "";
  if (!parcelCode.test(code)) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const signed = verifySenditSignature(raw, request.headers.get("x-sendit-signature"), [keys.secretKey, keys.publicKey]);
  let carrierStatus = typeof payload.newStatus === "string" ? payload.newStatus.trim() : "";
  let eventPayload: Record<string, unknown> = payload;

  if (!signed) {
    // Only act on parcels this organization actually has.
    const { data: shipment } = await admin
      .from("shipments")
      .select("id")
      .eq("provider_id", providerId)
      .eq("tracking_number", code)
      .neq("status", "cancelled")
      .maybeSingle();
    if (!shipment) return NextResponse.json({ ok: true, ignored: "unknown parcel" });
    try {
      const parcel = await getDelivery(keys, code);
      if (!parcel.status) throw new SenditError("SENDIT_UNAVAILABLE", "no status");
      carrierStatus = parcel.status;
      // Keep the details Sendit gives; the event key follows the verified status and its time.
      eventPayload = {
        source: "webhook+api",
        newStatus: parcel.status,
        lastActionAt: String(parcel.raw.last_action_at ?? parcel.raw.updated_at ?? payload.lastActionAt ?? parcel.status),
        message: parcel.raw.message ?? null,
        deliverBy: parcel.raw.deliver_by ?? parcel.raw.deliverBy ?? null,
        counterUnreachable: parcel.raw.counter_unreachable ?? parcel.raw.counterUnreachable ?? null,
        proofImage: parcel.raw.proof_image ?? parcel.raw.proofImage ?? null
      };
    } catch (error) {
      const { data: provider } = await admin.from("shipping_providers").select("organization_id").eq("id", providerId).maybeSingle();
      if (provider) {
        const detail = error instanceof SenditError ? `${error.code}${error.detail ? ` (${error.detail})` : ""}` : "unknown error";
        await reportSystemEvent(admin, provider.organization_id, "sendit_webhook", `Sendit update for ${code} could not be checked: ${detail}`.slice(0, 300), { tracking: code });
      }
      // 5xx: Sendit retries later.
      return NextResponse.json({ error: "temporary" }, { status: 503 });
    }
  }
  if (!carrierStatus) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const { data, error } = await admin.rpc("apply_carrier_event", {
    p_provider_id: providerId,
    p_tracking_number: code,
    p_carrier_status: carrierStatus,
    p_status: (mapSenditStatus(carrierStatus) ?? null) as ShipmentStatus,
    p_payload: eventPayload as Json
  });
  if (error) {
    // 5xx makes Sendit retry; a closed shipment or unknown provider will not change on retry.
    const permanent = /SHIPMENT_CLOSED|PROVIDER_NOT_FOUND|INVALID_TRANSITION/.test(error.message);
    const { data: provider } = await admin.from("shipping_providers").select("organization_id").eq("id", providerId).maybeSingle();
    if (provider && !/SHIPMENT_CLOSED/.test(error.message)) {
      await reportSystemEvent(admin, provider.organization_id, "sendit_webhook", `Sendit event not applied: ${error.message}`.slice(0, 300), { tracking: code, status: carrierStatus });
    }
    return NextResponse.json({ error: permanent ? "rejected" : "temporary" }, { status: permanent ? 200 : 500 });
  }
  return NextResponse.json({ ok: true, verified: signed ? "signature" : "api", outcome: data });
}

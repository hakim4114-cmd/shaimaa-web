import { NextResponse, type NextRequest } from "next/server";
import { mapSenditStatus, verifySenditSignature, type ShipmentStatus } from "@/lib/shipping/sendit-core";
import type { Json } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadSenditKeysForProvider } from "@/lib/shipping/sendit-keys";
import { reportSystemEvent } from "@/lib/data/system-events";

// Sendit → Merchant OS status updates (guide-webhook-sendit.pdf).
// The URL carries our provider id so several organizations can each have
// their own Sendit account; the signature proves the call comes from Sendit.
export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, { params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  if (!uuid.test(providerId)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const raw = await request.text();
  if (raw.length > 100_000) return NextResponse.json({ error: "too_large" }, { status: 413 });
  const signature = request.headers.get("x-sendit-signature");
  // Signed with that organization's Sendit keys.
  const keys = await loadSenditKeysForProvider(providerId);
  if (!keys) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!verifySenditSignature(raw, signature, [keys.secretKey, keys.publicKey])) {
    const admin = createSupabaseAdminClient();
    const { data: provider } = admin ? await admin.from("shipping_providers").select("organization_id").eq("id", providerId).maybeSingle() : { data: null };
    if (admin && provider) {
      await reportSystemEvent(admin, provider.organization_id, "sendit_webhook", "Sendit event rejected: invalid signature", {
        signature_header: signature ? "present" : "missing",
        hint: "Check that the webhook in Sendit uses the same API keys as Settings → Sendit."
      });
    }
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const code = typeof payload.code === "string" ? payload.code.trim() : "";
  const newStatus = typeof payload.newStatus === "string" ? payload.newStatus.trim() : "";
  if (!code || !newStatus) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { data, error } = await admin.rpc("apply_carrier_event", {
    p_provider_id: providerId,
    p_tracking_number: code,
    p_carrier_status: newStatus,
    p_status: (mapSenditStatus(newStatus) ?? null) as ShipmentStatus,
    p_payload: payload as Json
  });
  if (error) {
    // 5xx makes Sendit retry; a closed shipment or unknown provider will not change on retry.
    const permanent = /SHIPMENT_CLOSED|PROVIDER_NOT_FOUND|INVALID_TRANSITION/.test(error.message);
    const { data: provider } = await admin.from("shipping_providers").select("organization_id").eq("id", providerId).maybeSingle();
    if (provider) {
      await reportSystemEvent(admin, provider.organization_id, "sendit_webhook", `Sendit event not applied: ${error.message}`.slice(0, 300), { tracking: code, status: newStatus });
    }
    return NextResponse.json({ error: permanent ? "rejected" : "temporary" }, { status: permanent ? 200 : 500 });
  }
  return NextResponse.json({ ok: true, outcome: data });
}

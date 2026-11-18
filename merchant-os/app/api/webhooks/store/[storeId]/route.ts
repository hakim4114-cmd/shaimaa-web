import { NextResponse, type NextRequest } from "next/server";
import { isWooPing, parseStoreDelivery, signatureHeader, verifyStoreSignature, type StorePlatform } from "@/lib/integrations/stores";
import type { Json } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Online store → Merchant OS. The URL carries the store id; the signature,
// made with the secret saved for that store, proves the call comes from it.
// Orders land in the store inbox: imported, or waiting for the merchant.
export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const topicHeader: Partial<Record<StorePlatform, string>> = { shopify: "x-shopify-topic", woocommerce: "x-wc-webhook-topic" };

export async function POST(request: NextRequest, { params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  if (!uuid.test(storeId)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const raw = await request.text();
  if (raw.length > 500_000) return NextResponse.json({ error: "too_large" }, { status: 413 });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const [{ data: store }, { data: secret }] = await Promise.all([
    admin.from("stores").select("id, platform").eq("id", storeId).maybeSingle(),
    admin.from("store_secrets").select("secret").eq("store_id", storeId).maybeSingle()
  ]);
  if (!store || !secret) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const platform = store.platform as StorePlatform;

  // WooCommerce pings the URL (unsigned) when the webhook is saved.
  if (platform === "woocommerce" && isWooPing(raw)) return NextResponse.json({ ok: true, ping: true });

  if (!verifyStoreSignature(raw, request.headers.get(signatureHeader[platform]), secret.secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const header = topicHeader[platform];
  const parsed = parseStoreDelivery(platform, raw, header ? request.headers.get(header) : null);
  if (parsed.kind === "ignore") return NextResponse.json({ ok: true, ignored: parsed.reason });
  if (parsed.kind === "invalid") return NextResponse.json({ error: "invalid_order", reason: parsed.reason }, { status: 400 });

  const { data, error } = await admin.rpc("ingest_store_order", { p_store_id: storeId, p_order: parsed.order as unknown as Json });
  if (error) {
    // 5xx makes the store retry later; an unknown store will not change on retry.
    const permanent = /STORE_NOT_FOUND|EXTERNAL_ID_REQUIRED/.test(error.message);
    return NextResponse.json({ error: permanent ? "rejected" : "temporary" }, { status: permanent ? 400 : 500 });
  }
  return NextResponse.json({ ok: true, outcome: data });
}

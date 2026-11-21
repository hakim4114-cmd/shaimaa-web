import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { adminClient, organizationId, userClient } from "./db";
import { anonKey, finance, otherOwner, owner, supabaseUrl } from "./env";

// Step 5: security checks through the real endpoints and the database API.

test.describe("security headers", () => {
  test("pages send the security headers", async ({ request }) => {
    const response = await request.get("/sign-in");
    const headers = response.headers();
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["content-security-policy"]).not.toContain("unsafe-eval");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-powered-by"]).toBeUndefined();
  });
});

test.describe("carrier webhook", () => {
  async function senditProviderId() {
    const orgId = await organizationId(owner.slug);
    const { data } = await adminClient().from("shipping_providers").select("id").eq("organization_id", orgId).eq("adapter_key", "sendit").single();
    return data!.id as string;
  }

  test("rejects bad addresses, bad bodies and oversized bodies", async ({ request }) => {
    const providerId = await senditProviderId();
    expect((await request.post("/api/webhooks/sendit/not-a-uuid", { data: { code: "X1234" } })).status()).toBe(404);
    expect((await request.post("/api/webhooks/sendit/00000000-0000-4000-8000-000000000000", { data: { code: "X1234" } })).status()).toBe(404);
    expect((await request.post(`/api/webhooks/sendit/${providerId}`, { headers: { "Content-Type": "application/json" }, data: "{not json" })).status()).toBe(400);
    expect((await request.post(`/api/webhooks/sendit/${providerId}`, { data: { code: "bad code!" } })).status()).toBe(400);
    expect((await request.post(`/api/webhooks/sendit/${providerId}`, { headers: { "Content-Type": "application/json" }, data: JSON.stringify({ code: "X1234", pad: "x".repeat(120_000) }) })).status()).toBe(413);
  });

  test("replaying an event for a closed parcel changes nothing", async ({ request }) => {
    const providerId = await senditProviderId();
    const admin = adminClient();
    const { data: shipment } = await admin.from("shipments").select("id, tracking_number, order_id").eq("provider_id", providerId).eq("status", "delivered").limit(1).single();
    const count = async () => (await admin.from("shipment_events").select("id", { count: "exact", head: true }).eq("shipment_id", shipment!.id)).count;
    const before = await count();
    for (let i = 0; i < 2; i += 1) {
      const response = await request.post(`/api/webhooks/sendit/${providerId}`, { data: { code: shipment!.tracking_number, newStatus: "DELIVERED" } });
      expect(response.status()).toBeLessThan(500);
    }
    expect(await count()).toBe(before);
    expect((await admin.from("orders").select("status").eq("id", shipment!.order_id).single()).data?.status).toBe("delivered");
  });
});

test.describe("store webhook", () => {
  test("an unknown store, an oversized body and a replayed order are handled", async ({ request }) => {
    const orgId = await organizationId(owner.slug);
    const admin = adminClient();
    const { data: store } = await admin.from("stores").select("id").eq("organization_id", orgId).eq("name", "E2E Shopify").single();
    expect((await request.post("/api/webhooks/store/00000000-0000-4000-8000-000000000000", { data: {} })).status()).toBe(404);
    expect((await request.post(`/api/webhooks/store/${store!.id}`, { headers: { "Content-Type": "application/json" }, data: "x".repeat(600_000) })).status()).toBe(413);

    // The order sent in 06 again, correctly signed: still one order.
    const { data: existing } = await admin.from("external_orders").select("payload").eq("store_id", store!.id).eq("external_id", "7001").single();
    const body = JSON.stringify(existing!.payload);
    const signature = createHmac("sha256", "e2e-shopify-signing-key-0123456789").update(body, "utf8").digest("base64");
    const response = await request.post(`/api/webhooks/store/${store!.id}`, {
      headers: { "Content-Type": "application/json", "X-Shopify-Hmac-Sha256": signature, "X-Shopify-Topic": "orders/create" },
      data: body
    });
    expect(response.status()).toBe(200);
    const { count } = await admin.from("orders").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("external_id", "7001");
    expect(count).toBe(1);
  });
});

test.describe("tenant isolation through the database API", () => {
  test("another shop's owner can neither read nor change this shop", async () => {
    const orgId = await organizationId(owner.slug);
    const { data: order } = await adminClient().from("orders").select("id, status").eq("organization_id", orgId).eq("status", "delivered").limit(1).single();
    const other = await userClient(otherOwner);

    for (const table of ["orders", "customers", "products", "shipments", "shipping_providers", "stores", "system_events"] as const) {
      const { data } = await other.from(table).select("id").eq("organization_id", orgId);
      expect(data ?? [], `${table} must not be visible to another shop`).toEqual([]);
    }
    const { error: transitionError } = await other.rpc("transition_order", { p_order_id: order!.id, p_to: "cancelled", p_note: "attack" });
    expect(transitionError).not.toBeNull();
    const { error: keysError } = await other.rpc("set_sendit_credentials", { p_organization_id: orgId, p_public_key: "attacker-public", p_secret_key: "attacker-secret" });
    expect(keysError).not.toBeNull();
    await other.from("organizations").update({ delivery_included: true }).eq("id", orgId);
    expect((await adminClient().from("orders").select("status").eq("id", order!.id).single()).data?.status).toBe(order!.status);
    expect((await adminClient().from("organizations").select("delivery_included").eq("id", orgId).single()).data?.delivery_included).toBe(false);
  });

  test("secrets never reach a browser session, even the owner's", async () => {
    for (const user of [owner, finance, otherOwner]) {
      const client = await userClient(user);
      for (const table of ["provider_secrets", "store_secrets"] as const) {
        const { data } = await client.from(table).select("*");
        expect(data ?? [], `${table} readable by ${user.email}`).toEqual([]);
      }
    }
  });

  test("a visitor without an account reads nothing", async () => {
    const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    for (const table of ["orders", "customers", "organizations", "products"] as const) {
      const { data } = await anon.from(table).select("id").limit(1);
      expect(data ?? [], `${table} readable without an account`).toEqual([]);
    }
  });
});

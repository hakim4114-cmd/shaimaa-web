import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import ar from "../lib/i18n/dictionaries/ar";
import { signIn } from "./auth";
import { adminClient, organizationId } from "./db";
import { owner } from "./env";

// J8: an online store (Shopify) sends an order; only correctly signed calls are accepted.
const st = ar.stores;
const signingKey = "e2e-shopify-signing-key-0123456789";

function shopifyOrder(id: number, sku: string) {
  return {
    id,
    name: `#${id}`,
    currency: "MAD",
    financial_status: "pending",
    phone: null,
    note: "E2E",
    total_discounts: "0.00",
    total_shipping_price_set: { shop_money: { amount: "0.00", currency_code: "MAD" } },
    customer: { first_name: "Amal", last_name: "Test", phone: null },
    shipping_address: { first_name: "Amal", last_name: "Test", address1: "Rue 7", address2: "", city: "Kénitra", phone: "06 55 66 77 88" },
    line_items: [{ sku, title: "Chemise E2E", variant_title: "M", quantity: 1, price: "199.00" }]
  };
}

test.describe.serial("online store", () => {
  let storeId = "";

  test("the owner connects a Shopify store", async ({ page }) => {
    await signIn(page, owner);
    await page.goto("/settings");
    await page.getByRole("button", { name: st.add }).click();
    // The labels wrap their fields (and the select's options), so find the fields by role and name.
    await page.getByRole("combobox", { name: st.platform }).selectOption("shopify");
    await page.getByRole("textbox", { name: st.name, exact: true }).fill("E2E Shopify");
    await page.getByRole("textbox", { name: st.shopifySecret }).fill(signingKey);
    await page.getByRole("button", { name: st.connect, exact: true }).click();
    await expect(page.getByRole("button", { name: st.done })).toBeVisible();

    const orgId = await organizationId(owner.slug);
    const { data } = await adminClient().from("stores").select("id, platform").eq("organization_id", orgId).eq("name", "E2E Shopify").single();
    expect(data?.platform).toBe("shopify");
    storeId = data!.id;
  });

  test("a signed order arrives in Merchant OS", async ({ request }) => {
    const admin = adminClient();
    const orgId = await organizationId(owner.slug);
    const { data: variant } = await admin.from("product_variants").select("sku, products!inner(name, organization_id)").eq("title", "M").eq("products.name", "Chemise E2E").eq("products.organization_id", orgId).single();
    const body = JSON.stringify(shopifyOrder(7001, variant!.sku));
    const signature = createHmac("sha256", signingKey).update(body, "utf8").digest("base64");
    const response = await request.post(`/api/webhooks/store/${storeId}`, {
      headers: { "Content-Type": "application/json", "X-Shopify-Hmac-Sha256": signature, "X-Shopify-Topic": "orders/create" },
      data: body
    });
    expect(response.status()).toBe(200);
    await expect.poll(async () => (await admin.from("orders").select("id").eq("organization_id", orgId).eq("external_id", "7001").maybeSingle()).data?.id ?? null).not.toBeNull();
  });

  test("a call with a wrong signature is rejected and logged", async ({ request }) => {
    const body = JSON.stringify(shopifyOrder(7002, "WHATEVER"));
    const response = await request.post(`/api/webhooks/store/${storeId}`, {
      headers: { "Content-Type": "application/json", "X-Shopify-Hmac-Sha256": "bm90LXRoZS1zaWduYXR1cmU=", "X-Shopify-Topic": "orders/create" },
      data: body
    });
    expect(response.status()).toBe(401);
    const orgId = await organizationId(owner.slug);
    const admin = adminClient();
    const { data: order } = await admin.from("orders").select("id").eq("organization_id", orgId).eq("external_id", "7002").maybeSingle();
    expect(order).toBeNull();
    const { data: events } = await admin.from("system_events").select("message").eq("organization_id", orgId).eq("source", "store_webhook");
    expect(events?.some((e) => /invalid signature/.test(e.message))).toBe(true);
  });
});

import { expect, test } from "@playwright/test";
import ar from "../lib/i18n/dictionaries/ar";
import { signIn } from "./auth";
import { adminClient, organizationId } from "./db";
import { owner } from "./env";
import { sizeMVariant } from "./orders";

// J9: "delivery included in the price" makes new orders free to deliver; the switch brings the city fee back.
const to = ar.orders;
const ts = ar.shipping;

test("delivery included in the price, or paid by the customer", async ({ page }) => {
  const variantId = await sizeMVariant();
  const orgId = await organizationId(owner.slug);
  const admin = adminClient();
  const { data: city } = await admin.from("cities").select("id").eq("name_ar", "القنيطرة").single();
  // A 30 MAD customer fee for Kénitra.
  await admin.from("shipping_rates").delete().eq("organization_id", orgId).eq("city_id", city!.id).is("provider_id", null);
  const { error } = await admin.from("shipping_rates").insert({ organization_id: orgId, city_id: city!.id, customer_fee_cents: 3000 });
  expect(error).toBeNull();

  await signIn(page, owner);
  await page.goto("/settings");
  await page.getByRole("radio", { name: ts.deliveryPricingIncluded }).check();
  await expect(page.getByText(ts.deliveryPricingSaved)).toBeVisible();
  await expect.poll(async () => (await admin.from("organizations").select("delivery_included").eq("id", orgId).single()).data?.delivery_included).toBe(true);

  await page.goto("/orders/new");
  await expect(page.getByRole("radio", { name: to.deliveryIncluded })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText(to.deliveryIncludedHint)).toBeVisible();
  await page.getByLabel(to.phone, { exact: true }).fill("0666778899");
  await page.getByLabel(to.fullName, { exact: true }).fill("Hamza Test");
  await page.getByLabel(to.city, { exact: true }).selectOption(String(city!.id));
  await page.getByLabel(to.address, { exact: true }).fill("Rue 9, Kénitra");
  await page.getByLabel(to.product, { exact: true }).selectOption(variantId);

  // Switching to "paid by the customer" shows the city fee; back to included hides it.
  await page.getByRole("radio", { name: to.deliveryPaid }).click();
  await expect(page.getByLabel(to.shippingFee, { exact: true })).toHaveValue("30");
  await page.getByRole("radio", { name: to.deliveryIncluded }).click();
  await page.getByRole("button", { name: to.create }).click();
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
  const orderId = page.url().split("/").pop()!;
  const { data: order } = await admin.from("orders").select("shipping_fee_cents, cod_amount_cents").eq("id", orderId).single();
  expect(order).toEqual({ shipping_fee_cents: 0, cod_amount_cents: 19900 });

  // Back to the default: the customer pays delivery.
  await page.goto("/settings");
  await page.getByRole("radio", { name: ts.deliveryPricingPaid }).check();
  await expect.poll(async () => (await admin.from("organizations").select("delivery_included").eq("id", orgId).single()).data?.delivery_included).toBe(false);
});

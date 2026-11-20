import { expect, test } from "@playwright/test";
import ar from "../lib/i18n/dictionaries/ar";
import { signIn } from "./auth";
import { adminClient, organizationId, stockOf } from "./db";
import { shirt } from "./data";
import { owner } from "./env";

// J2: catalogue and stock. Creates the product the order journey (03) sells.
const tp = ar.products;
const ti = ar.inventory;

test("the owner creates a product with sizes and receives stock", async ({ page }) => {
  await signIn(page, owner);
  await page.goto("/products/new");

  await page.getByLabel(tp.name, { exact: true }).fill(shirt.name);
  await page.getByLabel(tp.status, { exact: true }).selectOption("active");
  await page.getByRole("button", { name: tp.addOption }).click();
  await page.getByLabel(tp.optionName, { exact: true }).fill("Taille");
  await page.getByLabel(tp.optionValues, { exact: true }).fill(shirt.sizes.join(", "));
  await page.getByRole("button", { name: tp.generate }).click();

  for (const size of shirt.sizes) {
    await page.getByLabel(`${tp.price} — ${size}`, { exact: true }).fill(shirt.price);
    await page.getByLabel(`${tp.cost} — ${size}`, { exact: true }).fill(shirt.cost);
  }
  await page.getByRole("button", { name: tp.save }).click();
  await expect(page).toHaveURL(/\/products\/[0-9a-f-]{36}/);

  // The database holds the product, active, with one variant per size and prices in cents.
  const orgId = await organizationId(owner.slug);
  const admin = adminClient();
  const { data: product } = await admin.from("products").select("id, status").eq("organization_id", orgId).eq("name", shirt.name).single();
  expect(product?.status).toBe("active");
  const { data: variants } = await admin.from("product_variants").select("id, title, price_cents, cost_cents").eq("product_id", product!.id).order("title");
  expect(variants?.map((v) => v.title).sort()).toEqual([...shirt.sizes].sort());
  for (const variant of variants ?? []) {
    expect(variant.price_cents).toBe(19900);
    expect(variant.cost_cents).toBe(8000);
  }

  // Receive 10 pieces of size M from its stock page.
  const sizeM = variants!.find((v) => v.title === "M")!;
  await page.goto(`/inventory/${sizeM.id}`);
  await page.getByRole("button", { name: ti.move }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(ti.quantity, { exact: true }).fill("10");
  await dialog.getByRole("button", { name: ti.submit }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => stockOf(sizeM.id)).toEqual({ onHand: 10, reserved: 0 });
});

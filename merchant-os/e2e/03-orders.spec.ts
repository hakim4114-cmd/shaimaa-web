import { expect, test } from "@playwright/test";
import ar from "../lib/i18n/dictionaries/ar";
import { signIn } from "./auth";
import { customer, shirt } from "./data";
import { adminClient, organizationId, stockOf } from "./db";
import { otherOwner, owner } from "./env";

// J3: order entry, confirmation call, stock reservation, cancellation, tenant isolation.
const to = ar.orders;

async function sizeMVariant() {
  const orgId = await organizationId(owner.slug);
  const admin = adminClient();
  const { data: product } = await admin.from("products").select("id").eq("organization_id", orgId).eq("name", shirt.name).maybeSingle();
  if (!product) throw new Error("The catalogue journey (02) must run first: product missing.");
  const { data: variant } = await admin.from("product_variants").select("id").eq("product_id", product.id).eq("title", "M").single();
  return variant!.id as string;
}

test.describe.serial("order to confirmation", () => {
  let orderId = "";
  let variantId = "";

  test("an order is created from a pasted WhatsApp message", async ({ page }) => {
    variantId = await sizeMVariant();
    await signIn(page, owner);
    await page.goto("/orders/new");

    await page.getByText(to.pasteTitle, { exact: true }).click();
    await page.getByRole("textbox", { name: to.pasteTitle }).fill(customer.message);
    await page.getByRole("button", { name: to.pasteApply }).click();
    await expect(page.getByLabel(to.fullName, { exact: true })).toHaveValue(customer.name);
    await expect(page.getByLabel(to.phone, { exact: true })).toHaveValue("06 11 22 33 44");
    await expect(page.getByLabel(to.city, { exact: true })).not.toHaveValue("");

    await page.getByLabel(to.product, { exact: true }).selectOption(variantId);
    await page.getByRole("button", { name: to.create }).click();
    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
    orderId = page.url().split("/").pop()!;

    const { data: order } = await adminClient().from("orders").select("status, subtotal_cents").eq("id", orderId).single();
    expect(order?.status).toBe("new");
    expect(order?.subtotal_cents).toBe(19900);
    // A new order does not touch stock yet.
    expect(await stockOf(variantId)).toEqual({ onHand: 10, reserved: 0 });
  });

  test("a confirmed call reserves the stock", async ({ page }) => {
    await signIn(page, owner);
    await page.goto(`/orders/${orderId}`);
    await page.getByRole("radio", { name: ar.callOutcome.confirmed, exact: true }).click();
    await page.getByRole("button", { name: to.saveCall }).click();

    await expect.poll(async () => (await adminClient().from("orders").select("status").eq("id", orderId).single()).data?.status).toBe("confirmed");
    expect(await stockOf(variantId)).toEqual({ onHand: 10, reserved: 1 });
    const { data: attempts } = await adminClient().from("order_call_attempts").select("outcome").eq("order_id", orderId);
    expect(attempts?.map((a) => a.outcome)).toEqual(["confirmed"]);
  });

  test("another shop cannot see this order", async ({ page }) => {
    await signIn(page, otherOwner);
    await page.goto(`/orders/${orderId}`);
    await expect(page.getByText(customer.name)).toHaveCount(0);
    await page.goto("/orders");
    await expect(page.getByText(customer.name)).toHaveCount(0);
  });

  test("cancelling the order releases the reservation", async ({ page }) => {
    await signIn(page, owner);
    await page.goto(`/orders/${orderId}`);
    await page.getByRole("button", { name: to.cancelOrder }).click();
    // Cancelling is destructive: the confirmation is an alert dialog.
    const dialog = page.getByRole("alertdialog");
    await dialog.getByLabel(to.cancelReason, { exact: true }).fill("Test: the customer changed their mind");
    await dialog.getByRole("button", { name: to.confirmCancel }).click();

    await expect.poll(async () => (await adminClient().from("orders").select("status").eq("id", orderId).single()).data?.status).toBe("cancelled");
    expect(await stockOf(variantId)).toEqual({ onHand: 10, reserved: 0 });
  });
});

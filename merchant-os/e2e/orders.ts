import { expect, type Page } from "@playwright/test";
import ar from "../lib/i18n/dictionaries/ar";
import { adminClient, organizationId } from "./db";
import { shirt } from "./data";
import { owner } from "./env";

const to = ar.orders;

/** The size-M variant created by the catalogue journey (02). */
export async function sizeMVariant(): Promise<string> {
  const orgId = await organizationId(owner.slug);
  const admin = adminClient();
  const { data: product } = await admin.from("products").select("id").eq("organization_id", orgId).eq("name", shirt.name).maybeSingle();
  if (!product) throw new Error("The catalogue journey (02) must run first: product missing.");
  const { data: variant } = await admin.from("product_variants").select("id").eq("product_id", product.id).eq("title", "M").single();
  return variant!.id as string;
}

/** A customer message as pasted from WhatsApp. */
export function whatsappMessage(name: string, phone: string) {
  return `الاسم: ${name}\nالهاتف: ${phone}\nالمدينة: القنيطرة\nالعنوان: حي الساكنية زنقة 5 رقم 12`;
}

/** Creates an order through the form from a pasted message; returns its id. */
export async function createOrderFromMessage(page: Page, message: string, variantId: string): Promise<string> {
  await page.goto("/orders/new");
  await page.getByText(to.pasteTitle, { exact: true }).click();
  await page.getByRole("textbox", { name: to.pasteTitle }).fill(message);
  await page.getByRole("button", { name: to.pasteApply }).click();
  await expect(page.getByLabel(to.city, { exact: true })).not.toHaveValue("");
  await page.getByLabel(to.product, { exact: true }).selectOption(variantId);
  await page.getByRole("button", { name: to.create }).click();
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop()!;
}

/** Logs a "confirmed" call on the order page. */
export async function confirmByCall(page: Page, orderId: string) {
  await page.goto(`/orders/${orderId}`);
  await page.getByRole("radio", { name: ar.callOutcome.confirmed, exact: true }).click();
  await page.getByRole("button", { name: to.saveCall }).click();
}

export async function orderStatus(orderId: string): Promise<string | undefined> {
  return (await adminClient().from("orders").select("status").eq("id", orderId).single()).data?.status;
}

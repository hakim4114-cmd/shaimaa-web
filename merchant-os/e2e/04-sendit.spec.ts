import { expect, test } from "@playwright/test";
import ar from "../lib/i18n/dictionaries/ar";
import { signIn } from "./auth";
import { adminClient, organizationId, stockOf } from "./db";
import { owner } from "./env";
import { confirmByCall, createOrderFromMessage, orderStatus, sizeMVariant, whatsappMessage } from "./orders";
import { mockKeys, mockParcels, setMockStatus } from "./sendit";

// J4 + J5: Sendit (mocked) from settings to delivery, and cancelling a parcel.
const ts = ar.shipping;

async function shipmentOf(orderId: string) {
  const { data } = await adminClient().from("shipments").select("id, tracking_number, status, provider_id").eq("order_id", orderId).neq("status", "cancelled").maybeSingle();
  return data;
}

test.describe.serial("Sendit", () => {
  let variantId = "";
  let providerId = "";
  let orderId = "";
  let code = "";

  test("the owner connects Sendit and turns on automatic sending", async ({ page }) => {
    variantId = await sizeMVariant();
    await signIn(page, owner);
    await page.goto("/settings?section=sendit");

    await page.getByLabel(ts.publicKey, { exact: true }).fill(mockKeys.publicKey);
    await page.getByLabel(ts.secretKey, { exact: true }).fill(mockKeys.secretKey);
    await page.getByRole("button", { name: ts.saveKeys }).click();
    await expect(page.getByText(ts.keysSaved)).toBeVisible();

    await page.getByRole("button", { name: ts.testConnection }).click();
    const form = page.locator("form").filter({ has: page.getByLabel(ts.pickupCity, { exact: true }) });
    // The mock offers Kénitra as pickup city; the form picks it by default.
    await expect(form.getByLabel(ts.pickupCity, { exact: true })).toHaveValue("42");
    await form.getByLabel(ts.pickupName, { exact: true }).fill("E2E Shop");
    await form.getByLabel(ts.pickupPhone, { exact: true }).fill("0612345678");
    await form.getByLabel(ts.pickupAddress, { exact: true }).fill("Rue de test 1, Kénitra");
    await form.getByRole("checkbox", { name: ts.enableSendit }).check();
    await form.getByRole("checkbox", { name: ts.autoShip }).check();
    await form.getByRole("button", { name: ar.common.save, exact: true }).click();
    await expect(page.getByText(ts.saved, { exact: true })).toBeVisible();

    const orgId = await organizationId(owner.slug);
    const { data: provider } = await adminClient().from("shipping_providers").select("id, is_active, credentials_set, settings").eq("organization_id", orgId).eq("adapter_key", "sendit").single();
    expect(provider?.is_active).toBe(true);
    expect(provider?.credentials_set).toBe(true);
    providerId = provider!.id;
  });

  test("a confirmed order is sent to Sendit automatically", async ({ page }) => {
    await signIn(page, owner);
    orderId = await createOrderFromMessage(page, whatsappMessage("كريم العلوي", "06 22 33 44 55"), variantId);
    await confirmByCall(page, orderId);

    await expect.poll(async () => (await shipmentOf(orderId))?.tracking_number ?? null, { timeout: 20_000 }).not.toBeNull();
    const shipment = await shipmentOf(orderId);
    code = shipment!.tracking_number!;
    expect(shipment?.provider_id).toBe(providerId);
    const parcel = (await mockParcels()).find((p) => p.code === code);
    expect(parcel, "the parcel was created at the (mock) carrier").toBeTruthy();
    expect(parcel!.payload.amount).toBe(199);
    // Confirmed: one piece reserved, none left the shelf yet.
    expect(await stockOf(variantId)).toEqual({ onHand: 10, reserved: 1 });
  });

  test("a forged webhook cannot mark the parcel delivered", async ({ request }) => {
    // Sendit says PENDING; the forged call claims DELIVERED. The app checks with the API.
    const response = await request.post(`/api/webhooks/sendit/${providerId}`, { data: { code, newStatus: "DELIVERED" } });
    expect(response.ok()).toBe(true);
    expect((await shipmentOf(orderId))?.status).not.toBe("delivered");
    expect(await orderStatus(orderId)).not.toBe("delivered");
  });

  test("a webhook for an unknown parcel is ignored", async ({ request }) => {
    const response = await request.post(`/api/webhooks/sendit/${providerId}`, { data: { code: "NOPE000001", newStatus: "DELIVERED" } });
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ ignored: "unknown parcel" });
  });

  test("pickup takes the piece off the shelf", async ({ request }) => {
    await setMockStatus(code, "PICKEDUP");
    const response = await request.post(`/api/webhooks/sendit/${providerId}`, { data: { code, newStatus: "PICKEDUP" } });
    expect(response.ok()).toBe(true);
    await expect.poll(async () => (await shipmentOf(orderId))?.status).toBe("picked_up");
    expect(await orderStatus(orderId)).toBe("shipped");
    expect(await stockOf(variantId)).toEqual({ onHand: 9, reserved: 0 });
  });

  test("delivery closes the order", async ({ request }) => {
    await setMockStatus(code, "DELIVERED");
    const response = await request.post(`/api/webhooks/sendit/${providerId}`, { data: { code, newStatus: "DELIVERED" } });
    expect(response.ok()).toBe(true);
    await expect.poll(async () => (await shipmentOf(orderId))?.status).toBe("delivered");
    expect(await orderStatus(orderId)).toBe("delivered");
  });

  test("cancelling a parcel before pickup keeps the order and its reservation", async ({ page }) => {
    await signIn(page, owner);
    const second = await createOrderFromMessage(page, whatsappMessage("نادية الإدريسي", "06 33 44 55 66"), variantId);
    await confirmByCall(page, second);
    await expect.poll(async () => (await shipmentOf(second))?.tracking_number ?? null, { timeout: 20_000 }).not.toBeNull();
    const secondCode = (await shipmentOf(second))!.tracking_number!;
    expect(await stockOf(variantId)).toEqual({ onHand: 9, reserved: 1 });

    await page.goto(`/orders/${second}`);
    await page.getByRole("button", { name: ts.cancelParcel }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("radio", { name: new RegExp(ts.cancelParcelReship) }).check();
    await dialog.getByRole("button", { name: ts.cancelParcel }).click();

    await expect.poll(async () => (await mockParcels()).some((p) => p.code === secondCode)).toBe(false);
    await expect.poll(() => orderStatus(second)).toBe("preparing");
    expect(await shipmentOf(second)).toBeNull();
    expect(await stockOf(variantId)).toEqual({ onHand: 9, reserved: 1 });
  });
});

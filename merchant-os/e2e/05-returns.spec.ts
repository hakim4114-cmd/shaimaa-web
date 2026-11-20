import { expect, test } from "@playwright/test";
import ar from "../lib/i18n/dictionaries/ar";
import { signIn } from "./auth";
import { adminClient, organizationId, stockOf } from "./db";
import { owner } from "./env";
import { confirmByCall, createOrderFromMessage, orderStatus, sizeMVariant, whatsappMessage } from "./orders";
import { setMockStatus } from "./sendit";

// J6: a refused parcel becomes a return; a resellable piece goes back on the shelf.
const tr = ar.money.returns;

test("a refused parcel comes back and its piece returns to stock", async ({ page, request }) => {
  const variantId = await sizeMVariant();
  const orgId = await organizationId(owner.slug);
  const admin = adminClient();
  const { data: provider } = await admin.from("shipping_providers").select("id").eq("organization_id", orgId).eq("adapter_key", "sendit").single();
  if (!provider) throw new Error("The Sendit journey (04) must run first.");

  await signIn(page, owner);
  const orderId = await createOrderFromMessage(page, whatsappMessage("يوسف المرابط", "06 44 55 66 77"), variantId);
  await confirmByCall(page, orderId);
  await expect
    .poll(async () => (await admin.from("shipments").select("tracking_number").eq("order_id", orderId).neq("status", "cancelled").maybeSingle()).data?.tracking_number ?? null, { timeout: 20_000 })
    .not.toBeNull();
  const { data: shipment } = await admin.from("shipments").select("tracking_number").eq("order_id", orderId).neq("status", "cancelled").single();
  const code = shipment!.tracking_number!;
  const before = await stockOf(variantId);

  // Picked up, then refused by the customer (Sendit REJECTED).
  for (const status of ["PICKEDUP", "REJECTED"]) {
    await setMockStatus(code, status);
    const response = await request.post(`/api/webhooks/sendit/${provider.id}`, { data: { code, newStatus: status } });
    expect(response.ok()).toBe(true);
  }
  await expect.poll(() => orderStatus(orderId)).toBe("refused");
  expect(await stockOf(variantId)).toEqual({ onHand: before.onHand - 1, reserved: before.reserved - 1 });

  const { data: ret } = await admin.from("returns").select("id, status").eq("order_id", orderId).single();
  expect(ret?.status).toBe("awaiting_receipt");

  // The parcel arrives back: received, inspected as resellable, closed.
  await page.goto("/returns");
  await page.getByRole("button", { name: tr.receive }).click();
  await expect.poll(async () => (await admin.from("returns").select("status").eq("id", ret!.id).single()).data?.status).toBe("received");
  await page.getByRole("button", { name: tr.conditions.resellable }).click();
  await expect.poll(async () => (await admin.from("returns").select("status").eq("id", ret!.id).single()).data?.status).toBe("inspected");
  expect(await stockOf(variantId)).toEqual({ onHand: before.onHand, reserved: before.reserved - 1 });
  await page.getByRole("button", { name: tr.close }).click();
  await expect.poll(async () => (await admin.from("returns").select("status").eq("id", ret!.id).single()).data?.status).toBe("closed");
});

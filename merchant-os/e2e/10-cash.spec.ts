import { expect, test } from "@playwright/test";
import ar from "../lib/i18n/dictionaries/ar";
import { signIn } from "./auth";
import { adminClient, organizationId } from "./db";
import { owner } from "./env";
import { addMockInvoice } from "./sendit";

// J7: Sendit pays the COD collected for a delivered parcel; recording the invoice settles the order.
const tc = ar.money.cash;

test("recording a Sendit payout invoice settles the delivered order", async ({ page }) => {
  const orgId = await organizationId(owner.slug);
  const admin = adminClient();
  const { data: provider } = await admin.from("shipping_providers").select("id").eq("organization_id", orgId).eq("adapter_key", "sendit").single();
  const { data: shipment } = await admin
    .from("shipments")
    .select("tracking_number, order:orders(id, cod_amount_cents, payment_status)")
    .eq("provider_id", provider!.id)
    .eq("status", "delivered")
    .limit(1)
    .single()
    .overrideTypes<{ tracking_number: string; order: { id: string; cod_amount_cents: number; payment_status: string } }, { merge: false }>();
  const order = shipment!.order;
  expect(order.payment_status).toBe("awaiting_remittance");

  // Collected 199 MAD, Sendit keeps its 19 MAD fee and transfers 180 MAD.
  const cod = order.cod_amount_cents / 100;
  await addMockInvoice({
    code: "FCT-E2E-001",
    status: "PAID",
    amount: cod - 19,
    date: "2026-11-20",
    items: [{ type: "delivery", code: shipment!.tracking_number, status: "DELIVERED", amount: cod, fee: 19 }]
  });

  await signIn(page, owner);
  await page.goto("/cash");
  await page.getByRole("button", { name: tc.load }).click();
  await page.getByRole("button", { name: tc.check }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(tc.blocked)).toHaveCount(0);
  await dialog.getByRole("button", { name: tc.record }).click();

  await expect.poll(async () => (await admin.from("orders").select("payment_status").eq("id", order.id).single()).data?.payment_status).toBe("settled");
  const { data: remittance } = await admin.from("cod_remittances").select("reference").eq("organization_id", orgId).eq("reference", "FCT-E2E-001").maybeSingle();
  expect(remittance, "the payout is recorded once, with Sendit's reference").not.toBeNull();

  // The invoice now shows as recorded and cannot be recorded twice.
  await page.goto("/cash");
  await page.getByRole("button", { name: tc.load }).click();
  await expect(page.getByText(tc.recordedBadge)).toBeVisible();
});

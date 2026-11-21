import { expect, test } from "@playwright/test";
import ar from "../lib/i18n/dictionaries/ar";
import { signIn } from "./auth";
import { adminClient, organizationId } from "./db";
import { owner } from "./env";

// Money guardrails: crossing a rule needs a written reason; the capital floor blocks owner pay.
const tm = ar.money;
const tp = ar.pay;

test("an ad expense over the monthly budget needs a reason and is flagged", async ({ page }) => {
  await signIn(page, owner);
  await page.goto("/finance");
  await page.getByLabel(tm.category, { exact: true }).selectOption("advertising");
  await page.getByLabel(tm.amount, { exact: true }).fill("2500");
  await page.getByRole("button", { name: tm.addExpense }).click();

  // Default budget: 2,000 MAD a month while last month had no revenue.
  await expect(page.getByText(tp.guard.crossing)).toBeVisible();
  await expect(page.getByText(tp.guard.flags.ad_budget)).toBeVisible();
  const record = page.getByRole("button", { name: tp.guard.recordAnyway });
  await expect(record).toBeDisabled();
  await page.getByLabel(tp.guard.reasonLabel, { exact: true }).fill("Test campaign push, agreed");
  await record.click();
  await expect(page.getByText(tp.guard.crossing)).toHaveCount(0);

  const orgId = await organizationId(owner.slug);
  const { data } = await adminClient().from("expenses").select("guard_flags, guard_reason").eq("organization_id", orgId).eq("amount_cents", 250000).single();
  expect(data?.guard_flags).toContain("ad_budget");
  expect(data?.guard_reason).toBe("Test campaign push, agreed");

  // The report lists it under the rules crossed.
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: ar.reports.violationsTitle })).toBeVisible();
  await expect(page.getByText("Test campaign push, agreed")).toBeVisible();
});

test("below the capital floor, owner pay is blocked and the bell says why", async ({ page }) => {
  // The shop put 5,000 in (11-pay) and has spent more than it sold: cash + stock + money at the carrier is under 80 %.
  await signIn(page, owner);
  await page.goto("/pay");
  await expect(page.getByRole("heading", { name: tp.capitalTitle })).toBeVisible();
  await expect(page.getByText(tp.statusBelow.split("{")[0]!.trim())).toBeVisible();

  await page.getByLabel(tp.amount, { exact: true }).first().fill("100");
  await page.getByLabel(tp.reasonRequired, { exact: true }).fill("Small amount for a test");
  await page.getByRole("button", { name: tp.withdrawAnyway }).click();
  await expect(page.getByText(ar.errors.CAPITAL_BELOW_FLOOR)).toBeVisible();

  await page.getByRole("button", { name: ar.topbar.notifications }).click();
  await expect(page.getByText(ar.topbar.alerts.capitalBelowFloor)).toBeVisible();
});

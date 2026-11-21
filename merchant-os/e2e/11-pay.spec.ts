import { expect, test } from "@playwright/test";
import ar from "../lib/i18n/dictionaries/ar";
import { signIn } from "./auth";
import { owner } from "./env";

// Owner pay: the page says what is missing, step by step, and explains the safe amount in words.
const tp = ar.pay;

test("the pay page guides the setup and explains the safe amount", async ({ page }) => {
  await signIn(page, owner);
  await page.goto("/pay");
  await expect(page.getByRole("heading", { name: tp.stepsTitle })).toBeVisible();
  await expect(page.getByText(tp.step1Todo)).toBeVisible();
  await expect(page.getByText(tp.step3Todo)).toBeVisible();
  await expect(page.getByRole("link", { name: tp.openClose }).first()).toHaveAttribute("href", "/close");

  // Step 1: rules, then the opening balance.
  await page.getByLabel(tp.reserveFloor, { exact: true }).fill("1000");
  await page.getByRole("button", { name: ar.common.save, exact: true }).click();
  await expect(page.getByText(tp.safeTitle)).toBeVisible();
  await page.getByLabel(tp.amount, { exact: true }).last().fill("5000");
  await page.getByRole("button", { name: tp.addEntry, exact: true }).click();
  await expect(page.getByText(tp.step1Todo)).toHaveCount(0);

  // No pay line chosen yet: nothing is safe to take, and the page says why in words.
  await expect(page.getByText(tp.explain.no_owner_fund)).toBeVisible();
  await expect(page.getByText(tp.ruleShort)).toBeVisible();
});

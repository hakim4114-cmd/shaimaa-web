import { expect, test } from "@playwright/test";
import ar from "../lib/i18n/dictionaries/ar";
import { owner } from "./env";

test.describe("access", () => {
  test("a page that needs sign-in redirects to sign-in", async ({ page }) => {
    await page.goto("/orders");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("a wrong password shows a translated message", async ({ page }) => {
    await page.goto("/sign-in");
    await page.locator("#email").fill(owner.email);
    await page.locator("#password").fill("not-the-password");
    await page.getByRole("button", { name: ar.auth.signInButton }).click();
    await expect(page.getByText(ar.auth.errors.INVALID_CREDENTIALS)).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("the owner signs in and reaches the home page", async ({ page }) => {
    await page.goto("/sign-in");
    await page.locator("#email").fill(owner.email);
    await page.locator("#password").fill(owner.password);
    await page.getByRole("button", { name: ar.auth.signInButton }).click();
    await expect(page).not.toHaveURL(/\/(sign-in|onboarding)/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });
});

import { expect, test } from "@playwright/test";
import ar from "../lib/i18n/dictionaries/ar";
import { signIn } from "./auth";
import { finance, owner } from "./env";

// J1: access and roles.
test.describe("access", () => {
  test("a page that needs sign-in redirects to sign-in", async ({ page }) => {
    await page.goto("/orders");
    await expect(page).toHaveURL(/\/sign-in/);
    // The sign-in form must be usable, not the "not configured" notice.
    await expect(page.getByRole("button", { name: ar.auth.signInButton })).toBeEnabled();
    await expect(page.getByText(ar.auth.errors.NOT_CONFIGURED)).toHaveCount(0);
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
    await signIn(page, owner);
    await expect(page).not.toHaveURL(/\/onboarding/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole("heading", { level: 1, name: ar.shipping.settingsTitle })).toBeVisible();
  });

  test("a finance member cannot open Settings", async ({ page }) => {
    await signIn(page, finance);
    await page.goto("/settings");
    await expect(page).not.toHaveURL(/\/settings/);
  });
});

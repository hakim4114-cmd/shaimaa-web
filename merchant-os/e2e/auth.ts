import { expect, type Page } from "@playwright/test";
import ar from "../lib/i18n/dictionaries/ar";
import type { TestUser } from "./env";

/** Signs in through the real form and waits until the app has left the sign-in page. */
export async function signIn(page: Page, user: TestUser) {
  await page.goto("/sign-in");
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill(user.password);
  await page.getByRole("button", { name: ar.auth.signInButton }).click();
  await expect(page).not.toHaveURL(/\/sign-in/);
}

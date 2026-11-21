import { expect, test } from "@playwright/test";
import ar from "../lib/i18n/dictionaries/ar";
import { signIn } from "./auth";
import { shirt } from "./data";
import { finance, owner } from "./env";

// Reports: product performance for the period, verdicts, and the Excel download.
const tr = ar.reports;

test("the owner sees product performance and downloads the report", async ({ page }) => {
  await signIn(page, owner);
  await page.goto("/reports");
  await expect(page.getByRole("heading", { level: 1, name: tr.title })).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: shirt.name });
  await expect(row).toBeVisible();
  // A handful of test orders: too early to judge.
  await expect(row.getByText(tr.verdicts.early)).toBeVisible();

  await page.getByRole("link", { name: tr.secondHalf }).click();
  await expect(page).toHaveURL(/half=2/);
  await page.getByRole("link", { name: tr.wholeMonth }).click();

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: tr.download }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^merchant-os-report-\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.xlsx$/);
});

test("the report file is refused to someone without money access", async ({ page, request }) => {
  const anonymous = await request.get("/api/reports");
  expect(anonymous.ok()).toBe(false);
  await signIn(page, finance);
  const response = await page.request.get("/api/reports");
  // Finance members may see money: the file is served.
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("spreadsheetml");
});

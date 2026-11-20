import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against a production build and a local Supabase stack
// (docs/QA_PLAN.md). Never point these at the hosted project.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const senditMock = `http://127.0.0.1:${process.env.SENDIT_MOCK_PORT ?? 4010}`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  // The journeys build on each other (01, 02, 03…): a retry would replay a step on changed data.
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "ar-MA",
    timezoneId: "Africa/Casablanca",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    // Stand-in for the Sendit API: no test ever reaches the real one.
    { command: "node e2e/sendit-mock.mjs", url: `${senditMock}/__control/health`, reuseExistingServer: !process.env.CI, stdout: "pipe" },
    ...(process.env.E2E_BASE_URL
      ? []
      : [
          {
            command: "npm run start",
            url: baseURL,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
            stdout: "pipe" as const,
            stderr: "pipe" as const,
            env: { SENDIT_API_BASE_URL: `${senditMock}/api/v1` }
          }
        ])
  ]
});

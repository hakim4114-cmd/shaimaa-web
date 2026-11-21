import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import ar from "../lib/i18n/dictionaries/ar";
import { signIn } from "./auth";
import { adminClient, organizationId } from "./db";
import { owner } from "./env";

// Step 4: every main page on a phone, a tablet and a desktop. No sideways scrolling,
// the page title visible, the navigation reachable, and no critical accessibility problem.
const viewports = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 }
] as const;

const pages = ["/", "/orders", "/orders/new", "/order", "/products", "/inventory", "/shipping", "/returns", "/cash", "/pay", "/settings", "/problems"];

async function latestOrderPath(): Promise<string> {
  const orgId = await organizationId(owner.slug);
  const { data } = await adminClient().from("orders").select("id").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(1).single();
  return `/orders/${data!.id}`;
}

async function expectNoSidewaysScroll(page: Page, where: string) {
  const overflow = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > width + 1 || r.left < -1) && getComputedStyle(el).position !== "fixed";
      })
      .filter((el) => !el.closest("[data-allow-scroll], .overflow-x-auto, .overflow-auto"))
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")}`);
    return { scroll: document.documentElement.scrollWidth - width, wide };
  });
  expect(overflow.scroll, `${where}: page scrolls sideways (${overflow.wide.join(", ")})`).toBeLessThanOrEqual(1);
}

for (const viewport of viewports) {
  test.describe(`${viewport.name} ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("sign-in page", async ({ page }) => {
      await page.goto("/sign-in");
      await expect(page.getByRole("button", { name: ar.auth.signInButton })).toBeVisible();
      await expectNoSidewaysScroll(page, "/sign-in");
      await page.screenshot({ path: test.info().outputPath(`sign-in-${viewport.name}.png`), fullPage: true });
    });

    test("main pages", async ({ page }) => {
      // Anything the Content-Security-Policy blocks shows up as a console error.
      const blocked: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error" && /Content Security Policy/i.test(message.text())) blocked.push(`${page.url()}: ${message.text()}`);
      });
      const orderPath = await latestOrderPath();
      await signIn(page, owner);
      for (const path of pages) {
        const target = path === "/order" ? orderPath : path;
        const response = await page.goto(target);
        expect(response?.status(), `${target} answers`).toBeLessThan(400);
        await expect(page.getByRole("heading", { level: 1 }).first(), `${target}: title visible`).toBeVisible();
        await expectNoSidewaysScroll(page, target);
        await page.screenshot({ path: test.info().outputPath(`${viewport.name}${target.replaceAll("/", "_") || "_home"}.png`), fullPage: true });
      }
      expect(blocked, blocked.join("\n")).toEqual([]);
    });

    test("navigation is reachable", async ({ page }) => {
      await signIn(page, owner);
      await page.goto("/");
      if (viewport.width < 1024) {
        await page.getByRole("button", { name: ar.nav.openMenu }).click();
      }
      const link = page.getByRole("link", { name: ar.nav.orders, exact: true }).first();
      await expect(link).toBeVisible();
      await link.click();
      await expect(page).toHaveURL(/\/orders$/);
    });
  });
}

test("no critical accessibility problems on the main pages", async ({ page }) => {
  const orderPath = await latestOrderPath();
  await signIn(page, owner);
  const problems: string[] = [];
  const serious: string[] = [];
  for (const path of pages) {
    const target = path === "/order" ? orderPath : path;
    await page.goto(target);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    for (const v of results.violations) {
      const line = `${target} — ${v.id} (${v.nodes.length}): ${v.help}`;
      if (v.impact === "critical") problems.push(line);
      else if (v.impact === "serious") serious.push(line);
    }
  }
  // Serious findings are reported for review; critical ones fail the run.
  if (serious.length) test.info().annotations.push({ type: "serious accessibility findings", description: serious.join("\n") });
  console.log(`Accessibility: ${problems.length} critical, ${serious.length} serious\n${[...problems, ...serious].join("\n")}`);
  expect(problems, problems.join("\n")).toEqual([]);
});

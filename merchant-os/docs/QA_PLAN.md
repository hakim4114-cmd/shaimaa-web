# QA plan: end-to-end tests, responsive checks, security pass (Phases 6–7)

Status: **proposed, 2026-11-20**. Nothing below is implemented yet.

## Why

Today Merchant OS has 116 unit tests (vitest), 18 SQL test files that run every business rule against PostgreSQL, and one real manual test with Sendit. Nothing drives the real interface in a browser. A broken button, a server action that throws, a page that overflows on a phone, or a missing translation can reach production unnoticed. This plan closes that gap before the first real stock arrives.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Test database | **Local Supabase stack** (Supabase CLI: Postgres, Auth, PostgREST, Storage) started inside the GitHub Actions job | Production must never be touched: the ledgers are immutable, so test data could never be removed. A second hosted project is not needed: the free plan allows two active projects, and both slots are already used (Merchant OS, Mizan). |
| Where the tests run | **CI on every pull request**, as a separate `e2e` job | The Docker registry is not reachable from the development container, so the stack cannot start there. CI runners have Docker. |
| Browser engine | Playwright, Chromium | Already the project's choice for screenshots. WebKit and Firefox add CI time for little COD-merchant value; revisit before opening to other merchants. |
| Sendit | **Mock server** started by the test runner; the client reads `SENDIT_API_BASE_URL` only when `NODE_ENV !== "production"` | Tests must never create real parcels. The production build ignores the variable, so it cannot be redirected. |
| Test data | Created by a global setup through the Auth admin API and the app's own RPCs; the whole stack is thrown away after the job | Every run starts clean; no cleanup code to maintain. |
| Sign-up | Enabled only in the local stack's `supabase/config.toml` | Production keeps `disable_signup = true`. The CLI config file does not affect the hosted project. |

## Critical journeys (each is one test file)

| # | Journey | What is checked |
|---|---|---|
| J1 | **Access** | Sign in; wrong password shows a translated message; a page that needs sign-in redirects; sign out. A `finance` member cannot open Settings; a member of org B cannot see an order of org A (by URL). |
| J2 | **Catalogue and stock** | Create a product with size and colour variants; receive stock; the stock page shows it. |
| J3 | **Order to confirmation** | Create an order with the paste box; the duplicate-phone warning appears; log a call "confirmed"; stock becomes reserved; cancelling releases it. |
| J4 | **Shipping (manual carrier)** | Ship a confirmed order; on-hand stock falls at pickup; mark it delivered; the amount appears as money to collect. |
| J5 | **Shipping (Sendit, mocked)** | Save keys; auto-send on confirmation creates a parcel at the mock; print label; cancel the parcel before pickup ("reship" and "customer cancelled"); a forged webhook for an unknown parcel is ignored; a webhook for a real parcel is applied only after the API read. |
| J6 | **Refusal and return** | A refused parcel becomes a return; receiving it puts the stock back. |
| J7 | **Cash** | Record a carrier invoice; cash position and owner pay update. |
| J8 | **Store intake** | A signed Shopify-style webhook creates an order in the inbox; a bad signature is rejected and logged in Problems. |
| J9 | **Delivery pricing** | With "delivery included", a new order has a delivery fee of 0, and the switch on the order brings the city fee back. |

Every journey runs in Arabic (right to left). J1 and J3 also run in French.

## Responsive and visual checks

- Viewports: phone 390×844, tablet 820×1180, desktop 1440×900.
- Pages: home, orders list, order detail, new order, products, stock, shipping, returns, cash, pay, settings, problems, sign-in.
- Assertions on each page and viewport: no horizontal page scroll; the main action button is visible and clickable; the navigation opens and closes; no text overflowing its card.
- Screenshots are saved as a CI artifact for review, not compared pixel by pixel (fonts and data change).
- Accessibility smoke check with axe-core on the same pages: no critical violations.

## Security pass (Phase 7)

- Run the existing `security-review` over the code added since 1.10.0 (store webhooks, Sendit webhook, problems log, delivery pricing).
- Cross-organization access through PostgREST with a real user token (J1 covers the UI; this covers the API).
- Webhook endpoints: oversized body, bad JSON, wrong provider id, replay of the same event.
- Response headers on the deployed site (CSP, frame options, referrer policy).

## Delivery steps

1. Infrastructure: `supabase/config.toml`, Playwright config, global setup (users, organizations), the Sendit mock, the `e2e` CI job. **Done when** an empty test signs in on CI.
2. J1–J4.
3. J5–J9.
4. Responsive matrix and accessibility check, then fixes for whatever they find.
5. Security pass and fixes.

Each step ends with a pull request whose CI is green, and a short report: done, tested, open issues, next step.

## Cost and risk

- CI time per pull request grows by about 6–10 minutes (stack start and build). A private repository on the free GitHub plan has 2,000 Actions minutes a month; CI runs on each pull request and again on `main`. To stay well inside that, the `e2e` job runs on pull requests only, and only when `merchant-os/` changed.
- Pulling the Supabase images on CI can occasionally fail; the job retries the start once.
- Mocked Sendit can drift from the real API. The mock's responses are copied from the real responses recorded on 2026-11-19, and the manual real test stays in the release checklist.

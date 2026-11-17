# Changelog

## 1.2.0 — Pricing center, phase 1 (2026-11-17)

### Added
- **Pricing center** (`/pricing`): a price simulator built on the cash-on-delivery reality. Ads are paid for every order received, refused parcels still cost shipping, and only delivered orders bring money.
  - **Inputs**: price, unit cost, discount (% or MAD), shipping paid by the customer, carrier fee, extra refusal fee, packaging, ad cost per order, confirmation rate, delivery rate and target margin.
  - **Where defaults come from**: your last 90 days when the sample is large enough, marked «your data (n)». Otherwise market estimates are used, marked «estimate».
  - **Results**:
    - profit per delivered order and per order received, and margin;
    - break-even price;
    - highest ad cost per order before a loss;
    - lowest delivery rate before a loss;
    - price for a target margin, plus the list price to show before a discount.
  - **Grid**: profit or loss across 5 prices × 5 delivery rates, coloured green, orange or red.
- The model lives in `lib/pricing/simulate.ts`, with tests: break-even points return zero profit, the target margin is reached, and discounts behave as expected.

### Next (phase 2)
- Real discounts and promotions applied to orders, with their cost in the reports.

## 1.1.0 — Claude connection (2026-11-17)

### Added
- **Claude, read-only (MCP)**:
  - In Settings, create a private connector link (shown once) and add it to Claude as a custom connector.
  - Claude can answer from seven tools: today's tasks, business summary for any range, orders (filters), one order, stock with dormant days, campaigns, and cash.
- **Security**:
  - Only the link's SHA-256 hash is stored, and the link can be revoked in one tap.
  - Every call runs as the user who created the link, and their owner/admin role is checked again on each call. Removing that user cuts access.
  - Read-only. Customer phone numbers, addresses and names are never returned.
  - At most 5 links per organization; each shows when it was last used.
- Endpoint `/api/mcp/<link>`: Streamable HTTP with JSON responses (initialize, tools/list, tools/call, ping).
- Database: `assistant_tokens`, `create_assistant_token`, `assistant_call`. New database tests in `80_assistant.test.sql`.

## 1.0.0 — Weekly review and monthly close (2026-11-17)

### Added
- **Weekly review** (`/review`): eight indicators, this week against last week, each with the question it answers:
  - cash received;
  - money still with the carrier, by age since delivery (0–7, 8–14, 15+ days);
  - money in stock and the dormant part (no sale for 30+ days);
  - delivered orders and delivery rate;
  - cost per delivered order;
  - contribution margin;
  - refusals and returns.

  It also has an ads block per campaign and the **decision of the week**: what, why, and the number to watch, judged later as worked / did not work / too early.
- **Monthly close** (`/close`):
  1. Profit and loss for the month.
  2. Funds («الصناديق»): set percentages once and get a proposed split of the net profit. The rounding remainder goes to the first fund, so the total is exact. Closing the month records the split and cannot be changed afterwards.
  3. Dormant stock at 30 / 60 / 90 days, valued at cost.
- Database: `owner_decisions`, `fund_plan`, `monthly_closes` (immutable, one per month) and `stock_health`. New database tests in `70_routines.test.sql`.

### Not yet (from the routines spec)
- Cash accounts and payables: «cash available» shows the cash received for now.
- Complaints log.

## 0.9.0 — Product photos and exchanges (2026-11-17)

### Added
- **Product photo**:
  - One main photo per product, resized in the browser (max 1200 px, WebP) so uploads stay small on mobile data.
  - Stored in a private Supabase bucket under the organization's folder, with storage policies checked by role.
  - Thumbnails appear in the product list.
- **Exchanges**:
  - Available from a delivered order: choose the new items, the price difference and the shipping fee.
  - The original order becomes «exchange requested», and an exchange return waits for the old items.
  - A replacement order is created, confirmed and linked to the original, and stock is reserved.
  - The replacement's revenue is only what the customer pays now (price difference + fee), so the same sale is never counted twice.
  - Shipped with Sendit's exchange option: the courier delivers the new parcel and brings back the old one.
- Database: `products.image_path`, the `product-images` bucket and its policies, and `create_exchange_order`. New database tests in `60_exchange.test.sql`.

## 0.8.0 — Exports, import, shipping fees per city (2026-11-17)

### Added
- **Excel (.xlsx) and CSV exports**, in Arabic, French or English, chosen per export:
  - Available for orders, expenses, shipments and money still with the carrier.
  - Excel files keep numbers and MAD amounts as numbers, freeze the header row and use a right-to-left sheet for Arabic.
  - CSV files are UTF-8 with BOM, so Excel shows Arabic correctly.
  - Formulas typed into user fields are neutralised.
- **Print / PDF** (browser): the finance and cash pages print without the menu.
- **Packing list** (A4): units to pick per product, then every order to prepare with the customer, items and amount to collect.
- **CSV order import**:
  - Download a template; headers in English, French or Arabic are recognised.
  - Lines sharing an `order_ref` form one order.
  - Each row is validated and errors show their line number; nothing is created before you confirm.
  - Orders are created through `create_order`, so blocklist, prices and stock rules still apply.
  - A report shows what was created and what failed.
- **Settings → shipping fee per city**: the fee each customer pays, filled automatically in manual orders, with a «fill the empty cities» shortcut.

## 0.7.0 — Cash, returns, expenses, marketing, real dashboard (2026-11-17)

### Added
- **Dashboard with real figures**:
  - «Today» block: calls due, orders to prepare, parcels waiting for pickup, delivery problems, returns to receive.
  - Range tabs, with net profit, delivered revenue, money still with the carrier, ad cost per delivered order, confirmation rate and refusal rate.
- **Cash (COD)**:
  - What is still with the carrier, and what was delivered more than 10 days ago without being paid.
  - **Sendit invoices** checked parcel by parcel before recording. A parcel whose amount differs from the order blocks the invoice. Refusal and pickup fees and credits are kept as «other charges», so the recorded payout always equals the money received.
  - Payout history.
- **Returns**: receive the parcel (with the return fee), mark each item resellable (back to stock), damaged or missing, then close.
- **Finance**: expense entry by category; profit and loss for a range, following BUSINESS_RULES.md (stock purchases are cash out, not P&L); and a warning when cost prices are missing.
- **Marketing**:
  - Campaigns, and ad spend recorded per campaign.
  - Each order can be attributed to a campaign, at entry or later.
  - Report per campaign: spend, orders, confirmation rate, deliveries and refusals, cost per delivered order, and return on ad spend on delivered revenue.
- Database: `report_summary`, `campaign_report` and `record_carrier_invoice` (exact reconciliation), plus `other_charges_cents` on payouts. New database tests in `50_money.test.sql`.

### Not included (on purpose)
- Reading Meta / TikTok ad accounts automatically. Spend is entered by hand: the APIs need app review and add little for a single merchant at this stage.

## 0.6.0 — Shipping with Sendit (2026-11-17)

### Added
- **Ship with Sendit** from a confirmed order:
  - Search Sendit's cities and neighbourhoods, with Sendit's fee and delay.
  - The parcel is created at Sendit with the customer, the address, the amount to collect and the order number as reference.
  - The order moves to «ready to ship» on its own.
- **Labels**: 10×10 thermal or A4, per parcel or for every parcel waiting.
- **Pickup request** for every parcel waiting, with the pickup details from Settings (Kénitra).
- **Automatic delivery updates** by Sendit webhook, verified by signature:
  - Pickup ships the order and takes the stock out.
  - Delivery marks the order delivered and awaiting payout.
  - Refusal marks the order refused and opens a return awaiting the parcel.
  - Unreachable / postponed show the courier's message, the next attempt and the count of failed calls.
  - Each event is applied once and logged.
- **Shipping page**: tabs To pick up / On the way / Problems / Closed.
- **Settings → Sendit**:
  - Test the connection, set the pickup city and details, and the open / try options (both allowed, as the owner chose).
  - Shows the webhook address to paste into Sendit.
- Database: provider settings, carrier fields on shipments, a `carrier_events` log, `register_carrier_shipment`, and `apply_carrier_event` (server key only). New database tests cover it.

### Setup (owner)
- In Vercel, set `SENDIT_PUBLIC_KEY`, `SENDIT_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, then redeploy.
- Then Settings → Sendit, and create the webhook in Sendit.

### Not yet
- Payout reconciliation from Sendit invoices.
- Exchanges.

## 0.5.0 — Orders: entry and confirmation (2026-11-17)

### Added
- **Order entry built for a phone**: the number comes first, in any format. The customer's history then appears right away (delivered / refused / cancelled, with a warning for past refusals), and the name, city and address are filled from the last order. The city comes from the list, and its shipping fee is filled when a rate exists. A sticky total stays visible at the bottom. Orders are entered by hand only (no store connection yet), as decided with the owner.
- **Orders list**: tabs To call / Confirmed / Preparing / Ready to ship / All open / All, with counts. Search by phone, name or order number. Cards on phones, a table from tablet up.
- **Call queue**: due call-backs first, then orders never called (oldest first). A banner shows how many calls are due now.
- **Order page**:
  - Call panel: one tap per outcome; call-back presets (in 1 hour, this evening, tomorrow); a note is required to cancel.
  - Next step: confirm without a call, preparing, ready to ship, or cancel with a reason.
  - Totals, history with notes, and the list of calls.
  - Customer card with tap-to-call and the customer's history.
- **WhatsApp in one tap**: four messages (ask to confirm, couldn't reach you, confirmed, cancelled) in Darija, Arabic or French. A preview is shown and WhatsApp opens with the text prefilled; nothing is sent automatically.
- **Edit before confirmation**: products, quantities, city, fee, discount, name, address and notes.
- **Customers page** and **blocked numbers**:
  - Owner, admin and operator can block a number.
  - Only owner and admin can unblock, or create an order for a blocked number.
- Dates are shown in Moroccan time (`Africa/Casablanca`, taken from the time-zone database).

### Fixed
- Product form on phones: the variants table was cut off. Each variant is now a card with all fields visible (reported by the owner).
- Form rows used keys that differed between server and browser rendering.

### Not yet
- Shipped / delivered / refused are set by the shipping module (step 5), so stock and cash stay consistent.
- Shipping rates per city have no settings screen yet: type the fee in the order.

## 0.4.2 — Identity "Ink" (2026-11-16)

### Changed
- New visual identity chosen by the owner from three directions: ink-navy sidebar and mobile drawer, tinted background instead of plain white, electric-violet accent (darker in light mode for contrast), redesigned status colours checked to WCAG AA in light and dark.
- New brand mark (an M with a dot) on the sidebar, sign-in, favicon, Apple icon and installed-app icons; the installed icon is an ink tile.
- Manrope replaces Inter for Latin text and numbers; slightly rounder corners.
- `Metric` gains a `hero` tone; stock value is the hero figure on the stock page.

## 0.4.1 — Phone fixes (2026-11-16)

### Fixed
- Stock page was 1022 px wide on a 360 px phone: hidden screen-reader labels inside the scrollable table escaped it, widening the page and pushing the menu drawer off-screen (reported by the owner from a phone). Tables now contain their positioned children.
- Long product names overlapped the next column; name cells wrap.

### Changed
- Stock shows as cards on phones (table from 640 px up).
- Command centre: "Add products and stock" links to Products and is ticked once a product exists.

## 0.4.0 — Products and stock (2026-11-16)

### Added
- **Products:** list with search and status filter; create/edit with generic options (up to 3, e.g. Size + Color, or Capacity) and generated variants (SKU suggestion, price, cost — empty when unknown — and low-stock threshold). Variants removed from a product are archived, never deleted. Categories created on the fly.
- **Stock:** per-variant in stock / reserved / available / damaged / in inspection, value at cost (items without cost reported, not valued), low-stock filter, stock movements (receipt, count correction with required note, damaged, write-off) and an immutable movement history per variant.
- Migration `20261116000500_save_product.sql` (applied live): `products.options` and `save_product(org, payload)` — product, category and variants saved in one transaction.
- Data layer (`lib/data/`): active-organization context with role flags, database-error mapping to translated messages, typed catalog queries.
- Tests: `30_products.test.sql` (save, edit, archive, errors, permissions), variant helper unit tests, translation coverage for data errors.

### Not yet verified
- The signed-in product and stock screens were not exercised in a browser (no test account available to the automated checks). Query shapes were validated against the live schema.

## 0.3.1 — Phones, tablets and computers (2026-11-16)

### Added
- Installable app (PWA): web app manifest, app icons (favicon, Apple touch icon, 192/512 and maskable), Apple web-app metadata. "Add to Home Screen" on iPhone/iPad, "Install app" on Android and desktop Chrome/Edge. No offline mode: data is always live.
- Touch-screen sizing (`pointer: coarse`): inputs at 16 px (stops iPhone/iPad zooming on focus) and 44 px tall; buttons, menu items and navigation at 40–44 px. Mouse screens keep the compact sizes.
- Safe-area padding for notched phones and tablets when installed.

### Changed
- Navigation follows the revised roadmap steps; deferred modules (production, marketing, support inbox) removed from the menu.

### Verified
- iPhone 13, iPhone SE, Pixel 7, iPad portrait and landscape, Galaxy Tab S4, 1024 px laptop and 1440 px desktop: no horizontal scrolling, touch targets ≥ 40 px and 16 px inputs on every touch device.

## 0.3.0 — Revised plan and order essentials (2026-11-16)

### Changed
- Roadmap rewritten after a critical review: order intake, confirmation calls and a "today" view come first; SaaS billing removed; production, WhatsApp API inbox, ads APIs, non-auto-entrepreneur taxes and international carriers deferred.

### Added
- Password recovery: "Forgot password?" request page, reset page (also reachable from the user menu as "Change password"), translated errors.
- Application error page that never shows raw errors.
- Migration `20261116000400_order_workflow.sql`, applied to the live project: Moroccan cities reference (40 cities, aliases, per-organization additions), shipping rates per city, confirmation call log with call-back scheduling, customer blocklist with owner override, customer delivery history, editing orders before confirmation, `create_order` v2 (city reference and default shipping fee).
- Database tests for the workflow (`20_order_workflow.test.sql`); live smoke test extended to 15 checks.

### Security
- Next.js 16.4.3 → 16.4.5: fixes GHSA-mfr8-8qww-v76h (moderate). Next.js had started refusing to build the affected version.

## 0.2.0 — Phase 2.1: authentication and organizations (2026-11-14)

### Added
- Supabase Auth with email + password through server actions (`@supabase/ssr`), session refresh and route protection in `proxy.ts`.
- Sign-in, sign-up, "check your email" (with resend) pages; `/auth/confirm` handles confirmation links (PKCE `code` and `token_hash`).
- Onboarding: create a business (name + identifier) through `create_organization`; the creator becomes owner.
- Active organization (cookie, validated against memberships), user menu with business switcher and sign-out.
- Command centre shows the workspace status for signed-in users; still no metrics until orders exist.
- Typed database client generated from the live schema (`lib/supabase/database.types.ts`, `scripts/supabase-types.sh`).
- Validation with Zod (password 10–72 characters, normalized email, slug pattern identical to the database), open-redirect protection for `next`, failed submissions keep non-secret values.
- Tests: auth schemas, redirect safety, error mapping, translation coverage for every auth error code.

### Supabase project configuration
- Minimum password length raised from 6 to 10; redirect allow list set to `http://localhost:3000/**`.
- Custom email templates are not available on the free plan without custom SMTP, so confirmation is by link only.

## 0.1.0 — Phase 1: foundations (2026-11-13)

### Added
- Separate Next.js 16 / TypeScript app in `merchant-os/`, isolated from the storefront's lint, typecheck and test tooling.
- Database migrations (`supabase/migrations`):
  - Multi-organization tenancy with roles (`owner`, `admin`, `operator`, `warehouse`, `finance`, `viewer`).
  - Catalog with variants (SKU, barcode, options, price, nullable cost, minimum stock).
  - Inventory levels per variant and location with on-hand / reserved / available / damaged / inspection buckets and an append-only movement ledger.
  - Customers, orders (with PII split into `order_contacts`), order items with price/cost snapshots, immutable order timeline.
  - Shipments and shipment events, COD remittances, returns/refusals/exchanges with inspection, expenses, audit log.
  - Transactional business functions: order creation from catalog prices, state-machine transitions with stock reservation/release/shipment, shipment status sync, COD settlement, return receipt and inspection, refunds.
  - Row Level Security on every table; workflow tables writable only through those functions.
- Database test suite (67 assertions: value checks plus expected-error checks for permissions, invalid transitions and overselling) and a concurrent overselling test, run by `npm run db:test` and in CI against PostgreSQL 16.
- Design system: semantic colour tokens (light/dark), typography for Latin and Arabic, Button, Field/Input/Textarea/Select, Badge, OrderStatusBadge, Card, PageHeader, Metric, Table, Skeleton, EmptyState, Dialog, ConfirmDialog, DropdownMenu, Tooltip, Kbd, toasts.
- Application shell: collapsible sidebar (remembered per browser), mobile drawer, global search (Ctrl/⌘ K, navigation only for now), notification centre (empty until Phase 2), theme and language preferences; Arabic (RTL), French and English.
- Unit tests for money parsing/formatting, Moroccan phone normalization, dictionary completeness, and a guard that keeps the UI order workflow identical to the database transition table.
- CI job for `merchant-os` (lint, typecheck, unit tests, database tests, build).

### Deployed
- Migrations applied to the Merchant OS Supabase project (PostgreSQL 17.11) and verified with `supabase/tests/live_smoke.sql` (12/12, rolled back). Added `scripts/supabase-sql.sh` to run SQL through the Management API.

### Changed (storefront, tooling only)
- Root `eslint.config.mjs`, `tsconfig.json` and new `vitest.config.mjs` exclude `merchant-os/`. No storefront source file changed.

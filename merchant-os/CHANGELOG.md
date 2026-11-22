# Changelog

## 1.21.0 — Delivery follow-up, unanswered orders (2026-11-22)

### Added
- **Delivery follow-up** (`/tracking`): every parcel with the courier. Missed deliveries come first, then today's deliveries, then parcels on the way (oldest first). Each card has call, and a one-tap WhatsApp message that fits where the parcel is: "arriving today", "the courier could not reach you, when are you available?", or "on its way" with the tracking number. Darija, Arabic or French. A short note saves to the order. The delivery-problems alert and the command center open it.
- Two WhatsApp templates on the order page too: arriving today, courier could not reach you.

### Changed
- Call mode: an order unanswered after 5 calls (no answer, busy, unreachable) leaves the queue. It is listed apart with "try again" or a one-tap cancel, with the reason written for you.

## 1.20.0 — "Atlas" identity (2026-11-22)

### Changed
- New identity, chosen by the owner from three directions. Sand page, zellige-green menu, terracotta for actions and a saffron marker for where you are. It replaces the cold grey-violet "Ink" look, with a matching dark mode, and every text colour is checked to WCAG AA.
- The logo, app icon and browser bar take the new colours. The net-profit card is now green.
- Command center: each of today's tasks has its own coloured icon. "Calls to make" opens call mode.

## 1.19.0 — Call mode (2026-11-22)

### Added
- **Calls** (`/calls`): the confirmation queue next to the order being called. Each order shows how long it has waited (green under an hour, orange up to four hours, red after). The page shows the customer, the items, cash on delivery, the campaign, whether the customer is new or has refused before, a big call button and WhatsApp. Four large outcome buttons: confirmed, no answer, call back (with time presets), cancelled (reason required). Other outcomes sit in a list. After each outcome the next order opens by itself. Today's counts are shown at the top: left, confirmed, no answer and confirmation rate.
- A "Calls" entry in the menu and a button on the orders page.

## 1.18.2 — Faster pages (2026-11-21)

### Changed
- The bell's counts no longer hold back every page: the page shows at once and the bell fills in when its counts arrive (they were the slowest reads, run on every page load).
- Order page: the reads that depend only on the order run together in one round instead of three in a row.

## 1.18.1 — Ads below the floor, logo leads home (2026-11-21)

### Changed
- Below the capital floor, an ad expense (a new test) needs a written reason and is flagged `below_floor` in the rules crossed. Before, only owner withdrawals were blocked.
- The logo, in the sidebar, the phone menu and the phone top bar, leads back to the command center.

## 1.18.0 — Rules scaled to the capital (2026-11-21)

### Changed
- The money rules no longer depend on one amount of capital. Reserve = 25 % of the capital (or a fixed minimum if larger), ad budget = 15 % of the capital a month (unless a fixed amount is set), loss cap = 10 % of the capital per test (unless the campaign sets its own). They grow when money is put in, and are zero until capital is entered.
- Pay and cash: three new percentages in the rules, and "what the rules give today" (reserve, this month's ad budget, the loss cap for a new test) in the capital card.
- Campaigns that kept the old 600 MAD default and settings with the old 2,000 MAD budget now follow the rule.

## 1.17.2 — Scenario review fixes (2026-11-21)

A review of real-life situations against the money and test rules (docs/SCENARIOS.md).

### Fixed
- An ad expense with no campaign, while a campaign runs, needs a written reason and is flagged `no_campaign`: it used to escape the loss cap and the ad cost per product.
- A returned or refused piece that comes back damaged or missing now counts as a loss in the test's result.
- The tests list shows how many lines were sold without a cost (the result looks better than it is).
- "Pause ads and wait" now counts the carrier cost of the parcels still on the way.

### Added
- Bell: orders delivered over 7 days ago whose money is still at Sendit; a running campaign with no ad spend recorded for 3 days.
- New order with a campaign picked by default: a hint to pick "no campaign" for customers who did not come from the ad.

## 1.17.1 — Reading a test correctly (2026-11-21)

### Changed
- Reports → tests: each test shows its orders out of 20 and says "judge it" at 20 orders. A test ends at whichever comes first, 20 orders or the loss cap.
- Past the cap with orders still on the way, a test says "pause ads and wait" instead of "stop", when those orders, if delivered, could bring it back above the cap (ads are counted when paid, revenue only when delivered). It shows how many orders are pending and how much they could bring back.
- The bell now says to pause the test's ads and check Reports.

## 1.17.0 — Loss cap per test, ad budget tied to profit (2026-11-21)

### Added
- Each campaign has a cumulative loss cap (600 MAD by default, set on the campaign form). Once its result after ads reaches the cap, the bell and Reports say "stop this test", and a new ad expense on it needs a written reason (flagged `loss_cap`).
- Reports: a "tests" section with each campaign's result since its start, its cap and stop / running; a note when the period ended less than 10 days ago (delivery results not final yet).
- New order: with a single campaign it is picked by default; with several, a hint asks to pick one so ad cost per product stays right.

### Changed
- Ad budget: the share of last month's revenue counts only when last month made money after ads; otherwise the fixed amount applies.

## 1.16.2 — Product verdict after ads (2026-11-21)

### Fixed
- Reports: each campaign's ad spend is shared over the orders it brought (then over their lines by value), shown per product, and the profit and verdict are now **after ads**. A product with a good margin before ads but losing money on each order once ads are paid no longer shows as winning.
- Orders without a campaign carry no ad cost: link every order to its campaign.

## 1.16.1 — Money guardrails: review fixes (2026-11-21)

### Fixed
- Business value now subtracts unpaid obligations and counts carrier money net of the carrier fee; capital is counted from the opening date like cash.
- Nothing can be dated before the opening date (expenses, cash entries, withdrawals): such entries escaped the cash count.
- Recorded expenses can no longer be edited (only the description), so an amount cannot be raised after the check; delete and record again instead.
- Ad budget is the larger of the fixed amount and 30 % of last month's revenue (a weak month used to give less than no revenue); returned orders are not revenue.
- Migration `20261121000200_money_guardrails_fixes`.

## 1.16.0 — Money guardrails (2026-11-21)

### Added
- **Capital protection** on the pay page: capital put in, business value (cash + stock at cost + money at the carrier), the 80 % floor and the status. Below the floor, owner withdrawals are refused outright and the bell shows it.
- **Reserve:** owner withdrawals can no longer go below it, even with a reason.
- **Expenses that cross a rule** (below the reserve, over the monthly ad budget, a stock purchase over half the free cash) ask for a written reason before they are recorded, and are flagged.
- **Reports → Money rules crossed** and an Excel sheet: every flagged expense and over-limit withdrawal with its reason.
- Rules editable in Pay and cash → Rules (defaults: floor 80 %, ads 2,000 MAD or 30 % of last month's revenue, stock 50 %; reserve suggested 1,500 MAD).
- Migration `20261121000100_money_guardrails`.

## 1.15.0 — Reports: products, cities, sleeping stock, Excel (2026-11-21)

### Added
- **Reports** page (menu: Money): a month or one of its halves (1–15, 16–end), compared with the period before.
- Product performance from the orders created in the period: orders, confirmation and delivery rates, revenue after discount, costs (pieces delivered and carrier for delivered and refused parcels), gross profit, margin, stock, days of stock left, and a verdict — winning, watch, losing, too early (fewer than 20 orders), sleeping (in stock, no sale for 30 days).
- Cities by delivery rate, sleeping stock with its value, campaigns.
- **Download** the whole report as one Excel file (summary, products, variants, cities, campaigns, sleeping stock).
- Computed on the server from existing tables: no database change.

## 1.14.0 — Owner pay page you can read (2026-11-21)

### Changed
- **Pay and cash page:** a 3-step checklist says what the calculation still needs (money today, your share of the profit, a closed month), with a link to the monthly close, which is otherwise hidden in the essential menu.
- The safe amount comes with one sentence in plain words using your own numbers (for example: "you earned 2,400 of pay, but free cash is only 2,000: take 2,000 now").
- Every line of the calculation has a short explanation; the rule reads "never more than you earned, nor more than the money you really have".
- The pay line choice shows each line's percentage of the profit.
- No change to the calculation itself.

## 1.13.0 — Delivery included in the price, or paid by the customer (2026-11-19)

### Added
- **Delivery pricing** (Settings → Shipping fee per city): the customer pays the city's delivery fee (as before), or delivery is included in the product price, so new orders get a delivery fee of 0.
- On each order, a switch "Delivery: paid by the customer / included in the price" starts from that default and can be changed for one order.
- The Sendit cost of each city still counts in profit either way; only what the customer pays changes.
- Migration `20261119000500_delivery_included`: `organizations.delivery_included`; `app.default_shipping_fee` returns 0 when it is on. A fee typed on the order always wins.

## 1.12.0 — Delivery fees imported from Sendit (2026-11-19)

### Added
- **Import from Sendit** (Settings → Shipping fee per city): reads Sendit's price list for your pickup city (all pages of `GET /districts`). Each city's Sendit fee is recorded as its Sendit cost (used for profit). You choose the customer fee: same as Sendit for cities without one, same as Sendit everywhere, or leave customer fees untouched; optionally plus a fixed amount.
- Sendit cities missing from the city list can be added as your own cities, so any city can be chosen on an order.
- One fee per Sendit city: the district named like the city (its main area), otherwise its lowest district fee.

## 1.11.3 — Sendit status updates applied safely (2026-11-19)

### Fixed
- Sendit status updates were all rejected: Sendit's signature matches none of the documented ways with the account keys. An update is now used as a signal only: the app reads the parcel's real status from Sendit with your keys and applies that. Nothing a third party sends can change a status by itself.
- Label printing confirmed working with a real parcel.
- **Cancel the parcel asks why:** *Ship it again* (order back to Preparing, stock stays reserved) or *The customer cancelled* (with a reason: the order is cancelled too and its stock is available for sale again). So a cancelled order no longer keeps stock reserved by mistake.
- Refreshing a parcel that was deleted at Sendit now says so and points to “Cancel the parcel”, instead of showing “Page non trouvée”.

## 1.11.2 — Cancel a parcel before pickup (2026-11-19)

### Added
- **Cancel the parcel** on a Sendit parcel not picked up yet: deletes it at Sendit (or accepts that it was already deleted there) and cancels it in the app. The order goes back to *Preparing*, stock stays reserved, and it can be shipped again. Found during the first real test: a parcel deleted at Sendit left the order "ready to ship" with nothing to ship, and the status refresh answered "Page non trouvée".

## 1.11.1 — Fixes from the first real Sendit parcel (2026-11-19)

### Fixed
- Printing labels: the Sendit response is read more tolerantly (other field names, relative or http links); when no file comes back, the error says what Sendit answered.
- Sendit webhook: an upper-case hex signature is accepted. A rejected event now keeps its payload and signature in the problems log (status payloads carry no customer data), to work out Sendit's signing scheme without exposing keys.

## 1.11.0 — Problems log and daily backups (2026-11-19)

### Added
- **Problems log** (`/problems`, in the bell for owners and admins): rejected Sendit status updates, rejected or unreadable store orders, and parcels Sendit refused during automatic sending are recorded with a counter and a hint, until marked as handled.
- **Daily encrypted database backup** (`.github/workflows/backup.yml`): `pg_dump` of the application and accounts, AES-256 encrypted with your passphrase, kept 30 days. It starts working once the two secrets are added; setup and restore steps in `docs/BACKUPS.md`.

## 1.10.0 — Review follow-ups (2026-11-19)

### Changed
- **Public sign-up is closed** during the private trial (Supabase `disable_signup`); the sign-up page says so and the sign-in page no longer links to it. Set `NEXT_PUBLIC_SIGNUP_OPEN=true` only after re-enabling sign-up in Supabase.
- **Confirming never waits for Sendit:** automatic sending now runs as its own request right after the confirmation; when it cannot send, the reason is written in the order timeline.
- **Getting started** on the home page: six real steps (products with cost, delivery fees, Sendit, opening cash, first order, first parcel), each ticked from your data.
- **Essentials view** (Preferences → Sections, the default): hides Customers, Finance, Weekly review, Monthly close, Marketing and Pricing until you choose "All sections". The "Assistant (coming soon)" placeholder is removed; the Claude link is in Settings.
- Manual and store orders share one code path for the customer record and the order number.

### Added
- Bell: orders confirmed more than 24 hours ago and still not shipped.

### Fixed
- A store order without a usable customer name failed and the store retried forever; it is now imported with "Client" + the last 4 digits of the phone.

## 1.9.0 — Review fixes: faster pages, correct low-stock count (2026-11-19)

### Changed
- **Faster navigation:** the session is checked from the signed JWT (`getClaims`, verified locally against the project's ES256 keys) instead of calling the Auth server twice per page (proxy + layout). Falls back to the Auth server if verification cannot run.
- Webhooks and the Claude connector no longer go through session handling in the proxy.
- The bell's low-stock count is one SQL function (`low_stock_count`) instead of loading every stock row on each page.

### Fixed
- Low-stock count was per location row: a variant stocked in two locations could be counted twice, or flagged although its total was enough. It is now per variant, summed over locations.

## 1.8.0 — Confirmation channel (2026-11-18)

### Added
- When recording a confirmation attempt, choose how the customer was reached: **phone call or WhatsApp**. The channel shows in the call history, and a confirmed order keeps the channel that confirmed it (`orders.confirmed_via`).
- Weekly review: **"Confirmation: phone or WhatsApp?"**, the refusal rate of confirmed orders per channel over the last 60 days (orders whose status was changed by hand are shown apart). This is the data needed to decide later which orders may be confirmed by WhatsApp only.

## 1.7.0 — Automatic sending to Sendit (2026-11-18)

### Added
- **Send to Sendit automatically when an order is confirmed** (Settings → Sendit, off by default). The parcel is created with the order's details right after the confirming call or status change, and the result is shown on screen and noted in the order timeline.
- It never guesses the Sendit district: it uses the district chosen last time for that city (remembered whenever you ship by hand), or the only district of the city / the district named exactly like it. Otherwise the order stays confirmed and waits for you to choose, once; the choice is remembered.
- The manual "Ship with Sendit" button and the automatic path share one code path (`lib/shipping/ship-order.ts`).

## 1.6.0 — Each merchant uses their own Sendit account (2026-11-18)

### Changed
- **Sendit keys per organization.** An owner or admin enters their own Sendit keys in Settings → Sendit. The keys are checked with Sendit, then stored on the server only (`provider_secrets`, service role). Parcels, labels, pickups, invoices, status refresh and webhook signatures all use the keys of the order's organization.
- The shared `SENDIT_PUBLIC_KEY` / `SENDIT_SECRET_KEY` environment variables are no longer used: before this, every organization would have created parcels on the same Sendit account.

### Action needed
- Enter your Sendit keys again in Settings → Sendit (rotate them in Sendit first if they were ever shared), then delete the two old variables from Vercel.

## 1.5.0 — Online stores and WhatsApp (2026-11-18)

### Added
- **Online stores**: connect Shopify, WooCommerce (WordPress) or a custom site in Settings. New orders arrive by themselves through a signed webhook, as *New* orders (still called and confirmed), never twice.
- **Store orders to fix**: orders that cannot be created (unknown SKU, invalid phone, blocked customer, other currency, paused store) wait with the reason and how to fix it; retry or dismiss. Shown in the bell and on the Orders page.
- **WhatsApp**: two new prefilled messages (parcel shipped with its tracking number, delivery reminder) and "paste the customer's message" on the new-order form, which fills phone, city, name and address.

### Not yet
- YouCan: it sends orders only to a registered YouCan partner app (OAuth); planned as its own step.

## 1.4.3 — Faster pages (2026-11-18)

### Changed
- Server functions now run in London (`lhr1`), next to the Supabase database (`eu-west-2`), instead of Vercel's default Washington (`iad1`). Every page makes several database calls in a row; each one no longer crosses the Atlantic. London is also closer to Morocco.

## 1.4.2 — Release build (2026-11-18)

### Changed
- No code change. Triggers the production build of 1.4.0 and 1.4.1, which Vercel skipped on 2026-11-17 because the daily deployment limit was reached.

## 1.4.1 — Review fixes and fewer deployments (2026-11-17)

### Fixed
- **A month can be closed only once it is over.** It was possible to close the current month mid-month, which permanently locked a partial profit and the owner pay computed from it. This is now enforced by the database (row-level policy) and explained on the page.

### Changed
- `merchant-os/vercel.json`: Vercel now builds Merchant OS only for `main`, and only when files under `merchant-os/` changed. Branch previews and storefront-only commits are skipped, which keeps the daily deployment limit free for real releases.

## 1.4.0 — Reminders and recurring obligations (2026-11-17)

### Added
- **Recurring obligations**: rent, internet, phone, electricity… are entered once as weekly, monthly or yearly. Marking one paid creates the next one automatically.
- **Bell with real alerts**, computed on each page from live records:
  - obligations overdue or due within 7 days;
  - calls due;
  - delivery problems;
  - returns to receive;
  - products low in stock.

  A red dot appears when something is overdue, and each alert links to the page that fixes it.
- **Today block**: a new «obligations due (7 days)» tile.
- **Duplicate guard**: entering an expense with the same category and amount as an open obligation asks whether it is the same money, so it is not counted twice.
- **Claude**: a new `obligations` tool («what do I have to pay this week?»).

## 1.3.1 — More expense categories (2026-11-17)

### Added
- Expense and obligation categories requested by the owner: internet, phone, AI tools, electricity & water, transport, debt repayment.

### Changed
- Operating expenses in the profit report are now «every category except stock purchases, production and debt repayment». New categories therefore count automatically.
- Debt repayment counts as cash out only, never as a cost in profit: repaying a loan gives back borrowed money.

## 1.3.0 — Owner pay and cash (2026-11-17)

### Added
- **«You can safely withdraw today»** (`/pay`): one number, with its calculation shown line by line. It is the smaller of:
  1. **pay earned**: the owner-pay share of closed months, minus what was already withdrawn;
  2. **free cash**: the cash balance, minus obligations due within 30 days, minus a minimum reserve.

  A month counts only once it is closed. When the amount is 0, the page says why (no closed month, pay not earned, cash tight, limited by cash).
- **Cash balance**: opening balance and date, money put in, and corrections. Carrier payouts and expenses are counted automatically.
- **Obligations**: who, how much and when. Paying one records it as an expense, so it is counted once.
- **Withdrawals**: recorded by the database itself. Up to the safe amount they go through freely. Above it, a written reason of 10+ characters is required and the withdrawal is flagged. Entries cannot be edited or deleted.
- Database: `cash_settings`, `cash_entries`, `payables`, `safe_withdrawal`, `record_owner_withdrawal` and `pay_payable`. New database tests in `90_safe_pay.test.sql`.

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

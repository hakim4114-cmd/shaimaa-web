# Business rules

Rules marked **[DB]** are enforced by PostgreSQL and covered by `npm run db:test`. Rules marked **[planned]** are decisions for later phases.

## Roles

| Capability | owner | admin | operator | warehouse | finance | viewer |
| --- | :-: | :-: | :-: | :-: | :-: | :-: |
| Manage members | ✓ | | | | | |
| Organization settings, locations, carriers, campaigns | ✓ | ✓ | | | | |
| Edit catalog | ✓ | ✓ | ✓ | | | |
| Receive / adjust / damage stock | ✓ | ✓ | | ✓ | | |
| Create orders, confirm, cancel, mark returned/exchange | ✓ | ✓ | ✓ | | | |
| Prepare, ship, deliver, refuse; shipments | ✓ | ✓ | ✓ | ✓ | | |
| Receive and inspect returns | ✓ | ✓ | | ✓ | | |
| Close returns | ✓ | ✓ | ✓ | | | |
| COD remittances, refunds, expenses | ✓ | ✓ | | | ✓ | |
| Read customer PII | ✓ | ✓ | ✓ | ✓ | | |
| Read orders, stock, shipments, returns | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Read audit log | ✓ | ✓ | | | | |

An organization always keeps at least one owner **[DB]**.

## Money

- Stored as integer minor units; arithmetic happens in integers **[DB]**. Input accepts `890`, `890.5`, `890,50`; thousands separators are rejected because `1,150` is ambiguous.
- Order prices come from the catalog at creation time; there is no per-line price override. Price concessions are recorded as `discount_cents` so they stay visible in reporting **[DB]**.
- `total = subtotal − discount + shipping_fee`, `discount ≤ subtotal`, `0 ≤ cod_amount ≤ total` **[DB]**. COD defaults to the total; a lower value records a deposit.
- Cost is snapshotted per order line. A variant with unknown cost has `cost_cents = NULL`; reports must flag such lines instead of treating cost as 0 **[DB stores NULL; reporting planned]**.

## Customers

- Phones are normalized to E.164 (`+212` + 9 digits starting with 5, 6 or 7) **[DB check; normalizer in `lib/phone.ts`]**.
- One customer per phone per organization. A new order with a known phone reuses the customer and refreshes name, and city/address when provided **[DB]**.
- Duplicate-order warning: before creating an order, the app looks up orders from the same phone in the last 7 days that are not cancelled and shows them **[planned, Phase 2]**. It warns; it does not block.

## Order workflow

```
new ──► confirmation_pending ──► confirmed ──► preparing ──► ready_to_ship ──► shipped ──► delivered
 │              │                    │             │               │              │            │
 └──────────────┴────────────────────┴─────────────┴───────────────┴► cancelled   └► refused   ├► returned
                                                                                                └► exchange_requested
```

- Only the transitions above are possible **[DB: `app.order_transitions`; UI mirror checked by a unit test]**.
- `new → confirmed` directly is allowed (confirmed on the first call).
- Cancelling requires a reason **[DB]**. Shipped orders cannot be cancelled; they end as delivered or refused.
- Every change is appended to the immutable timeline with actor and note **[DB]**.

### Stock effects

| Transition | Effect | Movement type |
| --- | --- | --- |
| → `confirmed` | `reserved += qty` for each line; fails with `INSUFFICIENT_STOCK` if `available < qty`, leaving the order unchanged | `reservation` |
| → `cancelled` (if reserved) | `reserved −= qty` | `reservation_release` |
| → `shipped` | `on_hand −= qty`, `reserved −= qty` | `shipment` |
| → `refused` / `returned` / `exchange_requested` | opens a return case; **no stock change yet** | — |

Stock is reserved at confirmation, not at creation: unconfirmed COD orders are frequently fake or abandoned and must not block sellable stock. Overselling is prevented because reservation locks the stock row and checks `available` in the same transaction **[DB, concurrency-tested]**.

### Payment status

| Status | Meaning |
| --- | --- |
| `unpaid` | Not delivered yet. |
| `awaiting_remittance` | Delivered with COD > 0: the carrier/courier holds the cash — a **receivable**. |
| `settled` | Cash received (remittance recorded), or delivered with COD = 0. |

## Shipping

- At most one non-cancelled shipment per order; tracking numbers are unique per carrier **[DB]**.
- Carrier status updates also move the order so the two never disagree **[DB]**: picked up / in transit / out for delivery / failed attempt while `ready_to_ship` → order `shipped`; `delivered` → order `delivered`; `returned_to_sender` → order `refused`.
- `delivered`, `returned_to_sender` and `cancelled` shipments are closed **[DB]**.
- `failed_attempt` and `delivered` increment `delivery_attempts` **[DB]**.
- `shipping_cost_cents` is what the carrier charges the merchant. `orders.shipping_fee_cents` is what the customer pays. They are different numbers.

## COD reconciliation

- A remittance lists the orders it pays. Each order must be `awaiting_remittance`, and `collected_cents` must equal the order's COD amount exactly; otherwise the whole remittance is rejected (`COD_AMOUNT_MISMATCH`) **[DB]**. Discrepancies are investigated, never absorbed silently.
- Fees withheld by the carrier are recorded per order; `net_received = gross_collected − fees` **[DB]**.
- An order can be settled only once **[DB]**.

## Returns, refusals, exchanges

1. A return case opens automatically when an order becomes `refused`, `returned` or `exchange_requested`, listing all lines.
2. **Receive:** units enter the `inspection` bucket. They are **not** sellable **[DB]**.
3. **Inspect each line:** `resellable` → back to `on_hand` (restock); `damaged` → `damaged` bucket; `missing` → written off **[DB]**.
4. When every line is decided the case is `inspected`; refunds can be recorded (≤ order total), then the case is closed **[DB]**.

Exchanges: the replacement is a new order linked through `orders.exchange_of_order_id` **[schema ready; UI planned]**.

## Inventory

- `on_hand` = physically present and sellable (includes reserved), `available = on_hand − reserved`, `damaged` and `inspection` are separate, non-sellable buckets **[DB]**.
- Every change is a movement row; levels always equal the sum of their movements **[DB, tested]**.
- Manual adjustments require a note **[DB]**.
- Low-stock alert: `available ≤ min_stock_level` **[planned, Phase 2]**.
- Inventory valuation = Σ `on_hand × cost_cents` for variants with known cost; the value of stock with unknown cost is reported separately as "not valued" **[planned, Phase 2]**.

## Financial definitions

All figures are computed from records — never entered as totals. For a date range, orders are attributed by the date of the event that matters (`delivered_at` for revenue, `received_on` for cash, `incurred_on` for expenses).

| Metric | Definition |
| --- | --- |
| **Booked order value** | Σ `total_cents` of orders created in the range, excluding cancelled. A demand signal, **not revenue**. |
| **Delivered revenue** | Σ (`subtotal − discount + shipping_fee`) of orders delivered in the range. |
| **Refunds** | Σ `refund_amount_cents` of returns refunded in the range. |
| **Net revenue** | Delivered revenue − refunds. |
| **COGS** | Σ `quantity × unit_cost_cents` of delivered lines, minus the cost of returned units inspected as `resellable` (they are back in stock). Lines with unknown cost are excluded and counted in a "cost missing" indicator. |
| **Shipping cost** | Σ `shipments.shipping_cost_cents` for shipments that left in the range (delivered **and** refused — refusals still cost shipping) + Σ `return_shipping_fee_cents`. |
| **Operating expenses** | Σ `expenses` in P&L categories: `packaging`, `shipping` (not tied to a shipment), `advertising`, `salaries`, `rent`, `software`, `other`. |
| **Net profit** | Net revenue − COGS − shipping cost − operating expenses. |
| **Cash collected** | Σ `cod_remittances.net_received_cents` received in the range. |
| **COD receivable (outstanding)** | Σ `cod_amount_cents` of orders currently `awaiting_remittance`. A balance, not a range figure. |
| **Cash out** | Σ all expenses (including `inventory_purchase` and `production`) + refunds paid. |
| **Return rate** | (refused + returned orders) ÷ orders that reached `shipped`, in the range. |
| **Cost per delivered order** (marketing) | Advertising spend ÷ delivered orders attributed to the campaign. |

`inventory_purchase` and `production` expenses are cash out but **not** P&L expenses: their cost enters profit through COGS when goods are sold. Counting both would double-count.

These formulas will be implemented as SQL functions (one source for dashboards, exports and the AI assistant) in Phase 2 and tested with fixed fixtures.

## Assumptions (Phase 1)

- Single currency (MAD) per organization.
- Returns cover whole order lines; partial-quantity returns are added in Phase 2 by editing return items before receipt.
- Order lines cannot be edited after creation yet (Phase 2: allowed only before confirmation).

## Carrier scorecard (planned — with shipping, Phase 2)

Carrier choice is decided on the merchant's own measured data, not on carriers' marketing. Per carrier, and per carrier × city, over a chosen period:

| Measure | Definition (from shipments, returns, remittances) |
| --- | --- |
| Delivery rate | delivered ÷ (delivered + returned_to_sender) |
| Time to deliver | median shipped_at → delivered_at |
| COD payout delay | median delivered_at → remittance `received_on` |
| Outstanding COD | Σ COD awaiting remittance, aged |
| Cost per delivered order | (Σ shipping cost + return fees) ÷ delivered |
| Return handling | returns received ÷ refused/returned; damaged on inspection |
| COD discrepancies | remittances rejected for amount mismatch |

Shown as a comparison table with sample sizes; a carrier with fewer than 20 shipments in the period is marked "too few to judge".

## Owner routines (planned — Phase 2b)

Requested by the owner (2026-11-16), from the "numbers and weekly habits" method: a solo merchant runs the business through fixed daily / weekly / monthly / quarterly / yearly routines. Every figure below is computed from records; anything that depends on a choice the app cannot make (such as a religious ruling) is a setting the owner chooses, shown next to the result.

### Additional records

| Record | Purpose |
| --- | --- |
| **Payables** ("ما عليك") | Money owed to suppliers and others: counterparty, amount, due date, paid amount/date. Distinct from expenses (a payable can be paid in parts, later). |
| **Cash accounts** | Cash box and bank accounts with an opening balance and dated movements, so *cash available today* is a real balance, not an estimate. COD remittances, expenses paid, refunds and owner withdrawals post to an account. |
| **Complaints** | Lightweight log before the full support inbox: customer, order, category (size, quality, delay, wrong item, other), resolution. Feeds the "repeated pattern" indicator. |
| **Decision log** | One decision per weekly review: what, why, the metric it should move; reviewed later as worked / did not work. |

### Weekly review page

The nine indicators, this week vs last week, each answering one question:

| Indicator | Question | Definition |
| --- | --- | --- |
| Cash available | How much do I really have today? | Σ cash account balances |
| Receivable | How much do carriers and customers owe me, since when? | COD awaiting remittance, aged (0–7, 8–14, 15+ days since delivery) |
| Payable | How much do I owe, when? | Open payables by due date |
| Inventory value | How much money is in stock? What is dormant? | Σ on_hand × cost; dormant share (see below) |
| Delivered orders | How much did I really sell? | Orders delivered in the week |
| Delivery rate | Improving or worsening? | delivered ÷ (delivered + refused + returned) among orders that reached `shipped` |
| Cost per delivered order | What does each real customer cost me? | advertising spend ÷ delivered orders |
| Contribution margin | What is left after variable costs? | delivered revenue − refunds − COGS − shipping cost − advertising (= net profit before fixed costs) |
| Complaints & returns | Is there a repeated pattern? | counts by reason, product, city, carrier |

Then: an ads review block (spend, delivered orders and cost per delivered order per campaign) and the **decision of the week** field.

### Monthly close

1. Net profit for the month (formulas above), with the unknown-cost indicator.
2. **Fund allocation ("الصناديق")**: the owner sets percentages once (e.g. restock, reserve, owner pay, zakat provision); the app proposes amounts from the month's net profit, the owner confirms, and confirmed allocations are recorded. Owner pay is a withdrawal from a cash account, never taken from restock money.
3. **Dormant stock report**: variants with no outbound movement for 30 / 60 / 90 days, quantity and value at cost.

### Yearly: zakat summary (assistance, not a ruling)

Zakat base on the owner's hawl date (set in the Hijri calendar):

```
zakat base = cash (all cash accounts)
           + inventory held for sale (valuation method chosen by the owner)
           + receivables expected to be collected
           − debts due (open payables due by that date)
zakat      = 2.5 % × zakat base, if base ≥ nisab
nisab      = value of 85 g of gold on the calculation day (gold price entered by the owner, with its date)
```

- Inventory valuation method is a setting: *market (selling) value on the day* (majority view) or *current purchase/wholesale cost*. The default is left unset; the owner chooses.
- Fixed assets (phone, computer, shelves, camera) are excluded.
- Doubtful receivables (e.g. COD aged 60+ days, disputed) are listed separately and excluded by default, with a switch to include them; a note says many scholars pay their zakat when collected.
- The page shows every line of the calculation with its source records, states that it is a calculation aid, and recommends confirming with a scholar. No price feed is assumed: the gold price is entered manually.
- Optional monthly zakat provision through fund allocation.

Also yearly: full evaluation (12-month trend of the nine indicators, best/worst products, decision log outcomes) and goals for next year (target values for chosen indicators, tracked on the weekly page).

## Taxes — draft specification (research 2026-11-16, NOT verified)

Provided by the owner's research. Every value here must be checked against the official text (CGI, law 114.13, DGI/ae.gov.ma, CNSS) or an accountant before it is loaded into the app. Confidence labels are the owner's research labels, downgraded where the source is secondary.

### Design rules (fixed)

- The app models a **merchant**: business figures only. It never asks for or stores the owner's personal situation (employment, salary, other income); combining activities is the owner's matter with their accountant.

- No rate, cap or bracket in code. A **`tax_rules`** table keyed by regime, parameter and **fiscal year** (`valid_from`/`valid_to`), each row with its source URL and the date it was verified. A missing rule shows "not configured", never a guess.
- **Every business form is supported by design**, not only auto-entrepreneurs. Three independent organization settings (each with an effective date, so a business can change form without losing history):
  - `legal_form`: `auto_entrepreneur`, `sole_proprietorship` (entreprise individuelle), `sarl`, `sarlau`, `sa`, `snc`, `other`, `not_registered`.
  - `tax_regime`: `auto_entrepreneur`, `cpu`, `rns` (résultat net simplifié), `rnr` (résultat net réel), `corporate_tax` (IS, companies), `not_set`.
  - `vat_status`: `not_liable`, `liable_monthly`, `liable_quarterly`, `not_set`.
  The valid combinations (e.g. IS only for companies; auto-entrepreneur regime only for the auto-entrepreneur form) are data, checked when the owner saves.
- **Regimes are data, not code paths.** Each regime in `tax_rules` declares its *base* (cashed turnover, invoiced turnover, turnover × coefficient, net profit) and its *method* (flat rate, rate + fixed amount by bracket, progressive brackets, minimum contribution). Adding a regime or a new finance-law year means adding rows, not changing the app.
- The app computes the base from its own records (cashed and invoiced turnover, expenses by category, net profit) and shows which figures each regime uses. Where a regime needs accounting the app does not keep (depreciation, payroll, non-deductible items), it exports the figures and marks the result as needing the accountant.
- The app produces **estimates and reminders**, never a filing.

### Regime 1 — auto-entrepreneur (the starting point)

| Rule | Value | Status |
| --- | --- | --- |
| Tax | cashed turnover × 0.5 % (commerce) / 1 % (services); liberatory (final tax on this income) | [مرجَّح] — consistent across sources; verify CGI art. 42 ter / 73 |
| Base | turnover actually **cashed** in the period; no expense deduction | [مرجَّح] |
| Annual caps | 500,000 MAD commerce / 200,000 MAD services | [مرجَّح] |
| Exceeding the cap | regime lost only after **two consecutive years** above it | [مرجَّح] |
| Deregistration risk | no declaration, or zero turnover declared, from the second year | [مرجَّح] |
| Services, single client | part above 80,000 MAD/year from one client: 30 % withholding | [مرجَّح]; not relevant to B2C commerce |
| Declaration and payment | monthly or quarterly, before the end of the following month | [مرجَّح] |
| AMO contribution | unknown | [تخمين] — no value until confirmed with CNSS |
| Excluded activities | include importers/exporters and jewellery traders (wholesale and retail) | [مرجَّح] per DGI guide as reported; the app shows this list as help text when choosing the regime |

Open question for the accountant: for COD, is "cashed" the gross amount paid by the customer or the net remittance after carrier fees? The app reports both.

App behaviour: per-period cashed turnover and estimated tax; progress to the annual cap (warning at 80 %, alert at 100 %, note on the two-year rule); reminder before each declaration deadline; alert when a period with sales has no declaration recorded; alert when sales are recorded while `tax_regime = not_registered` ("register before your first real sales").

### Regime 2 — CPU (after the auto-entrepreneur cap)

- CPU = (turnover × profession coefficient) × 10 % + annual complementary amount. Commerce cap 2,000,000 MAD. [مرجَّح]
- Complementary amount by CPU due (2021 schedule, check for changes): < 500 → 1,200; 500–1,000 → 1,560; 1,001–2,500 → 2,280; 2,501–5,000 → 2,880; 5,001–10,000 → 4,200; > 10,000 → 14,400 MAD. [مرجَّح, possibly outdated]
- E-commerce coefficient: unknown (CGI art. 40 table). [تخمين] Without it the app shows the formula and "coefficient not configured".

### Regime 3 — real regime (RNR)

- Taxed on net profit (revenue − deductible expenses) with the progressive income-tax scale. Scale reported for 2026: 0–40,000: 0 %; 40,001–60,000: 10 %; 60,001–80,000: 20 %; 80,001–100,000: 30 %; 100,001–180,000: 34 %; > 180,000: 37 %. [مرجَّح]; a reform to three brackets with a 30 % top rate was reported as proposed, unverified.
- Out of scope for automatic calculation: it requires full accounting. The app exports the year's revenue, expenses and profit for the accountant.

### Companies — corporate tax (IS) and VAT (to research)

Required for SARL / SARLAU / SA and any business that outgrows the individual regimes. Not yet researched: IS rates and minimum contribution (cotisation minimale), VAT rates and declaration rules, invoicing obligations. Nothing is specified until the official texts are checked. Supporting records the app will need regardless: invoices with sequential numbering, VAT per line (rate, base, amount) when `vat_status` is liable, purchase invoices with deductible VAT.

### Not covered yet

Customs and import duties, local taxes (e.g. professional tax), social contributions (AMO/CNSS). To be researched separately.


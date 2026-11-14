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

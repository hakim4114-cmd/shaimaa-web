# Database schema

Source of truth: `supabase/migrations/` (applied in filename order).

| Migration | Contents |
| --- | --- |
| `20261113000100_core_schema.sql` | enums, tables, indexes, generic triggers, audit, tenant deletion |
| `20261113000200_business_functions.sql` | transactional business operations (RPCs) |
| `20261113000300_security.sql` | grants, Row Level Security policies, tenant/authorship guards |

## Conventions

- Primary keys are `uuid` (`gen_random_uuid()`); append-only ledgers use `bigint identity`.
- **Money is `bigint` minor units** (`*_cents`; 1 MAD = 100). Currency is fixed to MAD by a check constraint on `organizations`.
- Every tenant table has `organization_id … references organizations on delete cascade`, and intra-tenant foreign keys are composite `(id, organization_id)`, `DEFERRABLE` so a tenant deletion can cascade in any order.
- `created_at` / `updated_at` (`timestamptz`, trigger-maintained) on mutable tables.
- Errors raised by functions use UPPER_SNAKE codes (`INSUFFICIENT_STOCK`, `INVALID_TRANSITION`, `FORBIDDEN`, …).

## Entities

### Tenancy
| Table | Purpose |
| --- | --- |
| `organizations` | A business (tenant). Slug, currency (MAD), timezone, order-number prefix. |
| `organization_members` | User ↔ organization with a `member_role`. At least one owner is enforced. |
| `organization_counters` | Gap-tolerant per-tenant sequences (order numbers). Not visible to API roles. |
| `stores` | Sales storefronts of an organization (multi-store). |

### Catalog & inventory
| Table | Purpose |
| --- | --- |
| `product_categories` | Per-tenant categories (case-insensitive unique name). |
| `products` | Product header: name, description, status (`draft/active/archived`), image paths. |
| `product_variants` | Sellable unit: unique SKU per tenant, optional unique barcode, `option_values` (e.g. `{"size":"M","color":"Ivory"}`), `price_cents`, nullable `cost_cents`, `min_stock_level`. |
| `inventory_locations` | Warehouses; exactly one default per tenant. |
| `inventory_levels` | Current stock per variant × location: `on_hand`, `reserved`, `damaged`, `inspection`, generated `available = on_hand − reserved`. Checks: all ≥ 0 and `reserved ≤ on_hand`. |
| `inventory_movements` | Immutable ledger; each row carries the deltas applied to each bucket and a reference (`order` / `return` / `manual`). |

### Customers & orders
| Table | Purpose |
| --- | --- |
| `customers` | CRM record, unique per tenant by E.164 phone (`+212[5-7]XXXXXXXX`). Notes, tags. |
| `orders` | Header: number, status, payment status, stock state, source, campaign, city, money columns with arithmetic checks (`total = subtotal − discount + shipping`, `discount ≤ subtotal`, `cod ≤ total`). |
| `order_contacts` | Name/phone/address snapshot at order time (PII, restricted roles). |
| `order_items` | Line items with product/SKU snapshot, `unit_price_cents`, `unit_cost_cents` snapshot, generated `line_total_cents`. |
| `order_events` | Immutable timeline: created, status changes, notes, shipment, payment, return events with actor. |
| `app.order_transitions` | Allowed status transitions (private schema). |

### Shipping & COD
| Table | Purpose |
| --- | --- |
| `shipping_providers` | Carriers: `manual`, `csv` or `api` (API requires a verified `adapter_key`). No secrets stored. |
| `shipments` | One active shipment per order; tracking number unique per provider; carrier cost, COD amount, attempts, timestamps. |
| `shipment_events` | Immutable carrier status history with data source (`manual/import/api`). |
| `cod_remittances` | Money received from a carrier or courier: gross, fees withheld, net (`net = gross − fees`). |
| `cod_remittance_items` | Orders settled by a remittance (each order at most once). |

### Returns, expenses, marketing, audit
| Table | Purpose |
| --- | --- |
| `returns` | Refusal / return / exchange case per order: status, reason, return shipping fee, refund. One open case per order. |
| `return_items` | Items and their inspected condition (`pending/resellable/damaged/missing`). |
| `expenses` | Operating and capital expenses by category, optional campaign, data source. |
| `marketing_campaigns` | Campaigns per platform with data source (`manual/import/api`). |
| `audit_logs` | Immutable before/after snapshots of changes to members, products, variants, customers, providers, expenses and remittances. |

## Business functions (callable by signed-in users, role-checked inside)

| Function | Effect |
| --- | --- |
| `create_organization(name, slug)` | Creates tenant, makes caller owner, creates default location. |
| `adjust_inventory(variant, location, type, qty, note)` | `receipt`, `adjustment` (note required), `mark_damaged`, `write_off`. |
| `create_order(org, payload)` | Upserts customer by phone, prices items from the catalog, computes totals, allocates order number. |
| `transition_order(order, to, note)` | Validates transition and role; applies stock/payment/return side effects. Cancelling requires a note. |
| `add_order_note(order, note)` | Timeline note. |
| `create_shipment(order, provider, tracking, cost)` | Opens a shipment for a confirmed+ order. |
| `update_shipment_status(shipment, status, note, source)` | Records carrier status; syncs the order (picked up → shipped, delivered → delivered, returned to sender → refused). |
| `record_cod_remittance(org, provider, ref, date, items, note)` | Settles delivered orders; amounts must match exactly. |
| `receive_return(return, fee)` | Moves returned units into `inspection`. |
| `inspect_return_item(item, condition)` | Restock, quarantine as damaged, or write off as missing. |
| `record_refund(return, amount)` / `close_return(return)` | Refund bookkeeping and closing. |

Internal helpers in the private `app` schema (`move_stock`, `apply_order_transition`, `next_counter`, …) are not executable by API roles.

## Row Level Security summary

| Data | Read | Direct write |
| --- | --- | --- |
| Organization, members | members | owner/admin (org), owner (members) |
| Catalog, locations, providers, campaigns, stores | members | owner/admin(/operator for catalog) |
| Inventory levels & movements | members | none — functions only |
| Customers, order contacts | owner, admin, operator, warehouse | owner, admin, operator (customers) |
| Orders, items, events, shipments, returns | members | orders: notes/source/campaign only; rest via functions |
| COD remittances, expenses | owner, admin, finance | expenses: owner, admin, finance |
| Audit log | owner, admin | none |

`anon` has no privileges on any table or function.

## Verification

`npm run db:test` applies all migrations to a fresh database (with a stub of `auth.users`, `auth.uid()` and the Supabase roles, including Supabase's permissive default grants so the revokes are really exercised) and runs:

- `supabase/tests/10_core.test.sql` — tenancy isolation, RLS per role, catalog constraints, inventory operations, order creation and pricing, every workflow path, COD reconciliation, returns inspection, immutability, ledger-equals-levels invariant, tenant deletion;
- `supabase/tests/concurrency.sh` — 8 parallel sessions confirm 8 orders competing for 1 unit; exactly one must succeed.

### Live project

The migrations are applied to the Merchant OS Supabase project (PostgreSQL 17.11, `eu-west-2`) and recorded in `supabase_migrations.schema_migrations`, so `supabase db push` will not re-apply them. Verified there: 25 tables all with RLS, 49 policies, no privileges for `anon` on any table or function, and `supabase/tests/live_smoke.sql` (12 checks with real `auth.uid()`, rolled back so it leaves no data):

```bash
SUPABASE_ACCESS_TOKEN=sbp_… scripts/supabase-sql.sh <project-ref> supabase/tests/live_smoke.sql
```

New migrations: apply with `supabase db push` (Supabase CLI linked to the project) or `scripts/supabase-sql.sh`, then run the live smoke test.

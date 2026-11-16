# Implementation roadmap

## Phase 0 — Repository inspection ✅
Storefront reviewed; decision: Merchant OS is a separate product in `merchant-os/` with its own Supabase project. The storefront and its Google Sheets order flow are untouched.

## Phase 1 — Foundations ✅ (this release)
- Architecture, schema, roles, workflows, financial definitions (see docs).
- Database: migrations, RLS, transactional business functions, database tests and a concurrency test in CI.
- Design system, application shell, i18n (ar/fr/en, RTL), theming.

Not in Phase 1: authentication screens, module pages, data access from the app.

## Phase 2 — MVP
In order, each step shippable:

1. **Auth & organizations** — ✅ sign-in/up, email confirmation by link, onboarding, active organization, user menu (0.2.0). Remaining: members & invitations (needs a server-only Supabase secret key), password reset. Original scope: Supabase Auth (email + password, magic link optional), `@supabase/ssr` session handling in `proxy.ts`, sign-in/up pages, create organization onboarding, members & invitations (owner), rate-limited auth endpoints.
2. **Data layer** — typed server-side queries, Zod schemas for every mutation, mapping of database error codes to translated messages, generated database types.
3. **Products & variants** — list, create/edit, archive, images in a private Storage bucket with signed URLs, size/type validation.
4. **Inventory** — stock overview, receive/adjust/damage/write-off forms, movement history per variant, low-stock list, valuation.
5. **Customers** — list/search, profile with order history and computed totals, notes, tags.
6. **Orders** — list with filters and saved views, create order (duplicate-phone warning), detail page with timeline, status actions allowed by role and workflow, notes.
7. **Shipping (manual)** — carriers, create shipment, status updates, delayed-shipment list (> 48 h in `confirmed`/`preparing`/`ready_to_ship`).
8. **Returns** — receive, inspect, refund, close.
9. **COD & finance** — receivables by carrier, remittance entry with exact-match validation, expenses, reporting SQL functions implementing BUSINESS_RULES formulas, command centre metrics with date range + previous-period comparison.
10. **Notifications** — table + generation (low stock, delayed orders, overdue remittances).
11. **Global search** — orders by number/phone, products by SKU/barcode, customers.

Exit criteria: end-to-end flow (order → confirm → ship → deliver → remit → profit report) works on a real Supabase project; Playwright smoke tests in CI; all figures traceable to records.

## Phase 2b — Owner routines (requested 2026-11-16)
Built right after the Phase 2 MVP because the owner works alone; full rules in BUSINESS_RULES.md → *Owner routines and compliance*.
1. Payables, cash accounts with opening balances, complaints log, decision log (migrations + RLS + tests).
2. Weekly review page (nine indicators vs last week, ads review, decision of the week).
3. Monthly close: net profit, fund allocation with owner-set percentages, dormant stock report.
4. Quarterly tax summary driven by a `tax_rules` data table with sources and verification dates; CSV export. Rules verified against official texts before release.
5. Yearly summary: zakat calculation aid (configurable inventory valuation, manual gold price, doubtful receivables separated), yearly evaluation and goals.

## Phase 3 — Integrations
CSV import/export framework, first verified carrier adapter(s) chosen with the merchant, carrier webhooks, WhatsApp Business (when credentials exist), support inbox, manual/CSV ad spend, optional bridge to receive orders from storefronts (e.g. Maison Shaimaa) through an authenticated endpoint.

## Phase 4 — AI
Read-only tool layer over reporting functions, daily summary, anomaly explanations (returns, delays), replenishment suggestions, reply drafting in Darija/Arabic/French, audit of AI actions.

## Phase 5 — Advanced
Suppliers, purchase orders, production orders and artisan payments, quality control, multi-location transfers, advanced marketing analytics, SaaS capabilities (plans/billing) if needed.

## Known risks
- Reporting formulas are specified but not implemented; they need fixture-based tests before any dashboard uses them.
- Carrier API availability in Morocco is unverified per provider; manual and CSV flows must be good enough on their own.

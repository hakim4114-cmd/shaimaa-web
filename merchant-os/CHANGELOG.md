# Changelog

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

# Changelog

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

### Changed (storefront, tooling only)
- Root `eslint.config.mjs`, `tsconfig.json` and new `vitest.config.mjs` exclude `merchant-os/`. No storefront source file changed.

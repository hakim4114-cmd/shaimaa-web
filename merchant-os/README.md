# Merchant OS

E-commerce operations platform for small and medium cash-on-delivery merchants, starting with Morocco: products, inventory, orders, customers, shipping, COD reconciliation, returns, finance and (later) marketing, support and AI assistance.

Merchant OS is a **separate product** from the Maison Shaimaa storefront that shares this repository. It has its own dependencies, database and deployment; the storefront code is not imported or modified.

## Status

**Phase 1 — foundations (current).** Database schema with business rules enforced in PostgreSQL, the design system, and the application shell. No module screens yet; the dashboard shows a setup checklist instead of numbers. See [docs/IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Radix primitives (shadcn-style components, hand-written) · Lucide · Sonner · Supabase (PostgreSQL, Auth, Storage, RLS) · Vitest. Deploy target: Vercel + Supabase.

## Commands

Run from `merchant-os/`:

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm test           # unit tests (lib/__tests__)
npm run db:test    # migrations + database tests on a disposable PostgreSQL database
npm run build
```

`db:test` needs `psql`/`createdb` and a PostgreSQL 15+ server reachable through `PGHOST`, `PGPORT`, `PGUSER` (and `PGPASSWORD`). It creates and drops its own temporary database and emulates the few Supabase objects the migrations use (`supabase/tests/00_supabase_stub.sql`).

## Setting up a Supabase project

1. Create a Supabase project (region close to Morocco, e.g. `eu-west`).
2. Apply `supabase/migrations/*.sql` in filename order — with the Supabase CLI (`supabase db push`) or by pasting each file into the SQL editor.
3. Copy `.env.example` to `.env.local` and fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the publishable key).
   In Supabase → Auth → URL Configuration, set the Site URL to the app's public URL and add `https://<your-domain>/**` to Redirect URLs, or confirmation links will not work.
4. On Vercel, create a **new project** with *Root Directory* = `merchant-os`.

Never put the service-role key in a `NEXT_PUBLIC_` variable.

## Documentation

| Document | Contents |
| --- | --- |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Structure, layers, security model, design system |
| [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Tables, relationships, functions, RLS |
| [BUSINESS_RULES.md](docs/BUSINESS_RULES.md) | Roles, order/shipment/return workflows, stock and financial formulas |
| [INTEGRATIONS.md](docs/INTEGRATIONS.md) | Shipping adapters, CSV, WhatsApp, marketing, AI — and what is *not* connected |
| [IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md) | Phases, scope, next steps |
| [CHANGELOG.md](CHANGELOG.md) | Changes per phase |

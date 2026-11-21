# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

The only product is **Merchant OS** in `merchant-os/`: an operations platform for cash-on-delivery merchants in Morocco (orders and confirmation calls, stock, Sendit shipping, online store connections, returns, cash, profit, owner pay). The old Maison Shaimaa storefront that used to live at the root was removed on 2026-11-18; do not recreate it.

Deployment: Vercel project with Root Directory `merchant-os` (`merchant-os/vercel.json`: functions in `lhr1`, builds only `main` and only when `merchant-os/` changed). Database: its own Supabase project (`eu-west-2`).

## Commands (run from `merchant-os/`)

```bash
npm run dev        # dev server
npm run lint
npm run typecheck
npm test           # vitest (lib/__tests__)
npm run build
npm run db:test    # migrations + SQL tests against a local PostgreSQL (PG* env vars)
```

CI (`.github/workflows/ci.yml`) runs all of these on pushes to `main` and on PRs.

## Conventions

- TypeScript strict, `.tsx`; Next.js App Router; Tailwind 4.
- Business rules live in PostgreSQL (`merchant-os/supabase/migrations`), as SECURITY DEFINER functions checking roles with `app.require_role`, with RLS on every table, money in bigint cents and immutable ledgers. Read `merchant-os/docs/BUSINESS_RULES.md` and `ARCHITECTURE.md` before changing workflows, stock or money logic, and add a SQL test in `merchant-os/supabase/tests` for every rule.
- Schema changes are hand-written migration files in `merchant-os/supabase/migrations`, verified with `npm run db:test` against local PostgreSQL. Never run DDL or data changes on the hosted Supabase project directly (MCP `execute_sql` / `apply_migration`, `supabase db query`, `supabase db push`), never use `supabase db pull`, and never `supabase link` or `supabase config push` to it, even when a skill says to; read-only queries are fine. A `merchant-os/supabase/config.toml` is only for the throwaway local end-to-end stack (sign-up on, no confirmations) and must never be applied to the hosted project.
- Production changes only through a pull request merged into `main`, which deploys through Vercel's Git integration. The owner has asked Claude to merge its own pull requests (2026-11-21) once every CI check is green (lint, typecheck, unit tests, database tests, build, end-to-end); a pull request that adds a migration, or that needs a change to Vercel or Supabase settings, data or keys, waits for the owner's explicit approval of that specific change before merging. Never deploy, promote, roll back, pause or change environment variables, domains or settings on Vercel (MCP `create_deployment`, `edit_project_env`, `pause_project` and the like, `vercel deploy`, `/vercel:deploy`), and never change data, settings or keys on the hosted Supabase project, without that approval. Read-only inspection (logs, runtime errors, advisors, deployment status) needs no approval. The owner has limited programming experience: before asking for an approval, explain in plain words what it changes and what could go wrong.
- Secrets that the server needs per organization (carrier keys, store webhook secrets) go in service-role-only tables, never in the browser, files or environment variables shared by all organizations.
- Project skills live in `.claude/skills` (pinned in `skills-lock.json`). `ui-styling`, `vercel-cli-with-tokens` and `writing-guidelines` were removed on purpose (no shadcn or Tailwind config here; no Vercel CLI; instructions fetched unpinned from the internet). When a skill points to `ui-styling`, build with the project's own `components/ui` and Tailwind 4 tokens instead.
- User-facing copy goes in all three dictionaries (`lib/i18n/dictionaries/ar.ts`, `fr.ts`, `en.ts`); Arabic is right-to-left.
- Error codes are UPPER_SNAKE strings mapped in `lib/data/errors.ts`; users see translated messages, never the codes.
- Product direction and roadmap: `merchant-os/docs/PRODUCT_STRATEGY.md`. History: `merchant-os/CHANGELOG.md`.

# Architecture

## Placement

Merchant OS lives in `merchant-os/` inside the `shaimaa-web` repository because the current GitHub access covers only that repository. It is fully self-contained:

- own `package.json`, lockfile, `tsconfig.json`, ESLint, Vitest and Next.js config;
- `next.config.ts` pins the Turbopack root to `merchant-os/` so the storefront's files (notably its `proxy.js`) are never resolved;
- the storefront's tooling ignores `merchant-os/`;
- separate Vercel project (Root Directory `merchant-os`) and separate Supabase project.

Moving it to its own repository later is a `git mv` plus CI path changes.

## Layers

```
Browser (React client components)
   │  UI state, forms, optimistic feedback — never trusted
   ▼
Next.js server (server components, server actions, route handlers)   ← Phase 2
   │  validation with Zod, user-scoped Supabase client (anon key + user JWT)
   ▼
PostgreSQL (Supabase)
   ├─ RLS policies          who may read/write which rows
   ├─ SECURITY DEFINER RPCs  every stock/order/COD/return state change, in one transaction
   └─ constraints/triggers  money arithmetic, tenant integrity, immutability, audit
```

Business invariants live in the database, not in the UI or API code, so every client (web app, future imports, webhooks, AI tools) gets the same guarantees. The app layer adds friendly validation and error messages on top.

## Security model

- **Tenancy:** every tenant row has `organization_id`; children reference parents by composite `(id, organization_id)` keys, so cross-tenant references are impossible even with a bug in app code.
- **Authorization:** `app.is_member()` / `app.has_role()` drive RLS. Workflow tables (stock, orders' money and status, shipments, COD, returns) have no direct write grants; only the business functions can change them, and each function checks the caller's role.
- **PII:** customers and `order_contacts` are readable only by owner/admin/operator/warehouse. Finance and viewer roles can analyse orders without seeing names, phones or addresses.
- **Immutability:** inventory movements, order events, shipment events and the audit log reject UPDATE/DELETE (except the cascade of a deliberate tenant deletion via `app.delete_organization`).
- **Keys:** the browser only ever has the anon key; it is useless without a user session because of RLS. The service-role key is server-only and not used in Phase 1.
- **Headers:** `X-Frame-Options: DENY`, `nosniff`, strict referrer policy, restrictive permissions policy, no `X-Powered-By`.

## Authentication

- Supabase Auth, email + password. All auth calls run in server actions (`app/(auth)/actions.ts`) with Zod validation; the browser never talks to Supabase Auth directly.
- `proxy.ts` refreshes the session cookie on every request (`auth.getUser()`, which validates the token with Supabase) and redirects signed-out visitors to `/sign-in`. It is routing only; data access is still decided by RLS.
- Email confirmation: the Supabase email links to `/auth/confirm` on the origin that served the sign-up (or `NEXT_PUBLIC_SITE_URL`). With the PKCE flow the link must be opened in the same browser. Every deployment origin must be on the project's Redirect URLs allow list.
- `lib/auth/session.ts` loads the user and memberships once per request; the active organization is the `mos-org` cookie if it matches a membership, otherwise the first one. Pages under `(app)` require a session and an organization (otherwise `/onboarding`).
- Rate limiting: Supabase Auth's built-in limits apply. Because calls come from the app server, they are counted per server IP; revisit (CAPTCHA or browser-side auth calls) if sign-ups become public at scale.

## Frontend

```
app/
  layout.tsx            fonts, <html lang dir>, providers
  (app)/layout.tsx      application shell
  (app)/page.tsx        command centre
  (app)/design-system/  component reference (development only)
components/
  ui/                   design-system primitives
  shell/                sidebar, top bar, search, menus, providers
lib/
  domain/               workflow definitions shared with the UI
  i18n/                 locale config, dictionaries (ar/fr/en), server + client access
  money.ts, phone.ts    integer-cents money, Moroccan phone normalization
supabase/
  migrations/           schema, business functions, security
  tests/                Supabase stub, SQL tests, concurrency test
```

### Internationalization

The locale is stored in the `mos-locale` cookie (default Arabic) and read on the server, so `<html lang dir>` is correct in the first response — no flash of the wrong direction. Dictionaries are typed: French and Arabic must implement every English key or the build fails. Layout uses logical properties (`ms-*`, `ps-*`, `start-*`, `border-e`) so RTL needs no duplicate styles; directional icons flip with `rtl:rotate-180`. Radix components receive the direction through `Direction.Provider`. Numbers always use Latin digits.

### Design system

- Semantic tokens only (`bg-surface`, `text-muted-foreground`, `bg-accent`, `text-danger` …) defined once in `app/globals.css` for light and dark. Components never use raw colours.
- Neutral slate palette with a single accent (a muted Majorelle blue). Status colours carry meaning only.
- Inter for Latin, IBM Plex Sans Arabic for Arabic; tabular figures for amounts.
- Destructive actions must go through `ConfirmDialog`.
- `Metric` accepts `value={null}` plus a reason: unavailable data is explained, never replaced by a placeholder number.
- Modules not built yet appear disabled in navigation with their roadmap phase — no dead links.

### Theming

`next-themes` toggles the `.dark` class (light / dark / system). The sidebar's collapsed state is a cookie so the server renders the right width.

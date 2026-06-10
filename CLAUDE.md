# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Maison Shaimaa — a Next.js 16 (App Router) storefront for a Moroccan traditional fashion brand selling via cash on delivery (COD) in Morocco. Orders are taken through forms and WhatsApp; there is no payment processing. The README predates the Supabase/admin/tracking work, so trust the code over the README's "no backend, no database" claims.

## Commands

```bash
npm run dev        # start dev server
npm run build      # production build
npm run lint       # eslint . (eslint-config-next core-web-vitals + typescript)
npm run typecheck  # tsc --noEmit
npm test           # vitest run (tests live in lib/__tests__/)
```

CI (`.github/workflows/ci.yml`) runs all four plus `npm run build` on pushes to main and on PRs. Node 20 is required (`.nvmrc` pins 20.19.0; `engines` requires 20.x). Copy `.env.example` to `.env.local` for local config; server-only variables must never get a `NEXT_PUBLIC_` prefix.

## Code conventions

- App code is JavaScript (`.jsx`/`.js`), not TypeScript, even though `tsc --noEmit` runs over it via `allowJs` + `strict`. Only `tailwind.config.ts` is TS. Match this: new components are `.jsx`.
- Import alias `@/*` maps to the repo root (e.g. `@/lib/constants`, `@/components/ui/Button`).
- Styling uses the custom Tailwind palette defined in `tailwind.config.ts` — `ivory`, `pearl`, `sand`, `cedar`, `coffee`, `henna`, `brass`, `olive`, `ink` — plus `font-display`, `font-body`, and `shadow-soft`. Use these tokens, never raw hex values in components.
- Internal error codes are UPPER_SNAKE strings (`MISSING_SCRIPT_URL`, `NETWORK_ERROR`, `WASSILNI_NOT_CONFIGURED`, `ORDER_NOT_FOUND`); user-facing copy comes from the translation files, never from the codes themselves.
- Heavy client components have lazy wrappers (`LazyCODOrderForm`, `LazySizeAdvisor`) to keep mobile JS down on public pages — use the lazy version from pages.

## Architecture

### Order pipeline (the core flow)

There is intentionally a dual-write order pipeline; Google Sheets is primary and must never be blocked by the secondary:

1. `components/forms/CODOrderForm.jsx` (client) validates via `lib/orderValidation.js` (Moroccan phone normalization, suspicious-order risk scoring appended to notes as an internal note), then POSTs directly from the browser to a Google Apps Script web app (`NEXT_PUBLIC_GOOGLE_SCRIPT_URL`) through `lib/googleSheets.js`.
2. On success it fire-and-forgets the same payload to `/api/orders/wassilni`, which forwards to the Wassilni/Base44 system via `lib/integrations/wassilni.js`. This shadow sync silently no-ops when `WASSILNI_*` env vars are unset and swallows all errors — keep it that way until the migration described in `docs/wassilni-integration.md` is approved.
3. The order ID is stashed in `sessionStorage` (`maison-shaimaa-order-id`) for the `/thank-you` page.

Order tracking (`/track-order` → `POST /api/track-order`) proxies server-side to `GOOGLE_TRACKING_SCRIPT_URL` and sanitizes the response through `buildSafeTrackingResponse` in `lib/trackingUtils.js` so only whitelisted fields reach the client.

### Two product sources

- `data/products.js` is the static catalog that drives product pages (`/products/[slug]`), the order form, size data, and the Wassilni fallback.
- Supabase (`lib/supabaseClient.js`, `lib/supabaseProducts.js`) holds a `products` table; rows with `status = "active"` render on the homepage via the `SupabaseProducts` server component. `next.config.mjs` derives the `next/image` remote-pattern allowlist from `NEXT_PUBLIC_SUPABASE_URL`. All Supabase helpers return `{ products, error }` instead of throwing.

### i18n (client-side only, no routing)

`data/translations.js` holds all copy for `en`/`ar`/`fr`; the default is Arabic and the root layout renders `lang="ar" dir="rtl"`. There is no locale routing — the selected language lives in `localStorage` and components subscribe through the `useSelectedLanguage` hook in `components/layout/LanguageSwitcher.jsx` (a `useSyncExternalStore` over a custom window event). Client components must set `dir` and flip alignment/icon order for RTL, as `CODOrderForm` does. New user-facing strings go into all three languages in `data/translations.js`.

### Admin area (double-gated)

- `proxy.js` (Next.js 16's middleware file) protects `/admin/*` and `/api/admin/*` by verifying an HMAC-signed session cookie (`lib/adminSession.js`, signed with `ADMIN_SESSION_SECRET`, 8-hour expiry). Unauthenticated page requests redirect to `/admin/login`; API requests get a 401.
- `app/admin/layout.jsx` additionally 404s the whole section unless running in development or `MAISON_ADMIN_ROUTES_ENABLED=true`, and sets `robots: noindex`.
- Login is a server action (`app/admin/login/actions.js`) checking `ADMIN_PASSWORD`. Admin order data comes from `GOOGLE_ADMIN_ORDERS_SCRIPT_URL` and is filtered to the `safeAdminOrderFields` whitelist in `lib/adminOrders.js` before reaching the client — extend that whitelist rather than passing raw rows.

### Planned migration

`docs/wassilni-integration.md` defines the target state: Wassilni/Base44 becomes the system of record (products, orders, tracking, settings) and `lib/integrations/wassilni.js` already exposes `getProducts`/`getStoreSettings`/`trackOrder` stubs that return local fallbacks. Do not promote Wassilni to primary or remove the Google Sheets flow without explicit instruction. `docs/launch-checklist.md` lists the pre-deploy checks (lint + build + manual page pass).

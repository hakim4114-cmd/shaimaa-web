# Maison Shaimaa

A Next.js storefront for a premium Moroccan traditional fashion brand. Customers order via cash on delivery (COD) in Morocco or through WhatsApp; there is no online payment.

## What is included

- Homepage with brand story, FAQ, size guide, and a live "New arrivals" section from Supabase
- Admin product manager: add/edit/hide/delete products and upload photos from `/admin/products` (see `docs/product-manager-setup.md`)
- Product listing and product detail pages (static catalog)
- COD order form with Moroccan phone validation and risk scoring
- Order saving to Google Sheets through a Google Apps Script Web App
- Shadow order sync to Wassilni/Base44 (optional, never blocks the primary flow)
- Order tracking page backed by a server-side tracking endpoint
- Password-protected admin area (orders, analytics, settings) behind a feature flag
- Trilingual interface: Arabic (default, RTL), French, English — switched client-side
- Mobile-first Tailwind CSS design with a custom Moroccan palette
- Sticky WhatsApp ordering button
- Europe pre-order interest page

## What is not included

- No online payment processing
- No customer accounts or authentication for shoppers
- No direct Google Sheets API usage (orders go through an Apps Script Web App)

## Requirements

- Node.js 20 (see `.nvmrc`)

## Run the website

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal.

Other commands:

```bash
npm run build      # production build
npm run lint       # ESLint
npm run typecheck  # TypeScript check (tsc --noEmit)
npm test           # Vitest test suite
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in what you need. Public variables (browser-visible):

```text
NEXT_PUBLIC_GOOGLE_SCRIPT_URL    # Google Apps Script Web App URL for COD order saving
NEXT_PUBLIC_SITE_URL             # production URL (sitemap, robots.txt, social previews)
NEXT_PUBLIC_SUPABASE_URL         # Supabase project URL (homepage products)
NEXT_PUBLIC_SUPABASE_ANON_KEY    # Supabase anon key
```

Server-only variables (never prefix with `NEXT_PUBLIC_`):

```text
SUPABASE_SERVICE_ROLE_KEY        # Supabase service_role key for the admin product manager
GOOGLE_TRACKING_SCRIPT_URL       # Apps Script endpoint for order tracking
GOOGLE_ADMIN_ORDERS_SCRIPT_URL   # Apps Script endpoint for the admin orders view
MAISON_ADMIN_ROUTES_ENABLED      # "true" to enable /admin in production
ADMIN_PASSWORD                   # admin login password
ADMIN_SESSION_SECRET             # secret for signing the admin session cookie
WASSILNI_API_BASE_URL            # optional Wassilni/Base44 shadow sync
WASSILNI_API_KEY                 # optional Wassilni/Base44 shadow sync
WASSILNI_WEBHOOK_SECRET          # optional Wassilni/Base44 shadow sync
```

The site runs without any of these set: the order form shows an error message, the Supabase section shows a configuration notice, the admin area returns 404 in production, and the Wassilni sync silently skips.

## Main folders

- `app/` — Next.js App Router pages, admin pages, and API routes.
- `components/layout/` — shared layout components, language switcher.
- `components/home/` — homepage sections, including the Supabase products section.
- `components/products/` — product display, gallery, size advisor.
- `components/forms/` — COD order form and Europe pre-order form.
- `components/admin/` — admin dashboard components.
- `components/ui/` — small reusable UI pieces.
- `data/products.js` — static product catalog and size data.
- `data/translations.js` — all interface copy in Arabic, French, and English.
- `data/faqs.js` — FAQ content.
- `lib/` — order validation, Google Sheets/Supabase clients, admin session helpers, Wassilni integration.
- `docs/` — Apps Script setup, Wassilni migration plan, and launch checklist.

## Documentation

- `docs/google-sheets-apps-script.md` — how to set up the Google Sheet and Apps Script for order saving.
- `docs/wassilni-integration.md` — the planned migration to Wassilni/Base44 as the system of record.
- `docs/product-manager-setup.md` — one-time setup to manage products and photos from the admin.
- `docs/launch-checklist.md` — checks to run before a public deployment.
- `CLAUDE.md` — architecture and convention guidance for AI coding assistants.

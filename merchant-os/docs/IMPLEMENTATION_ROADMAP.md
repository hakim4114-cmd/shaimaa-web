# Implementation roadmap

Revised 2026-11-16 after a critical review with the owner: the plan had grown faster than the business. The order below follows a solo COD merchant's real day (orders in → confirmation calls → preparation → shipping → cash) and defers everything that is not needed in the first year of selling.

## Done

- **Phase 0 — Repository inspection.** Merchant OS is a separate product in `merchant-os/` with its own Supabase project.
- **Phase 1 — Foundations (0.1.0).** Schema, RLS, transactional business functions, database tests in CI, design system, shell, ar/fr/en with RTL.
- **Phase 2.1 — Authentication and organizations (0.2.0).** Sign-in/up, email confirmation by link, onboarding, active organization. Deployed on Vercel; migrations applied to the live Supabase project.

## Step 1 — Missing essentials (0.3.0, in progress)

| Item | Owner of the work |
| --- | --- |
| Password recovery (forgot / reset) | app ✅ 0.3.0 |
| App error page | app ✅ 0.3.0 |
| Moroccan cities reference + shipping fee per city and carrier | database ✅ 0.3.0 (UI in step 3) |
| Confirmation call attempts, call-back time, customer blocklist, order editing before confirmation | database ✅ 0.3.0 (UI in step 3) |
| Custom email sending (SMTP provider, e.g. Resend/Brevo) — needed for invitations and reliable password emails | **owner**: create the account; then configure in Supabase → Auth → SMTP |
| Backups: Supabase free projects pause when inactive and have no automatic backups; plan a paid plan or a scheduled export before real orders | **owner** decision |
| Close public sign-up; revoke the shared management token | **owner** (Supabase dashboard) |
| Rename the organization and the Vercel project | owner / later settings page |

## Step 2 — Products and stock

Products and variants (images in a private bucket), receive / adjust / damage, movement history, low-stock list, valuation. Built to the approved design (ARCHITECTURE.md → Approved screen direction).

## Step 3 — Orders as they work in Morocco

1. **Fast order entry on a phone**: phone → known customer's history (delivered / refused), product, size, city (from the reference list), shipping fee filled from the city.
2. **Confirmation workflow**: call attempts with outcome (answered, no answer, busy, wrong number, asked to call back, cancelled), call-back time, notes; orders to call today.
3. **Risk and blocklist**: refusal history per phone, blocked numbers warn (or stop) at entry.
4. **Edit before confirmation**: change items, sizes, discount, shipping fee, city and address while `new` / `confirmation_pending`.
5. **WhatsApp templates in one tap**: confirmation, delay, refusal follow-up in Darija/Arabic/French, opening WhatsApp with a prefilled message (`wa.me`), no WhatsApp API needed.
6. **Order intake from outside**: CSV import; authenticated endpoint so a storefront (e.g. Maison Shaimaa) can push orders.

7. **Exports and printing** (first use of the shared export framework): orders list to Excel/CSV/print, in Arabic, French or English. Details: INTEGRATIONS.md → *Exports, printing and Google Sheets*.

## Step 4 — Today view (new home page)

"What do I do today?": calls to make (and call-backs due), packages to prepare, shipments without news for 48 h, remittances overdue, low stock. The metric dashboard moves to its own page.

## Step 5 — Shipping, returns, cash

Manual + CSV shipping with any carrier, printable delivery slips and daily packing list, returns with partial quantities and exchanges, COD remittances, expenses, reporting functions (BUSINESS_RULES.md formulas) with fixture tests, the metric dashboard.

## Step 6 — Owner routines

Weekly review with the decision log, monthly close (net profit, fund allocation, owner pay, dormant stock), payables and cash accounts, complaints log. Details: BUSINESS_RULES.md → *Owner routines*.

Reports from steps 5–6 (dashboard, weekly review, monthly close) get Excel/PDF/print, and the Google Sheets live link (level 2).

## Step 7 — Claude connection and carrier choice

1. **Merchant OS inside Claude first** (MCP server, read-only tools under the merchant's own session): uses the owner's Claude plan, no in-app chat to build.
2. Carrier scorecard from the merchant's own shipments.
3. In-app assistant (Anthropic API) only if step 7.1 is not enough.

## Later — after there are real sales

- Zakat calculation aid (spec ready).
- Tax assistant: auto-entrepreneur first, after the rules are verified (draft spec in BUSINESS_RULES.md).
- Carrier API adapters, only for carriers actually used and with a verified API.
- Members and invitations (needs custom SMTP and a server-only secret key).
- Move Merchant OS to its own repository.

## Deferred or removed

| Item | Decision |
| --- | --- |
| SaaS plans and billing for other merchants | **Removed**. The schema stays multi-organization; nothing more is built for SaaS. |
| Production, purchasing, artisans | Deferred: only if the business manufactures. |
| Support inbox on the WhatsApp Business API | Deferred: WhatsApp Business app + one-tap templates first. |
| Meta / TikTok ads API connections | Deferred: ad spend entered manually. |
| CPU, real regime, company taxes (IS, VAT) | Deferred until the business needs them. |
| International carriers | Deferred until selling abroad. |

## Known risks

- No order has gone through the app yet: the signed-in flow and every module after it are unproven with real use.
- The signed-in flow has no automated end-to-end test yet.
- Reporting formulas are specified but not implemented; they need fixture-based tests before any dashboard uses them.
- Carrier API availability in Morocco is unverified per provider; manual and CSV flows must be good enough on their own.

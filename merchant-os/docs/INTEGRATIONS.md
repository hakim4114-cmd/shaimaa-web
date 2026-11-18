# Integrations

**Current state (Phase 1): no external integration is connected.** This document defines the architecture and the rules for adding them. Nothing in the app claims a connection that does not exist.

## Principles

1. Never invent API endpoints, payloads or credentials. An integration is built only from the provider's official documentation and tested against real credentials supplied by the merchant.
2. Every externally sourced record carries its origin (`data_source`: `manual`, `import`, `api`) so reports can separate entered, imported and API data.
3. Integrations call the same database functions as the UI (`update_shipment_status`, `record_cod_remittance`, …). They never write tables directly, so every business rule still applies.
4. Secrets live in server-side environment variables or Supabase Vault, never in table rows readable by API roles, never in the browser.
5. Inbound webhooks are verified (signature or shared secret), idempotent (provider event id stored), and rate-limited.

## Shipping

Moroccan carriers differ widely: some have documented APIs, many work by spreadsheet or a web portal only. No carrier API is assumed to exist until its documentation and test credentials are in hand. Candidates to research once the merchant has chosen carriers (selection order = the merchant's actual carriers, not popularity). Domestic COD specialists named in the owner's market research (2026-11-16; their claims about coverage, payout speed and return handling are the carriers' own marketing, unverified): Ozon Express, Cathedis, Ameex, Sendit, Forcelog, Truship, Quick Livraison, Atlas Livraison, Morino Express, Big Delivery; also Amana and CTM Messagerie. For each: is there a documented public API or webhook for third-party systems (a Shopify/YouCan plugin is not enough — Merchant OS needs the API itself), test credentials, status vocabulary, COD statement format.

International carriers (DHL Express, Aramex, FedEx, UPS) matter only for cross-border sales or imports: out of scope until the business sells abroad. Every carrier, with or without an API, is usable through the manual and CSV levels. Three levels are supported per provider (`shipping_providers.kind`):

| Level | How it works | Status |
| --- | --- | --- |
| `manual` | Staff create shipments and update statuses in the UI. | Schema + functions ready; UI Phase 2 |
| `csv` | Export shipments for the carrier; import status/COD files back with a column-mapping step and a dry-run preview. | Phase 3 |
| `api` | Code adapter (below), selected by `adapter_key`. Allowed only once verified against the provider's docs and test credentials. | Phase 3, per provider |

### Adapter interface (planned, `lib/shipping/adapters`)

```ts
interface ShippingAdapter {
  key: string;                                   // matches shipping_providers.adapter_key
  createShipment(input: ShipmentRequest): Promise<{ trackingNumber: string; labelUrl?: string }>;
  getStatus(trackingNumber: string): Promise<CarrierStatus[]>;   // mapped to shipment_status
  parseWebhook?(request: Request): Promise<CarrierStatus[]>;     // verified, idempotent
  parseRemittance?(file: Uint8Array): Promise<RemittanceLine[]>; // COD statements
}
```

Carrier-specific statuses are mapped to `shipment_status`; unmapped statuses are kept in the event note and flagged, never guessed.

### Sendit (first carrier adapter, 0.6.0)

Chosen by the owner on 2026-11-17 (account with API access). Sources: the Sendit OpenAPI file (`https://app.sendit.ma/docs/api-docs.json`, behind Cloudflare, so it has to be downloaded from a browser) and `guide-webhook-sendit.pdf`.

- **Auth**: `POST /api/v1/login` with `public_key` + `secret_key` returns a bearer token. Its lifetime is not documented, so it is cached for 45 min and renewed on 401. The rate limit is 1000 requests/hour.
- **Keys** (1.6.0): each organization uses its own Sendit account. An owner or admin pastes the public and secret keys in Settings → Sendit; they are checked with `POST /login` first, then stored by `set_sendit_credentials` in `provider_secrets`, a table only the service role can read (members see only `shipping_providers.credentials_set`). The server reads them per call (`lib/shipping/sendit-keys.ts`) after the user's role was checked; they are never sent to the browser. Tokens are cached per account. Before 1.6.0 the keys were the `SENDIT_PUBLIC_KEY` / `SENDIT_SECRET_KEY` environment variables, shared by every organization; those variables are no longer read and should be deleted from Vercel.
- **Parcel**: `POST /deliveries` takes `district_id` (Sendit's own city/neighbourhood id, chosen in the app from `GET /districts`), `pickup_district_id`, name, phone (`06…`), address, `amount` (COD, MAD), comment, `reference` = our order number, `allow_open`, `allow_try`, and `products_from_stock = 0`. If our database refuses the shipment afterwards, the parcel is deleted at Sendit, so no orphan parcels are left.
- **Labels**: `POST /deliveries/getlabels` returns a signed PDF URL (10×10 thermal or A4). It is opened directly and never stored.
- **Pickup**: `POST /pickups` with every parcel still `PENDING`, using the pickup details from Settings (owner's choice: Kénitra).
- **Webhook**: `POST /api/webhooks/sendit/{providerId}`.
  - Signature: `X-Sendit-Signature` is an HMAC-SHA256 of the raw body, using the API key chosen for the webhook. The guide does not say which key or which encoding, so that organization's secret and public keys (looked up from the provider id in the URL) are tried in hex and base64 with constant-time comparison. Confirm and narrow this after the first real event.
  - Valid events go to `apply_carrier_event` (service role only). It is idempotent per tracking code, status and `lastActionAt`, and every event is logged in `carrier_events`.
  - The server needs `SUPABASE_SERVICE_ROLE_KEY` for this route only.
- **Status mapping** (`lib/shipping/sendit-core.ts`):

  | Sendit status | Our status |
  | --- | --- |
  | PENDING, TO_PREPARE, TO_PICKUP, NEW_DESTINATION | unchanged (details only) |
  | PICKEDUP | picked_up: order shipped, stock out |
  | WAREHOUSE, TRANSIT, DISTRIBUTED | in_transit |
  | DELIVERING | out_for_delivery |
  | UNREACHABLE | failed_attempt |
  | POSTPONED, SCHEDULED | unchanged (details only) |
  | DELIVERED | delivered: order delivered, awaiting remittance |
  | REJECTED | returned_to_sender: order refused, return awaiting receipt |
  | CANCELED | cancelled |

- **Fallback**: «Update status» on the order calls `GET /deliveries/{code}`.
- **Not yet**: payout reconciliation from `GET /invoices` (next step); exchanges (`option_exchange`); Sendit-held stock.

## Exports, printing and Google Sheets (requested 2026-11-16)

Every list and report gets the same three actions; reports are produced in **Arabic, French or English**, chosen per export (independent of the interface language, which also stays trilingual — decision 2026-11-16).

| Output | How | Why this way |
| --- | --- | --- |
| **Excel (.xlsx)** | Generated on the server from the same query as the screen; real numbers and dates (not text), MAD format, frozen header, right-to-left sheet for Arabic. | Opens in Excel, Google Sheets, Numbers; totals and filters work. |
| **CSV** | Same data, UTF-8 with BOM so Excel shows Arabic correctly. | For imports into other tools. |
| **PDF / print** | Print-optimised pages (A4, business name, period, generation time, page numbers) printed or saved as PDF from the browser. | The browser shapes Arabic text and right-to-left layout correctly; server-side PDF generation with Arabic fonts is fragile. A server PDF is added only if a document must be produced without a person (e.g. emailed automatically). |

Printable documents planned: **delivery slip per order** (customer, phone, city, address, items, COD amount, order number as barcode/QR), **daily packing list**, daily summary, weekly review, monthly close, zakat summary.

**Google Sheets**, in three levels:
1. **Now-level:** import the Excel/CSV export into Google Sheets (File → Import). Works from the first export, no setup.
2. **Live link:** the owner creates a read-only, revocable link for one report; Google Sheets pulls it with `=IMPORTDATA("…")` and refreshes it periodically. No Google account connection needed. Customer phone numbers and addresses are excluded from these links by default.
3. **Full connection** (only if levels 1–2 are not enough): Google Sheets API with the owner's Google account (OAuth). Needs a Google Cloud project and consent screen; writes reports into a chosen spreadsheet automatically.

## Online stores (1.5.0)

A merchant connects a store in **Settings → Online stores**. Each connection has its own webhook address, `/api/webhooks/store/{storeId}`, and a signing secret stored in `store_secrets`, which only the server (service role) can read. The route checks the signature, turns the platform payload into one normalized order (`lib/integrations/stores.ts`), then calls `ingest_store_order`. Every delivery is kept in `external_orders`: imported, waiting for the merchant (`needs_attention` with a reason), or dismissed. Business rules: `docs/BUSINESS_RULES.md` → Store orders.

| Platform | How the merchant connects | Signature | Topic |
| --- | --- | --- | --- |
| Shopify | Admin → Settings → Notifications → Webhooks → *Order creation*, JSON. The merchant pastes the key Shopify shows ("Your webhooks will be signed with…"). | `X-Shopify-Hmac-Sha256`, base64 HMAC-SHA256 of the raw body | `X-Shopify-Topic: orders/create` (others are acknowledged and ignored) |
| WooCommerce | WooCommerce → Settings → Advanced → Webhooks → *Order created*, API v3. We generate the secret. The unsigned `webhook_id=…` ping sent on save is answered 200. | `X-WC-Webhook-Signature`, base64 | `X-WC-Webhook-Topic: order.created` |
| Custom site | POST JSON (below). We generate the secret. | `X-Merchant-Signature`, hex (base64 also accepted) | — |
| YouCan | **Not available yet.** YouCan delivers order webhooks only to a registered YouCan app (OAuth client, Partner account); the signature (`X-YOUCAN-SIGNATURE`, hex HMAC-SHA256) uses that app's client secret, and the `order.created` payload is trimmed, so items and address must be fetched with the API (`docs.youcan.shop/store-admin/resthooks/overview`). Needs a partner app, an OAuth install flow and per-store tokens. | | |

Mapping notes: Shopify lines use `price` (before discounts) and `total_discounts`; shipping from `total_shipping_price_set`, else the sum of `shipping_lines`; `financial_status = paid` means nothing to collect. WooCommerce lines use `subtotal / quantity` and `discount_total`; an order is prepaid only when it is not `cod` and has `date_paid`. Phone numbers are converted to E.164 when they are Moroccan; otherwise kept as typed and flagged `invalid_phone`.

Custom site format (amounts in MAD, decimals allowed):

```json
{
  "id": "A-1001", "number": "1001", "currency": "MAD", "paid": false,
  "customer": { "name": "Salma B", "phone": "0611223344", "city": "Kénitra", "address": "Hay Saknia, rue 5" },
  "items": [{ "sku": "WAL-BLK", "title": "Wallet", "quantity": 1, "price": 149 }],
  "shipping": 35, "discount": 0, "note": "after 6pm"
}
```

Responses: 200 when handled (including "already imported" and "needs attention": the store must not retry those), 401 bad signature, 400 malformed order, 404 unknown store, 500 temporary error (the store retries).

## CSV import/export (Phase 3)

Orders, products/stock and carrier statements. Every import: upload → column mapping → validation report → dry run → apply in one transaction → import log with row-level errors.

## WhatsApp (Phase 3)

Implemented without an API (1.5.0): prefilled `wa.me` messages from the order page (confirm, no answer, confirmed, shipped with tracking number, delivery reminder, cancelled; Darija, Arabic, French) and "paste the customer's message" on the new-order form (`lib/orders/paste.ts`: phone, city, name, address, always reviewed before saving). Sending automatically requires the official WhatsApp Business Platform (Cloud API), after the merchant has a verified business number and approved message templates. Until then the app offers `wa.me` click-to-chat links, which are clearly labelled as opening WhatsApp on the user's device, not as an integration. Support conversations (`support_conversations`, `support_messages`) are added with this phase.

## Marketing (Phase 3–5)

Meta (Facebook/Instagram) Ads and TikTok Ads spend imports require the merchant's own app/token and the platforms' reporting APIs. Until connected, spend is entered manually or imported by CSV as `expenses` with `category = advertising` and a `campaign_id`. Attribution uses only what is recorded on the order (`source`, `campaign_id`); no modelled or inferred attribution.

## Claude connector (1.1.0)

The owner creates a link in Settings and adds it to Claude as a custom connector (Settings → Connectors). The link is `/api/mcp/<secret>`.
- **Storage:** the server keeps only the SHA-256 hash of the link.
- **Who it acts as:** `public.assistant_call` checks the hash and switches to the creator's identity for the transaction. The creator's owner/admin role is required on every call.
- **What it returns:** read-only, without customer contact data. Tools: `today`, `business_summary`, `orders`, `order`, `stock`, `campaigns`, `cash`.
- **Plan:** custom connectors depend on the user's Claude plan.

## AI assistant (Phase 4)

**Decision (2026-11-16): Claude is the AI provider.** The owner considers the Claude connection essential. Two complementary paths:

1. **Claude inside Merchant OS** — server-side calls to the Anthropic API (`@anthropic-ai/sdk`, default model `claude-opus-5-5`), API key in a server-only environment variable, usage billed per token to the merchant's Anthropic account. Powers the in-app assistant: daily summary, questions about the business, reply drafts in Darija/Arabic/French.
2. **Merchant OS inside Claude** — an MCP server exposing read-only business tools (sales, COD receivable, stock, delayed orders, weekly indicators), authorised with the merchant's own Merchant OS session, so the merchant can ask Claude (claude.ai / Claude app) about their store. No business data leaves Merchant OS except the answers to the tool calls the merchant triggers.

Both paths use the same reporting functions and the same rules below.

- Provider-independent service layer on the server; API keys in server environment variables.
- The model never receives raw database access. It calls a fixed set of read tools (the Phase 2 reporting functions) executed with the **user's own session**, so RLS limits what it can see.
- Answers must cite the figures returned by tools; missing data (e.g. unknown costs) is stated, not estimated.
- Write actions (e.g. drafting a status change) require explicit user confirmation in the UI and are recorded in the audit log.

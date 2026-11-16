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

## CSV import/export (Phase 3)

Orders, products/stock and carrier statements. Every import: upload → column mapping → validation report → dry run → apply in one transaction → import log with row-level errors.

## WhatsApp (Phase 3)

Through the official WhatsApp Business Platform (Cloud API) only, after the merchant has a verified business number and approved message templates. Until then the app may offer `wa.me` click-to-chat links, which are clearly labelled as opening WhatsApp on the user's device, not as an integration. Support conversations (`support_conversations`, `support_messages`) are added with this phase.

## Marketing (Phase 3–5)

Meta (Facebook/Instagram) Ads and TikTok Ads spend imports require the merchant's own app/token and the platforms' reporting APIs. Until connected, spend is entered manually or imported by CSV as `expenses` with `category = advertising` and a `campaign_id`. Attribution uses only what is recorded on the order (`source`, `campaign_id`); no modelled or inferred attribution.

## AI assistant (Phase 4)

**Decision (2026-11-16): Claude is the AI provider.** The owner considers the Claude connection essential. Two complementary paths:

1. **Claude inside Merchant OS** — server-side calls to the Anthropic API (`@anthropic-ai/sdk`, default model `claude-opus-5-5`), API key in a server-only environment variable, usage billed per token to the merchant's Anthropic account. Powers the in-app assistant: daily summary, questions about the business, reply drafts in Darija/Arabic/French.
2. **Merchant OS inside Claude** — an MCP server exposing read-only business tools (sales, COD receivable, stock, delayed orders, weekly indicators), authorised with the merchant's own Merchant OS session, so the merchant can ask Claude (claude.ai / Claude app) about their store. No business data leaves Merchant OS except the answers to the tool calls the merchant triggers.

Both paths use the same reporting functions and the same rules below.

- Provider-independent service layer on the server; API keys in server environment variables.
- The model never receives raw database access. It calls a fixed set of read tools (the Phase 2 reporting functions) executed with the **user's own session**, so RLS limits what it can see.
- Answers must cite the figures returned by tools; missing data (e.g. unknown costs) is stated, not estimated.
- Write actions (e.g. drafting a status change) require explicit user confirmation in the UI and are recorded in the audit log.

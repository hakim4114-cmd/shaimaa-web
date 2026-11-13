# Integrations

**Current state (Phase 1): no external integration is connected.** This document defines the architecture and the rules for adding them. Nothing in the app claims a connection that does not exist.

## Principles

1. Never invent API endpoints, payloads or credentials. An integration is built only from the provider's official documentation and tested against real credentials supplied by the merchant.
2. Every externally sourced record carries its origin (`data_source`: `manual`, `import`, `api`) so reports can separate entered, imported and API data.
3. Integrations call the same database functions as the UI (`update_shipment_status`, `record_cod_remittance`, …). They never write tables directly, so every business rule still applies.
4. Secrets live in server-side environment variables or Supabase Vault, never in table rows readable by API roles, never in the browser.
5. Inbound webhooks are verified (signature or shared secret), idempotent (provider event id stored), and rate-limited.

## Shipping

Moroccan carriers differ widely: some have documented APIs, many work by spreadsheet or a web portal only. Three levels are supported per provider (`shipping_providers.kind`):

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

## CSV import/export (Phase 3)

Orders, products/stock and carrier statements. Every import: upload → column mapping → validation report → dry run → apply in one transaction → import log with row-level errors.

## WhatsApp (Phase 3)

Through the official WhatsApp Business Platform (Cloud API) only, after the merchant has a verified business number and approved message templates. Until then the app may offer `wa.me` click-to-chat links, which are clearly labelled as opening WhatsApp on the user's device, not as an integration. Support conversations (`support_conversations`, `support_messages`) are added with this phase.

## Marketing (Phase 3–5)

Meta (Facebook/Instagram) Ads and TikTok Ads spend imports require the merchant's own app/token and the platforms' reporting APIs. Until connected, spend is entered manually or imported by CSV as `expenses` with `category = advertising` and a `campaign_id`. Attribution uses only what is recorded on the order (`source`, `campaign_id`); no modelled or inferred attribution.

## AI assistant (Phase 4)

- Provider-independent service layer on the server; API keys in server environment variables.
- The model never receives raw database access. It calls a fixed set of read tools (the Phase 2 reporting functions) executed with the **user's own session**, so RLS limits what it can see.
- Answers must cite the figures returned by tools; missing data (e.g. unknown costs) is stated, not estimated.
- Write actions (e.g. drafting a status change) require explicit user confirmation in the UI and are recorded in the audit log.

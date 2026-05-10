# Wassilni/Base44 Integration Architecture

Maison Shaimaa is moving toward a split architecture:

- Wassilni/Base44 is the business system of record.
- Maison Shaimaa is the public storefront and COD order input channel.

This document prepares the integration without changing the current Google Sheets COD flow.

## Source Of Truth Decision

Wassilni/Base44 should own business data:

- Products
- Product media
- Prices
- Colors and sizes
- Inventory/availability
- COD orders
- Order status
- Delivery status
- Store settings
- Branding/media configuration if supported

The Maison Shaimaa website should not duplicate operational management that belongs in Wassilni/Base44.

## Website Role

Maison Shaimaa should:

- Render customer-facing product and brand pages.
- Read published product/store output data from Wassilni/Base44.
- Submit new COD order input to Wassilni/Base44.
- Show order tracking status returned by Wassilni/Base44.
- Keep a local/static fallback while integration is unavailable.
- Keep the current Google Sheets flow until the migration is validated.

## Wassilni/Base44 Role

Wassilni/Base44 should:

- Store product and order records.
- Manage product edits, media, stock, and pricing.
- Manage COD order operations and statuses.
- Expose secure server-to-server API endpoints.
- Return only fields the storefront needs.
- Provide stable product slugs that match existing Maison Shaimaa routes.

## Required API Endpoints

The exact endpoint paths can change based on Wassilni/Base44 capabilities, but the website needs these operations:

```text
GET  /store/settings
GET  /products
GET  /products/:slug
POST /orders
POST /orders/track
```

Optional future admin-monitor endpoints:

```text
GET /admin/orders
GET /admin/integration/status
```

## Current Secondary Order Receiver

The storefront now supports a secondary Wassilni/Base44 order sync while keeping Google Sheets as the primary COD order receiver.

Current flow:

```text
Customer submits COD form
-> Browser submits the stable COD payload to Google Apps Script
-> Google Sheets accepts the order
-> If Google Sheets returns `orderId` or `order_id`, that ID is added as `orderId` for Wassilni reconciliation
-> Browser calls /api/orders/wassilni with the same finalized order payload
-> /api/orders/wassilni validates the order server-side
-> Server calls Wassilni/Base44 POST /orders with server-only credentials
-> Customer is redirected to /thank-you even if the secondary Wassilni sync is unavailable
```

The browser must never call Wassilni/Base44 directly. It calls only Maison Shaimaa routes.

Maison Shaimaa route:

```text
POST /api/orders/wassilni
```

Request body:

```json
{
  "order": {
    "fullName": "Customer Name",
    "phoneNumber": "06XXXXXXXX",
    "city": "Casablanca",
    "fullAddress": "Delivery address",
    "productSlug": "amina-ivory-djellaba",
    "productName": "Amina Ivory Djellaba",
    "price": "890 MAD",
    "color": "Ivory",
    "size": "M",
    "quantity": 1,
    "notes": "Optional customer notes",
    "paymentMethod": "Cash on Delivery",
    "orderStatus": "New",
    "source": "website",
    "orderId": "MS-20260510-120000"
  }
}
```

`orderId` is included only when Google Apps Script returns one after the primary Google Sheets submission succeeds. If Google Apps Script does not return an order ID yet, Wassilni/Base44 still receives the order without it. For reliable reconciliation, Apps Script should return either `orderId` or `order_id` in the successful response.

Before forwarding to Wassilni/Base44, `/api/orders/wassilni` keeps only the expected order fields and optional `orderId`. Extra browser-supplied fields are dropped.

The route returns only safe integration status:

```json
{
  "success": true,
  "accepted": true,
  "receiver": "wassilni",
  "orderId": "WS-123"
}
```

If Wassilni/Base44 is unavailable or not configured, the route does not fail the customer order because Google Sheets has already accepted it:

```json
{
  "success": false,
  "accepted": true,
  "receiver": "wassilni",
  "warning": "WASSILNI_NOT_CONFIGURED"
}
```

If someone bypasses the website form and sends invalid order details to the secondary route:

```json
{
  "success": false,
  "accepted": false,
  "warning": "INVALID_ORDER_DETAILS"
}
```

Wassilni/Base44 server endpoint used by the adapter:

```text
POST {WASSILNI_API_BASE_URL}/orders
```

Headers sent server-side:

```text
Authorization: Bearer {WASSILNI_API_KEY}
Content-Type: application/json
Accept: application/json
X-Wassilni-Webhook-Secret: {WASSILNI_WEBHOOK_SECRET}
```

`X-Wassilni-Webhook-Secret` is sent only when `WASSILNI_WEBHOOK_SECRET` is configured.

The adapter uses a short timeout so Wassilni/Base44 downtime cannot block a customer order that was already saved in Google Sheets.
The current timeout is 3 seconds. Sync failures are logged server-side as safe status codes only; logs must not include API keys, URLs, webhook secrets, full addresses, or raw customer order payloads.

## Server-Only Environment Variables

These must stay server-only and must not use `NEXT_PUBLIC_`:

```text
WASSILNI_API_BASE_URL=
WASSILNI_API_KEY=
WASSILNI_WEBHOOK_SECRET=
```

The browser should call Maison Shaimaa API routes, never Wassilni/Base44 directly when secrets are required.

## Environment Handling

The project supports local development and production with the same variable names. Use `.env.local` for local development and the hosting provider's environment variable panel for production.

Public browser variable:

```text
NEXT_PUBLIC_GOOGLE_SCRIPT_URL=
```

This is the current primary Google Sheets Apps Script URL used by the browser-side COD form. It remains public because the existing Google Sheets COD flow depends on it.

Server-only variables:

```text
GOOGLE_TRACKING_SCRIPT_URL=
GOOGLE_ADMIN_ORDERS_SCRIPT_URL=
MAISON_ADMIN_ROUTES_ENABLED=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
WASSILNI_API_BASE_URL=
WASSILNI_API_KEY=
WASSILNI_WEBHOOK_SECRET=
```

Rules:

- Never rename Wassilni secrets to `NEXT_PUBLIC_`.
- Never read Wassilni secrets inside client components.
- Keep Google Sheets as the primary COD receiver until the shadow sync is validated.
- Missing Wassilni variables must not break local development.
- Missing Wassilni variables should only make `/api/orders/wassilni` return a safe secondary-sync warning after Google Sheets has already accepted the order.

## Local Testing Checklist

Use this checklist while the website is local or running on a private server:

1. Create `.env.local` from `.env.example`.
2. Set `NEXT_PUBLIC_GOOGLE_SCRIPT_URL` to the current Google Apps Script COD endpoint.
3. Leave `WASSILNI_API_BASE_URL`, `WASSILNI_API_KEY`, and `WASSILNI_WEBHOOK_SECRET` empty to confirm local development still works without Wassilni.
4. Start the site with `npm run dev`.
5. Submit a COD test order from a product page.
6. Confirm the order is appended to Google Sheets.
7. Confirm the customer reaches `/thank-you`.
8. Confirm no Wassilni secret is visible in the browser network requests or client bundle.
9. Add test Wassilni credentials only when the real endpoint is available.
10. Submit another test order and confirm Wassilni receives the secondary copy only after Google Sheets accepts the order.
11. Temporarily break the Wassilni URL and confirm the customer still reaches `/thank-you` after Google Sheets success.

Expected local behavior:

- Product pages use local product data.
- Google Sheets remains the primary COD receiver.
- Wassilni/Base44 is secondary shadow sync only.
- If Wassilni variables are missing, orders still work through Google Sheets.

## Production Deployment Checklist

Before real customer traffic:

1. Deploy the site to the production hosting environment.
2. Configure `NEXT_PUBLIC_GOOGLE_SCRIPT_URL` for the production Apps Script COD endpoint.
3. Configure `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`.
4. Set `MAISON_ADMIN_ROUTES_ENABLED=true` only when admin routes should be reachable.
5. Configure `GOOGLE_TRACKING_SCRIPT_URL` if order tracking is enabled.
6. Configure `GOOGLE_ADMIN_ORDERS_SCRIPT_URL` if read-only admin order monitoring is enabled.
7. Add `WASSILNI_API_BASE_URL` and `WASSILNI_API_KEY` only after Wassilni/Base44 provides the real API details.
8. Add `WASSILNI_WEBHOOK_SECRET` only if the Wassilni/Base44 endpoint requires it.
9. Submit one real-format test order and verify it appears in Google Sheets first.
10. Verify Wassilni receives the secondary copy with the same finalized payload and optional `orderId`.
11. Disable or rotate test credentials before public launch.
12. Confirm no server-only variables appear in browser network responses, source maps, or client-side environment output.

Production launch rule:

Google Sheets remains the primary COD flow until Wassilni/Base44 shadow-sync reliability is proven with real endpoint responses, reconciliation by `orderId`, and operational review inside Wassilni/Base44.

## Product Object Shape

Wassilni/Base44 should provide published storefront products in this shape:

```json
{
  "slug": "amina-ivory-djellaba",
  "name": "Amina Ivory Djellaba",
  "price": "890 MAD",
  "tag": "Limited pieces",
  "color": "Ivory silk blend",
  "description": "A soft ivory djellaba with refined Moroccan elegance.",
  "offer": "Includes personal size help before delivery",
  "valueCopy": "Designed for women who want a refined Moroccan piece.",
  "fabric": "Ivory silk blend with a smooth drape.",
  "craftsmanship": ["Clean neckline finish", "Gold-tone Moroccan trim"],
  "sizes": ["S", "M", "L"],
  "colors": ["Ivory", "Gold"],
  "image": "/images/amina-ivory.png",
  "gallery": [],
  "hasFinalImage": true,
  "status": "published",
  "updatedAt": "2026-05-10T12:00:00.000Z"
}
```

Required rules:

- `slug` must stay stable.
- Slugs must not be translated.
- Product visibility should be controlled in Wassilni/Base44 with a published/draft status.
- The storefront should ignore unpublished products unless explicitly requested by an admin-only route.

## Order Object Shape

Maison Shaimaa currently submits these fields and they must remain stable during migration:

```json
{
  "fullName": "Customer Name",
  "phoneNumber": "06XXXXXXXX",
  "city": "Casablanca",
  "fullAddress": "Delivery address",
  "productSlug": "amina-ivory-djellaba",
  "productName": "Amina Ivory Djellaba",
  "price": "890 MAD",
  "color": "Ivory",
  "size": "M",
  "quantity": 1,
  "notes": "Optional customer notes",
  "paymentMethod": "Cash on Delivery",
  "orderStatus": "New",
  "source": "website"
}
```

Wassilni/Base44 should respond with:

```json
{
  "success": true,
  "orderId": "MS-20260510-120000"
}
```

If rejected:

```json
{
  "success": false,
  "message": "Invalid order details"
}
```

## Order Tracking Response Shape

Tracking should require both order ID and phone number.

Request:

```json
{
  "orderId": "MS-20260510-120000",
  "phoneNumber": "06XXXXXXXX"
}
```

Safe response:

```json
{
  "found": true,
  "orderStatus": "Confirmed",
  "deliveryStatus": "Preparing",
  "lastUpdated": "2026-05-10T12:00:00.000Z",
  "message": ""
}
```

Not found:

```json
{
  "found": false,
  "message": "ORDER_NOT_FOUND"
}
```

Never return private customer details from tracking.

## Security Rules

- Keep `WASSILNI_API_KEY` server-only.
- Never expose Wassilni/Base44 URLs or keys in client bundles.
- Public pages should use server routes or static fallback data.
- Admin monitor routes must require the admin session.
- Keep `/admin` noindexed.
- Validate COD orders both on the website and in Wassilni/Base44.
- Track orders only when order ID and phone number match.
- Do not return full sheet/app/database internals to the browser.

## Migration Plan From Google Sheets

1. Keep the current Google Sheets submission flow live.
2. Use `/api/orders/wassilni` as a shadow-mode secondary receiver after Google Sheets accepts an order.
3. Confirm Wassilni/Base44 API endpoint URLs, authentication method, and required headers.
4. Test `submitOrder(order)` against `POST {WASSILNI_API_BASE_URL}/orders`.
5. Compare Wassilni/Base44 order results against Google Sheets.
6. Test `getProducts()` with local fallback enabled.
7. Switch COD submission from Google Sheets to Wassilni/Base44 only after live tests pass.
8. Keep Google Sheets as temporary backup/export during the transition.
9. Remove or archive Google Sheets admin reads after Wassilni/Base44 becomes reliable.

## Fallback Strategy

If Wassilni/Base44 is unavailable:

- Product pages should use local `data/products.js`.
- Store settings should use `data/adminStoreConfig.js`.
- COD orders should continue through the current Google Sheets flow until migration is complete.
- Order tracking should keep the current tracking endpoint until Wassilni/Base44 tracking is connected.
- Admin should show integration status and fallback labels instead of pretending Wassilni/Base44 is live.

## Information Needed From Wassilni/Base44

Before live connection:

- Base API URL.
- Authentication method and API key format.
- Product list endpoint and product-by-slug endpoint.
- COD order create endpoint.
- Order tracking endpoint.
- Rate limits.
- Error response shape.
- Required headers.
- Webhook support and signing secret, if webhooks are available.
- Whether product slugs can be guaranteed stable.
- Whether media URLs are absolute and CDN-backed.

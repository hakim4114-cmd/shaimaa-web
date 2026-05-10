# Maison Shaimaa Launch Checklist

Use this checklist before the first public deployment. Do not paste real secrets into this document.

## Local Pre-Launch Checks

1. Confirm the project root contains `.env.local`.
2. Confirm `.env.local` is not inside `docs/` or any other folder.
3. Confirm `NEXT_PUBLIC_GOOGLE_SCRIPT_URL` points to the current Google Apps Script COD endpoint.
4. Leave Wassilni/Base44 variables empty if the real API is not ready.
5. Run:

```bash
npm run lint
npm run build
```

6. Start local development:

```bash
npm run dev
```

7. Test these public pages on mobile and desktop:

```text
/
/products
/products/amina-ivory-djellaba
/products/zahra-coffee-djellaba
/products/noor-olive-set
/size-guide
/track-order
/thank-you
```

8. Switch EN / AR / FR and confirm Arabic is RTL while phone/order inputs remain readable LTR.
9. Check there is no horizontal scroll on mobile.
10. Confirm the floating WhatsApp button is hidden on mobile and does not cover forms on desktop.

## Required Production Environment Variables

Public browser variable:

```text
NEXT_PUBLIC_GOOGLE_SCRIPT_URL=
```

Server-only variables:

```text
GOOGLE_TRACKING_SCRIPT_URL=
GOOGLE_ADMIN_ORDERS_SCRIPT_URL=
MAISON_ADMIN_ROUTES_ENABLED=true
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
WASSILNI_API_BASE_URL=
WASSILNI_API_KEY=
WASSILNI_WEBHOOK_SECRET=
```

Rules:

- Only `NEXT_PUBLIC_GOOGLE_SCRIPT_URL` should be public.
- Do not use `NEXT_PUBLIC_` for Wassilni/Base44 secrets.
- Use a long random `ADMIN_SESSION_SECRET` in production.
- Rotate the temporary local admin password before public launch.

## Deployment Steps

1. Push the reviewed code to the deployment branch.
2. Add production environment variables in the hosting dashboard.
3. Deploy the project.
4. Open the deployed site in a private/incognito browser.
5. Confirm public pages are indexable.
6. Confirm `/admin` redirects to `/admin/login`.
7. Confirm admin pages are noindexed.
8. Confirm no secret values appear in browser network responses or page source.

## COD Test Order Procedure

1. Use a real-format Moroccan mobile number.
2. Use a realistic name, city, address, color, size, and quantity.
3. Submit from a product detail page first.
4. Confirm the order appears in Google Sheets.
5. Confirm redirect to `/thank-you` happens only after Google Sheets accepts the order.
6. Confirm duplicate clicking does not create multiple browser submissions.
7. If Wassilni/Base44 env vars are configured, confirm the secondary order copy arrives there after Google Sheets success.
8. Break or disable Wassilni/Base44 temporarily and confirm Google Sheets orders still complete.

## Tracking Smoke Test

1. Test empty order ID and phone number validation.
2. Test an unknown order ID with a real-format phone number.
3. Test correct order ID with wrong phone number.
4. Test correct order ID with correct phone number.
5. Confirm no private customer data is shown.

## Post-Deployment Smoke Test

1. Check homepage hero and collection section.
2. Check product cards link to product detail pages.
3. Check all product detail pages render gallery placeholders or images correctly.
4. Check Size Advisor is collapsed by default.
5. Check COD form fields, validation, and submit state.
6. Check `/order` still works as a backup route.
7. Check `/admin/login`, `/admin/logout`, and protected admin pages.
8. Check `/api/admin/orders` returns unauthorized without a valid admin session.

## Rollback Plan

1. Keep the previous deployment available in the hosting provider.
2. If COD submission fails, roll back immediately to the last known working deployment.
3. If only Wassilni/Base44 shadow sync fails, leave the site online and remove/empty Wassilni env vars.
4. If admin access fails, rotate `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`, redeploy, and retest.
5. Keep Google Sheets as the operational source until Wassilni/Base44 is proven reliable.

## Known Limitations

- Google Sheets / Apps Script remains the primary COD receiver.
- Wassilni/Base44 is secondary shadow sync only.
- Product data still comes from local static files.
- There is no payment integration.
- There is no delivery provider API.
- There is no custom database.
- There is no real product image upload/storage provider yet.

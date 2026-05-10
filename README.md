# Moroccan Fashion Platform

This is a frontend-only demo platform for a premium Moroccan traditional fashion brand.

## What is included

- Homepage
- Product listing page
- Product detail page
- Demo COD order page
- Demo thank-you page
- Size guide page
- About page
- Future Europe interest page
- Static demo admin pages
- Reusable React components
- Demo product data
- Mobile-first Tailwind CSS design
- WhatsApp ordering button
- Cash on delivery messaging for Morocco

## What is not included yet

- No backend
- No authentication
- No payment
- No database
- No direct Google Sheets API usage

## Main folders

- `app/` contains the Next.js homepage, layout, and global CSS.
- `components/layout/` contains shared layout components.
- `components/home/` contains homepage sections.
- `components/products/` contains product display components.
- `components/forms/` contains demo frontend forms.
- `components/admin/` contains static admin display components.
- `components/ui/` contains small reusable UI pieces.
- `data/products.js` contains demo products and size guide data.
- `data/faqs.js` contains FAQ content.
- `data/demoOrders.js` contains fake admin order data.
- `lib/` contains small helper files and future placeholders.
- `public/images/` contains demo images.
- `docs/google-sheets-apps-script.md` explains the future Google Apps Script order-saving setup.

## Environment variables

Copy `.env.example` to `.env.local` when you are ready to test Google Apps Script order saving.

```text
NEXT_PUBLIC_GOOGLE_SCRIPT_URL="your Google Apps Script Web App URL"
```

## Run the website

```bash
npm run dev
```

Then open the local URL shown in the terminal.

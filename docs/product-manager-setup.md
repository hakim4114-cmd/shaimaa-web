# Product Manager Setup (one-time, about 10 minutes)

After this setup, you can add products and photos yourself from the admin area at
`/admin/products` — no coding needed, similar to Shopify.

You only need to do this once.

## Step 1 — Run the database setup

1. Open [supabase.com](https://supabase.com) and log in.
2. Open your Maison Shaimaa project.
3. In the left menu, click **SQL Editor**.
4. Click **New query**.
5. Open the file `supabase/setup.sql` from this project, copy ALL of it, and paste it into the editor.
6. Click **Run**. You should see "Success. No rows returned."

This prepares the products table and creates a public folder for product photos.

## Step 2 — Copy the service role key

1. In Supabase, click the **gear icon** (Project Settings) in the left menu.
2. Click **API Keys**.
3. Find the key called **service_role** and copy it.

⚠️ This key is powerful — never share it, never paste it into the website code,
and never put it anywhere public. It only goes into the private settings in Step 3.

## Step 3 — Add the key to Vercel

1. Open [vercel.com](https://vercel.com) and log in.
2. Open the **shaimaa-web** project.
3. Go to **Settings → Environment Variables**.
4. Add a new variable:
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** the service_role key you copied in Step 2.
5. Save, then go to the **Deployments** tab and click **Redeploy** on the latest deployment
   so the new setting takes effect.

## Step 4 — Try it

1. Go to your website's `/admin` page and log in.
2. Click **Products** in the menu.
3. Add a product: name, price, photo. Set status to **Active**.
4. Open your homepage — the product appears in the "New arrivals" section
   with an "Order on WhatsApp" button.

## Everyday use

- **Add a product:** fill the form, upload a photo, press "Add product".
- **Hide a product temporarily:** press "Hide" — it disappears from the website but is not deleted.
- **Put it back:** press "Publish".
- **Change price or photo:** press "Edit", change what you need, press "Save changes".
- **Delete permanently:** press "Delete" (this cannot be undone).

Photos should be JPG, PNG, or WebP and under 5MB. Portrait photos (taller than wide) look best.

-- Maison Shaimaa product manager setup.
-- Paste this whole file into the Supabase SQL Editor and click "Run".
-- It is safe to run more than once.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists name text not null default '';
alter table public.products add column if not exists description text not null default '';
alter table public.products add column if not exists price numeric;
alter table public.products add column if not exists compare_at_price numeric;
alter table public.products add column if not exists stock integer;
alter table public.products add column if not exists main_image_url text not null default '';
alter table public.products add column if not exists status text not null default 'draft';

-- Visitors may only read active products. The admin uses the service role
-- key on the server, which bypasses these rules.
alter table public.products enable row level security;

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
  on public.products for select
  using (status = 'active');

-- Public storage bucket for product photos.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

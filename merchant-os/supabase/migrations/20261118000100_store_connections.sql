-- Merchant OS — online store connections (1.5.0)
--
-- A merchant connects an online store (Shopify, WooCommerce, a custom site)
-- in Settings. The store sends each new order to a webhook URL that carries
-- the store id; the request is signed with a secret only the server can read.
-- Every delivery lands in an inbox (external_orders) first:
--   * imported         an order was created (status "new", goes through calls)
--   * needs_attention  something must be fixed first (unknown SKU, bad phone,
--                      blocked customer, other currency…); retry after fixing
--   * ignored          dismissed by the merchant
-- A store order is never confirmed automatically, and the same store order
-- is never imported twice.

create type public.store_platform as enum ('custom', 'shopify', 'woocommerce', 'youcan');

alter table public.stores
  add column platform public.store_platform not null default 'custom',
  add column last_order_at timestamptz;

-- Webhook signing secrets: readable only by the server (service_role).
create table public.store_secrets (
  store_id uuid primary key references public.stores (id) on delete cascade,
  secret text not null check (char_length(secret) between 16 and 200),
  updated_at timestamptz not null default now()
);
revoke all on public.store_secrets from anon, authenticated;
alter table public.store_secrets enable row level security;

alter table public.orders add column external_id text check (external_id is null or char_length(external_id) between 1 and 120);
create unique index orders_store_external_uq on public.orders (store_id, external_id) where external_id is not null;

create table public.external_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  external_id text not null check (char_length(external_id) between 1 and 120),
  external_number text not null default '' check (char_length(external_number) <= 60),
  status text not null check (status in ('imported', 'needs_attention', 'ignored')),
  reason text check (reason is null or reason in (
    'unknown_sku', 'invalid_phone', 'customer_blocked', 'currency', 'no_items', 'no_location', 'store_inactive', 'invalid_order')),
  reason_detail text not null default '' check (char_length(reason_detail) <= 500),
  payload jsonb not null,
  order_id uuid references public.orders (id) on delete set null,
  attempts integer not null default 1,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, external_id)
);
create index external_orders_attention_idx on public.external_orders (organization_id, received_at desc) where status = 'needs_attention';


revoke all on public.external_orders from anon, authenticated;
grant select on public.external_orders to authenticated;
alter table public.external_orders enable row level security;
create policy external_orders_select on public.external_orders for select to authenticated
  using (app.has_role(organization_id, '{owner,admin,operator}'));

grant update (platform) on public.stores to authenticated;

-- ---------------------------------------------------------------------------
-- City match on free text (store checkouts send a typed city name).
-- ---------------------------------------------------------------------------
create function app.match_city(p_organization_id uuid, p_name text) returns integer
language sql stable security definer set search_path = '' as $$
  select c.id from public.cities c
  where (c.organization_id is null or c.organization_id = p_organization_id)
    and c.is_active
    and nullif(btrim(p_name), '') is not null
    and (lower(c.name_fr) = lower(btrim(p_name)) or c.name_ar = btrim(p_name) or lower(btrim(p_name)) = any (c.aliases))
  order by c.organization_id nulls last
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Store connections: created by owner/admin; the secret goes to store_secrets.
-- ---------------------------------------------------------------------------
create function public.create_store_connection(p_organization_id uuid, p_name text, p_platform public.store_platform, p_url text, p_secret text)
returns public.stores
language plpgsql security definer set search_path = '' as $$
declare
  v_store public.stores;
begin
  perform app.require_role(p_organization_id, array['owner', 'admin']::public.member_role[]);
  if char_length(btrim(coalesce(p_secret, ''))) < 16 then
    raise exception 'SECRET_TOO_SHORT' using errcode = 'P0001';
  end if;
  if (select count(*) from public.stores s where s.organization_id = p_organization_id) >= 20 then
    raise exception 'TOO_MANY_STORES' using errcode = 'P0001';
  end if;
  insert into public.stores (organization_id, name, url, platform)
  values (p_organization_id, btrim(p_name), nullif(btrim(coalesce(p_url, '')), ''), p_platform)
  returning * into v_store;
  insert into public.store_secrets (store_id, secret) values (v_store.id, btrim(p_secret));
  return v_store;
end;
$$;

create function public.set_store_secret(p_store_id uuid, p_secret text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.stores where id = p_store_id;
  if v_org is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  perform app.require_role(v_org, array['owner', 'admin']::public.member_role[]);
  if char_length(btrim(coalesce(p_secret, ''))) < 16 then
    raise exception 'SECRET_TOO_SHORT' using errcode = 'P0001';
  end if;
  insert into public.store_secrets (store_id, secret) values (p_store_id, btrim(p_secret))
  on conflict (store_id) do update set secret = excluded.secret, updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- Import core. p_order is the normalized order built by the server:
-- {
--   "external_id": "…", "number": "#1001", "currency": "MAD", "paid": false,
--   "customer": {"full_name": "…", "phone": "+2126…", "city": "…", "address": "…"},
--   "items": [{"sku": "…", "title": "…", "quantity": 1, "unit_price_cents": 14900}],
--   "shipping_cents": 3500, "discount_cents": 0, "note": "…"
-- }
-- ---------------------------------------------------------------------------
create function app.import_store_order(p_store public.stores, p_order jsonb) returns public.external_orders
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := p_store.organization_id;
  v_external_id text := btrim(coalesce(p_order ->> 'external_id', ''));
  v_customer jsonb := coalesce(p_order -> 'customer', '{}'::jsonb);
  v_phone text := btrim(coalesce(v_customer ->> 'phone', ''));
  v_row public.external_orders;
  v_reason text;
  v_detail text := '';
  v_missing text;
  v_item jsonb;
  v_variant record;
  v_qty integer;
  v_price bigint;
  v_city_id integer;
  v_city_name text;
  v_location uuid;
  v_customer_id uuid;
  v_order public.orders;
  v_subtotal bigint := 0;
  v_discount bigint := greatest(coalesce((p_order ->> 'discount_cents')::bigint, 0), 0);
  v_shipping bigint := greatest(coalesce((p_order ->> 'shipping_cents')::bigint, 0), 0);
  v_total bigint;
begin
  if v_external_id = '' then
    raise exception 'EXTERNAL_ID_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_row from public.external_orders where store_id = p_store.id and external_id = v_external_id for update;
  if found and v_row.status in ('imported', 'ignored') then
    return v_row; -- duplicate delivery or dismissed: nothing to do
  end if;

  -- Checks, cheapest first. The first problem found is reported.
  if not p_store.is_active then
    v_reason := 'store_inactive';
  elsif upper(coalesce(p_order ->> 'currency', 'MAD')) <> 'MAD' then
    v_reason := 'currency'; v_detail := upper(p_order ->> 'currency');
  elsif jsonb_typeof(p_order -> 'items') is distinct from 'array' or jsonb_array_length(p_order -> 'items') = 0 then
    v_reason := 'no_items';
  elsif jsonb_array_length(p_order -> 'items') > 50 then
    v_reason := 'invalid_order'; v_detail := 'too many items';
  elsif v_phone !~ '^\+212[5-7][0-9]{8}$' then
    v_reason := 'invalid_phone'; v_detail := left(v_phone, 40);
  elsif exists (select 1 from public.customer_blocklist b where b.organization_id = v_org and b.phone = v_phone) then
    v_reason := 'customer_blocked';
  else
    select string_agg(coalesce(nullif(btrim(i ->> 'sku'), ''), '(' || coalesce(i ->> 'title', '?') || ')'), ', ') into v_missing
    from jsonb_array_elements(p_order -> 'items') i
    where not exists (
      select 1 from public.product_variants v join public.products p on p.id = v.product_id
      where v.organization_id = v_org and lower(v.sku) = lower(btrim(coalesce(i ->> 'sku', '')))
        and v.status = 'active' and p.status = 'active');
    if v_missing is not null then
      v_reason := 'unknown_sku'; v_detail := left(v_missing, 500);
    end if;
  end if;

  if v_reason is null then
    v_location := (select l.id from public.inventory_locations l where l.organization_id = v_org and l.is_default);
    if v_location is null then
      v_reason := 'no_location';
    end if;
  end if;

  if v_reason is null then
    v_city_id := app.match_city(v_org, v_customer ->> 'city');
    v_city_name := coalesce((select c.name_fr from public.cities c where c.id = v_city_id), left(btrim(coalesce(v_customer ->> 'city', '')), 80));

    insert into public.customers as c (organization_id, full_name, phone, city, address)
    values (v_org, left(btrim(coalesce(v_customer ->> 'full_name', '')), 160), v_phone, v_city_name, left(btrim(coalesce(v_customer ->> 'address', '')), 500))
    on conflict (organization_id, phone) do update
      set full_name = case when excluded.full_name <> '' then excluded.full_name else c.full_name end,
          city = case when excluded.city <> '' then excluded.city else c.city end,
          address = case when excluded.address <> '' then excluded.address else c.address end
    returning id into v_customer_id;

    insert into public.orders (organization_id, store_id, external_id, order_number, customer_id, location_id, source, city, city_id, notes, internal_notes)
    values (
      v_org, p_store.id, v_external_id,
      (select o.order_prefix from public.organizations o where o.id = v_org) || '-' || lpad(app.next_counter(v_org, 'order_number')::text, 6, '0'),
      v_customer_id, v_location, 'website', v_city_name, v_city_id,
      left(coalesce(p_order ->> 'note', ''), 1000),
      left(p_store.name || ' ' || coalesce(nullif(p_order ->> 'number', ''), v_external_id), 500)
    ) returning * into v_order;

    insert into public.order_contacts (order_id, organization_id, full_name, phone, address)
    select v_order.id, v_org, c.full_name, c.phone, c.address from public.customers c where c.id = v_customer_id;

    -- Lines keep the price the customer saw in the store.
    for v_item in select * from jsonb_array_elements(p_order -> 'items') loop
      v_qty := greatest(coalesce((v_item ->> 'quantity')::integer, 1), 1);
      select v.id, v.sku, v.title, v.price_cents, v.cost_cents, p.name as product_name into v_variant
      from public.product_variants v join public.products p on p.id = v.product_id
      where v.organization_id = v_org and lower(v.sku) = lower(btrim(v_item ->> 'sku'));
      v_price := coalesce((v_item ->> 'unit_price_cents')::bigint, v_variant.price_cents);
      if v_price < 0 then v_price := v_variant.price_cents; end if;
      insert into public.order_items (organization_id, order_id, variant_id, product_name, variant_title, sku, quantity, unit_price_cents, unit_cost_cents)
      values (v_org, v_order.id, v_variant.id, v_variant.product_name, v_variant.title, v_variant.sku, v_qty, v_price, v_variant.cost_cents);
      v_subtotal := v_subtotal + v_qty * v_price;
    end loop;

    v_discount := least(v_discount, v_subtotal);
    v_total := v_subtotal - v_discount + v_shipping;
    update public.orders
    set subtotal_cents = v_subtotal, discount_cents = v_discount, shipping_fee_cents = v_shipping, total_cents = v_total,
        cod_amount_cents = case when coalesce((p_order ->> 'paid')::boolean, false) then 0 else v_total end
    where id = v_order.id
    returning * into v_order;

    perform app.add_order_event(v_order, 'created', null, 'new', 'store: ' || p_store.name);
    update public.stores set last_order_at = now() where id = p_store.id;
  end if;

  insert into public.external_orders as e (organization_id, store_id, external_id, external_number, status, reason, reason_detail, payload, order_id)
  values (v_org, p_store.id, v_external_id, left(coalesce(p_order ->> 'number', ''), 60),
          case when v_reason is null then 'imported' else 'needs_attention' end, v_reason, v_detail, p_order, v_order.id)
  on conflict (store_id, external_id) do update
    set status = excluded.status, reason = excluded.reason, reason_detail = excluded.reason_detail,
        payload = excluded.payload, order_id = excluded.order_id, attempts = e.attempts + 1, updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;

-- Called by the webhook route (service_role) after the signature check.
create function public.ingest_store_order(p_store_id uuid, p_order jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_store public.stores;
  v_row public.external_orders;
begin
  select * into v_store from public.stores where id = p_store_id for update;
  if not found then
    raise exception 'STORE_NOT_FOUND' using errcode = 'P0002';
  end if;
  v_row := app.import_store_order(v_store, p_order);
  return jsonb_build_object('status', v_row.status, 'reason', v_row.reason, 'order_id', v_row.order_id);
end;
$$;

-- Retry after fixing the cause (adding the SKU, unblocking…), or dismiss.
create function public.retry_store_order(p_external_order_id uuid) returns public.external_orders
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.external_orders;
  v_store public.stores;
begin
  select * into v_row from public.external_orders where id = p_external_order_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  perform app.require_role(v_row.organization_id, array['owner', 'admin', 'operator']::public.member_role[]);
  if v_row.status <> 'needs_attention' then
    raise exception 'NOT_RETRYABLE' using errcode = 'P0001';
  end if;
  select * into v_store from public.stores where id = v_row.store_id for update;
  return app.import_store_order(v_store, v_row.payload);
end;
$$;

create function public.ignore_store_order(p_external_order_id uuid) returns public.external_orders
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.external_orders;
begin
  select * into v_row from public.external_orders where id = p_external_order_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  perform app.require_role(v_row.organization_id, array['owner', 'admin', 'operator']::public.member_role[]);
  if v_row.status <> 'needs_attention' then
    raise exception 'NOT_RETRYABLE' using errcode = 'P0001';
  end if;
  update public.external_orders set status = 'ignored', updated_at = now() where id = v_row.id returning * into v_row;
  return v_row;
end;
$$;

revoke execute on function app.match_city(uuid, text), app.import_store_order(public.stores, jsonb) from public, anon, authenticated;
revoke execute on function public.ingest_store_order(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.ingest_store_order(uuid, jsonb) to service_role;
revoke execute on function public.create_store_connection(uuid, text, public.store_platform, text, text), public.set_store_secret(uuid, text),
  public.retry_store_order(uuid), public.ignore_store_order(uuid) from public, anon;
grant execute on function public.create_store_connection(uuid, text, public.store_platform, text, text), public.set_store_secret(uuid, text),
  public.retry_store_order(uuid), public.ignore_store_order(uuid) to authenticated;

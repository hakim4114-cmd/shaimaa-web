-- Merchant OS — one code path for the parts every new order shares (1.10.0)
-- Manual orders (create_order) and store orders (import_store_order) now use
-- the same helpers for the customer record and the order number, so their
-- rules cannot drift apart.
--
-- Fixes: a store order without a usable customer name (empty, one letter, or
-- longer than 120 characters) failed the customers name check, so the webhook
-- answered 500 and the store retried forever. The name is now trimmed to 120
-- characters and, when unusable, replaced by "Client" + the last 4 digits.

create function app.next_order_number(p_organization_id uuid) returns text
language sql security definer set search_path = '' as $$
  select (select o.order_prefix from public.organizations o where o.id = p_organization_id)
         || '-' || lpad(app.next_counter(p_organization_id, 'order_number')::text, 6, '0');
$$;

-- p_name_wins: true for orders typed by the merchant (the name typed replaces
-- the stored one); false for store orders (an empty name keeps the stored one).
create function app.upsert_order_customer(p_organization_id uuid, p_full_name text, p_phone text, p_city text, p_address text, p_name_wins boolean)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := left(btrim(coalesce(p_full_name, '')), 120);
  v_id uuid;
begin
  if char_length(v_name) < 2 then
    if p_name_wins then
      v_name := btrim(coalesce(p_full_name, '')); -- let the check report CUSTOMER_NAME_REQUIRED as before
    else
      v_name := 'Client ' || right(p_phone, 4);
    end if;
  end if;
  insert into public.customers as c (organization_id, full_name, phone, city, address)
  values (p_organization_id, v_name, p_phone, left(btrim(coalesce(p_city, '')), 80), left(btrim(coalesce(p_address, '')), 500))
  on conflict (organization_id, phone) do update
    set full_name = case when p_name_wins or c.full_name like 'Client %' then excluded.full_name else c.full_name end,
        city = case when excluded.city <> '' then excluded.city else c.city end,
        address = case when excluded.address <> '' then excluded.address else c.address end
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function app.next_order_number(uuid), app.upsert_order_customer(uuid, text, text, text, text, boolean) from public, anon, authenticated;

create or replace function public.create_order(p_organization_id uuid, p_payload jsonb) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_customer jsonb := coalesce(p_payload -> 'customer', '{}'::jsonb);
  v_phone text := btrim(coalesce(v_customer ->> 'phone', ''));
  v_city public.cities;
  v_city_name text;
  v_customer_id uuid;
  v_location_id uuid;
  v_order public.orders;
  v_subtotal bigint;
  v_discount bigint := coalesce((p_payload ->> 'discount_cents')::bigint, 0);
  v_shipping bigint;
  v_total bigint;
  v_cod bigint;
begin
  perform app.require_role(p_organization_id, array['owner', 'admin', 'operator']::public.member_role[]);

  -- Validate the cheap things before writing anything.
  if jsonb_typeof(p_payload -> 'items') is distinct from 'array' or jsonb_array_length(p_payload -> 'items') = 0 then
    raise exception 'ORDER_ITEMS_REQUIRED' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.customer_blocklist b where b.organization_id = p_organization_id and b.phone = v_phone) then
    if not (coalesce((p_payload ->> 'allow_blocked')::boolean, false)
            and app.has_role(p_organization_id, array['owner', 'admin']::public.member_role[])) then
      raise exception 'CUSTOMER_BLOCKED' using errcode = 'P0001';
    end if;
  end if;

  v_city := app.resolve_city(p_organization_id, (p_payload ->> 'city_id')::integer);
  v_city_name := coalesce(v_city.name_fr, btrim(coalesce(v_customer ->> 'city', '')));
  v_shipping := coalesce((p_payload ->> 'shipping_fee_cents')::bigint, app.default_shipping_fee(p_organization_id, v_city.id), 0);

  v_location_id := coalesce(
    (p_payload ->> 'location_id')::uuid,
    (select l.id from public.inventory_locations l where l.organization_id = p_organization_id and l.is_default)
  );
  if v_location_id is null then
    raise exception 'LOCATION_REQUIRED' using errcode = 'P0001';
  end if;

  v_customer_id := app.upsert_order_customer(p_organization_id, v_customer ->> 'full_name', v_phone, v_city_name, v_customer ->> 'address', true);

  insert into public.orders (
    organization_id, store_id, order_number, customer_id, location_id, source, campaign_id,
    city, city_id, notes, internal_notes, created_by
  ) values (
    p_organization_id,
    (p_payload ->> 'store_id')::uuid,
    app.next_order_number(p_organization_id),
    v_customer_id, v_location_id,
    coalesce((p_payload ->> 'source')::public.order_source, 'other'),
    (p_payload ->> 'campaign_id')::uuid,
    v_city_name, v_city.id,
    coalesce(p_payload ->> 'notes', ''),
    coalesce(p_payload ->> 'internal_notes', ''),
    auth.uid()
  ) returning * into v_order;

  insert into public.order_contacts (order_id, organization_id, full_name, phone, address)
  select v_order.id, p_organization_id, c.full_name, c.phone, c.address from public.customers c where c.id = v_customer_id;

  v_subtotal := app.write_order_items(v_order, p_payload -> 'items');

  if v_discount < 0 or v_discount > v_subtotal then
    raise exception 'INVALID_DISCOUNT' using errcode = 'P0001';
  end if;
  if v_shipping < 0 then
    raise exception 'INVALID_SHIPPING_FEE' using errcode = 'P0001';
  end if;
  v_total := v_subtotal - v_discount + v_shipping;
  v_cod := coalesce((p_payload ->> 'cod_amount_cents')::bigint, v_total);
  if v_cod < 0 or v_cod > v_total then
    raise exception 'INVALID_COD_AMOUNT' using errcode = 'P0001';
  end if;

  update public.orders
  set subtotal_cents = v_subtotal, discount_cents = v_discount, shipping_fee_cents = v_shipping,
      total_cents = v_total, cod_amount_cents = v_cod
  where id = v_order.id
  returning * into v_order;

  perform app.add_order_event(v_order, 'created', null, 'new', null);
  return v_order;
end;
$$;

create or replace function app.import_store_order(p_store public.stores, p_order jsonb) returns public.external_orders
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

    v_customer_id := app.upsert_order_customer(v_org, v_customer ->> 'full_name', v_phone, v_city_name, v_customer ->> 'address', false);

    insert into public.orders (organization_id, store_id, external_id, order_number, customer_id, location_id, source, city, city_id, notes, internal_notes)
    values (
      v_org, p_store.id, v_external_id,
      app.next_order_number(v_org),
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

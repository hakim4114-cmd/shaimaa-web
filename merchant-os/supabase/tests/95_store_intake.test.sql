-- Store connections (1.5.0): webhook orders land in an inbox, are imported once. Rolled back.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;

create schema tests;
grant usage on schema tests to anon, authenticated, service_role;
create function tests.expect_error(p_sql text, p_expected text) returns void language plpgsql as $$
begin
  begin execute p_sql;
  exception when others then
    if sqlerrm not like '%' || p_expected || '%' then
      raise exception 'Expected error "%" but got "%" for: %', p_expected, sqlerrm, p_sql;
    end if;
    return;
  end;
  raise exception 'Expected error "%" but statement succeeded: %', p_expected, p_sql;
end; $$;
create function tests.eq(p_actual anyelement, p_expected anyelement, p_label text) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'FAIL %: expected %, got %', p_label, p_expected, p_actual;
  end if;
  raise notice 'ok - %', p_label;
end; $$;
create function tests.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
create function tests.order_payload(p_id text, p_sku text, p_phone text) returns jsonb language sql as $$
  select jsonb_build_object(
    'external_id', p_id, 'number', '#' || p_id, 'currency', 'MAD', 'paid', false,
    'customer', jsonb_build_object('full_name', 'Salma B', 'phone', p_phone, 'city', 'kenitra', 'address', 'Hay Saknia'),
    'items', jsonb_build_array(jsonb_build_object('sku', p_sku, 'title', 'Wallet', 'quantity', 2, 'unit_price_cents', 12000)),
    'shipping_cents', 3000, 'discount_cents', 4000, 'note', 'Call after 6pm');
$$;
grant execute on all functions in schema tests to anon, authenticated, service_role;

\set owner    '20000000-0000-0000-0000-0000000000a1'
\set operator '20000000-0000-0000-0000-0000000000a2'
\set viewer   '20000000-0000-0000-0000-0000000000a3'
\set stranger '20000000-0000-0000-0000-0000000000a4'
insert into auth.users (id) values (:'owner'), (:'operator'), (:'viewer'), (:'stranger');

set local role authenticated;
select tests.login(:'owner');
select id as org from public.create_organization('Store Test', 'store-test') \gset
select id as loc from public.inventory_locations where organization_id = :'org' \gset
insert into public.organization_members (organization_id, user_id, role) values (:'org', :'operator', 'operator'), (:'org', :'viewer', 'viewer');
insert into public.products (organization_id, name, status) values (:'org', 'Wallet', 'active') returning id as product \gset
insert into public.product_variants (organization_id, product_id, sku, price_cents, cost_cents)
  values (:'org', :'product', 'WAL-BLK', 14900, 5000) returning id as v1 \gset
select public.adjust_inventory(:'v1', :'loc', 'receipt', 10, 'stock');

-- Connections ----------------------------------------------------------------
select tests.expect_error(format($$select public.create_store_connection(%L, 'Shop', 'shopify', null, 'short')$$, :'org'), 'SECRET_TOO_SHORT');
select id as shop from public.create_store_connection(:'org', 'My Shopify', 'shopify', 'https://x.myshopify.com', 'shpss_0123456789abcdef') \gset
select tests.eq((select platform::text from public.stores where id = :'shop'), 'shopify', 'store keeps its platform');
select tests.expect_error('select * from public.store_secrets', 'permission denied');
select tests.expect_error(format($$select public.ingest_store_order(%L, '{}')$$, :'shop'), 'permission denied');

select tests.login(:'operator');
select tests.expect_error(format($$select public.create_store_connection(%L, 'X', 'custom', null, '0123456789abcdefgh')$$, :'org'), 'FORBIDDEN');
select tests.expect_error(format($$select public.set_store_secret(%L, '0123456789abcdefgh')$$, :'shop'), 'FORBIDDEN');

-- Webhook import (service_role) -------------------------------------------------
reset role;
set local role service_role;
select public.ingest_store_order(:'shop', tests.order_payload('1001', 'wal-blk', '+212611223344')) ->> 'status' as s1 \gset
select tests.eq(:'s1'::text, 'imported'::text, 'a valid store order is imported');
select id as o1, status::text as st, source::text as src, total_cents, cod_amount_cents, discount_cents, shipping_fee_cents, city_id is not null as has_city
  from public.orders where store_id = :'shop' and external_id = '1001' \gset
select tests.eq(:'st'::text, 'new'::text, 'store orders start as new (never auto-confirmed)');
select tests.eq(:'src'::text, 'website'::text, 'store orders are marked as website orders');
select tests.eq(:'total_cents'::bigint, 23000::bigint, 'total = 2 x 120.00 - 40.00 discount + 30.00 shipping');
select tests.eq(:'cod_amount_cents'::bigint, 23000::bigint, 'unpaid store order is collected on delivery');
select tests.eq(:'has_city'::boolean, true, 'typed city is matched to the city list');
select tests.eq((select unit_price_cents from public.order_items where order_id = :'o1'), 12000::bigint, 'line keeps the store price');
select tests.eq((select unit_cost_cents from public.order_items where order_id = :'o1'), 5000::bigint, 'line keeps the catalog cost');

select public.ingest_store_order(:'shop', tests.order_payload('1001', 'WAL-BLK', '+212611223344')) ->> 'status' as dup \gset
select tests.eq(:'dup'::text, 'imported'::text, 'a repeated delivery is reported as already imported');
select tests.eq((select count(*) from public.orders where store_id = :'shop'), 1::bigint, 'a repeated delivery does not create a second order');

-- Problems go to the inbox ------------------------------------------------------
select public.ingest_store_order(:'shop', tests.order_payload('1002', 'NOPE-1', '+212611223355')) ->> 'reason' as r2 \gset
select tests.eq(:'r2'::text, 'unknown_sku'::text, 'unknown SKU needs attention');
select public.ingest_store_order(:'shop', tests.order_payload('1003', 'WAL-BLK', '0611')) ->> 'reason' as r3 \gset
select tests.eq(:'r3'::text, 'invalid_phone'::text, 'invalid phone needs attention');
select public.ingest_store_order(:'shop', tests.order_payload('1004', 'WAL-BLK', '+212611223366') || '{"currency":"EUR"}') ->> 'reason' as r4 \gset
select tests.eq(:'r4'::text, 'currency'::text, 'another currency needs attention');
select public.ingest_store_order(:'shop', tests.order_payload('1005', 'WAL-BLK', '+212611223377') || '{"paid":true}') ->> 'status' as s5 \gset
select tests.eq((select cod_amount_cents from public.orders where external_id = '1005'), 0::bigint, 'a prepaid store order has nothing to collect');
select tests.eq((select count(*) from public.orders where store_id = :'shop'), 2::bigint, 'orders needing attention create no order');
select tests.expect_error(format($$select public.ingest_store_order(%L, '{}')$$, :'org'), 'STORE_NOT_FOUND');

-- Inbox: who sees it, retry, ignore ----------------------------------------------
reset role;
set local role authenticated;
select tests.login(:'viewer');
select tests.eq((select count(*) from public.external_orders), 0::bigint, 'viewers do not see the store inbox');
select tests.login(:'stranger');
select tests.eq((select count(*) from public.external_orders), 0::bigint, 'other organizations do not see the store inbox');
select tests.login(:'operator');
select tests.eq((select count(*) from public.external_orders where status = 'needs_attention'), 3::bigint, 'operators see orders needing attention');
select id as x2 from public.external_orders where external_id = '1002' \gset
select tests.eq((public.retry_store_order(:'x2')).status, 'needs_attention'::text, 'retry before fixing keeps it waiting');
select tests.login(:'owner');
update public.product_variants set sku = 'NOPE-1' where id = :'v1';
select tests.login(:'operator');
select tests.eq((public.retry_store_order(:'x2')).status, 'imported'::text, 'retry after adding the SKU imports the order');
select tests.eq((select attempts from public.external_orders where id = :'x2'), 3, 'attempts are counted');
select tests.expect_error(format($$select public.retry_store_order(%L)$$, :'x2'), 'NOT_RETRYABLE');
select id as x3 from public.external_orders where external_id = '1003' \gset
select tests.eq((public.ignore_store_order(:'x3')).status, 'ignored'::text, 'an order can be dismissed');
select tests.login(:'viewer');
select tests.expect_error(format($$select public.ignore_store_order(%L)$$, :'x3'), 'FORBIDDEN');

-- Blocked customer and inactive store ---------------------------------------------
select tests.login(:'owner');
insert into public.customer_blocklist (organization_id, phone, reason) values (:'org', '+212699999999', 'refused twice');
update public.stores set is_active = false where id = :'shop';
reset role;
set local role service_role;
select tests.eq(public.ingest_store_order(:'shop', tests.order_payload('1006', 'NOPE-1', '+212611223388')) ->> 'reason', 'store_inactive'::text, 'a paused store does not create orders');
update public.stores set is_active = true where id = :'shop';
select tests.eq(public.ingest_store_order(:'shop', tests.order_payload('1007', 'NOPE-1', '+212699999999')) ->> 'reason', 'customer_blocked'::text, 'a blocked customer needs attention');

rollback;

-- Confirmation channel (1.8.0). Rolled back.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;
create schema tests;
grant usage on schema tests to anon, authenticated, service_role;
create function tests.eq(p_actual anyelement, p_expected anyelement, p_label text) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then raise exception 'FAIL %: expected %, got %', p_label, p_expected, p_actual; end if;
  raise notice 'ok - %', p_label;
end; $$;
create function tests.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
create function tests.new_order(p_org uuid, p_variant uuid, p_phone text) returns uuid language sql as $$
  select (public.create_order(p_org, jsonb_build_object(
    'customer', jsonb_build_object('full_name', 'Client', 'phone', p_phone, 'address', 'Hay'),
    'items', jsonb_build_array(jsonb_build_object('variant_id', p_variant, 'quantity', 1)), 'shipping_fee_cents', 3000))).id;
$$;
grant execute on all functions in schema tests to anon, authenticated, service_role;

\set owner '20000000-0000-0000-0000-0000000000d1'
insert into auth.users (id) values (:'owner');
set local role authenticated;
select tests.login(:'owner');
select id as org from public.create_organization('Channel', 'channel-test') \gset
select id as loc from public.inventory_locations where organization_id = :'org' \gset
insert into public.products (organization_id, name, status) values (:'org', 'Bag', 'active') returning id as product \gset
insert into public.product_variants (organization_id, product_id, sku, price_cents, cost_cents) values (:'org', :'product', 'BAG-1', 20000, 8000) returning id as v1 \gset
select public.adjust_inventory(:'v1', :'loc', 'receipt', 10, 'stock');

select tests.new_order(:'org', :'v1', '+212611000101') as o1 \gset
select tests.new_order(:'org', :'v1', '+212611000102') as o2 \gset
select tests.new_order(:'org', :'v1', '+212611000103') as o3 \gset

select public.log_call_attempt(:'o1', 'no_answer');
select public.log_call_attempt(:'o1', 'confirmed', 'ok', null, 'whatsapp');
select tests.eq((select confirmed_via::text from public.orders where id = :'o1'), 'whatsapp', 'a WhatsApp confirmation is kept on the order');
select tests.eq((select string_agg(channel::text, ',' order by id) from public.order_call_attempts where order_id = :'o1'), 'phone,whatsapp', 'each attempt keeps its channel; phone is the default');
select public.log_call_attempt(:'o2', 'confirmed');
select tests.eq((select confirmed_via::text from public.orders where id = :'o2'), 'phone', 'a call confirmation is recorded as phone');
select public.transition_order(:'o3', 'confirmed', null);
select tests.eq((select confirmed_via from public.orders where id = :'o3') is null, true, 'a direct status change has no channel');

select tests.eq((select confirmed from public.confirmation_channel_report(:'org', current_date - 1, current_date + 1) where channel = 'whatsapp'), 1::bigint, 'report counts WhatsApp confirmations');
select tests.eq((select count(*) from public.confirmation_channel_report(:'org', current_date - 1, current_date + 1)), 3::bigint, 'report has phone, whatsapp and manual rows');
rollback;

-- Exchanges (0.9.0). Rolled back.
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
grant execute on all functions in schema tests to anon, authenticated, service_role;

create function tests.new_confirmed_order(p_org uuid, p_variant uuid, p_phone text) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  v_id := (public.create_order(p_org, jsonb_build_object(
    'customer', jsonb_build_object('full_name', 'Client Test', 'phone', p_phone, 'address', 'Hay Test'),
    'items', jsonb_build_array(jsonb_build_object('variant_id', p_variant, 'quantity', 1)),
    'shipping_fee_cents', 3500))).id;
  perform public.log_call_attempt(v_id, 'confirmed');
  return v_id;
end; $$;
grant execute on function tests.new_confirmed_order(uuid, uuid, text) to authenticated;

\set owner    '40000000-0000-0000-0000-00000000000a'
insert into auth.users (id) values (:'owner');
set local role authenticated;
select tests.login(:'owner');
select id as org from public.create_organization('Exchange Test', 'exchange-test') \gset
select id as loc from public.inventory_locations where organization_id = :'org' \gset
insert into public.products (organization_id, name, status) values (:'org', 'Sleeve', 'active') returning id as product \gset
insert into public.product_variants (organization_id, product_id, sku, price_cents, cost_cents) values (:'org', :'product', 'SLV-13', 34900, 14000) returning id as v13 \gset
insert into public.product_variants (organization_id, product_id, sku, price_cents, cost_cents) values (:'org', :'product', 'SLV-15', 37900, 15500) returning id as v15 \gset
select public.adjust_inventory(:'v13', :'loc', 'receipt', 5, 'stock');
select public.adjust_inventory(:'v15', :'loc', 'receipt', 5, 'stock');
insert into public.shipping_providers (organization_id, name, kind, adapter_key) values (:'org', 'Sendit', 'api', 'sendit') returning id as sendit \gset

select (public.create_order(:'org', jsonb_build_object('customer', jsonb_build_object('full_name', 'X Client', 'phone', '+212611000021'),
  'items', jsonb_build_array(jsonb_build_object('variant_id', :'v13', 'quantity', 1)), 'shipping_fee_cents', 3500))).id as o1 \gset
select tests.expect_error(format($$select public.create_exchange_order(%L, '{"items": [{"variant_id": "%s", "quantity": 1}]}')$$, :'o1', :'v15'), 'ORDER_NOT_EXCHANGEABLE');
select public.log_call_attempt(:'o1', 'confirmed');
select public.register_carrier_shipment(:'o1', :'sendit', 'DHX001', 3000);
reset role;
set local role service_role;
select public.apply_carrier_event(:'sendit', 'DHX001', 'PICKEDUP', 'picked_up', '{"lastActionAt": "1"}');
select public.apply_carrier_event(:'sendit', 'DHX001', 'DELIVERED', 'delivered', '{"lastActionAt": "2"}');
reset role;
set local role authenticated;
select tests.login(:'owner');

select tests.expect_error(format($$select public.create_exchange_order(%L, '{"items": [{"variant_id": "%s", "quantity": 1}], "price_difference_cents": 99999999}')$$, :'o1', :'v15'), 'INVALID_DISCOUNT');
select id as x1 from public.create_exchange_order(:'o1', jsonb_build_object('items', jsonb_build_array(jsonb_build_object('variant_id', :'v15', 'quantity', 1)),
  'price_difference_cents', 3000, 'shipping_fee_cents', 2500, 'reason', 'Wrong size')) \gset
select tests.eq((select status::text from public.orders where id = :'o1'), 'exchange_requested', 'original order moves to exchange requested');
select tests.eq((select count(*)::int from public.returns where order_id = :'o1' and kind = 'exchange' and status = 'awaiting_receipt'), 1, 'an exchange return awaits the old item');
select tests.eq((select row(status::text, exchange_of_order_id::text, total_cents, cod_amount_cents)::text from public.orders where id = :'x1'),
  row('confirmed', :'o1', 5500::bigint, 5500::bigint)::text, 'replacement is confirmed, linked, and collects difference + fee only');
select tests.eq((select reserved from public.inventory_levels where variant_id = :'v15'), 1, 'replacement item is reserved');
select tests.eq((select phone from public.order_contacts where order_id = :'x1'), '+212611000021', 'replacement keeps the customer contact');
select tests.expect_error(format($$select public.create_exchange_order(%L, '{"items": [{"variant_id": "%s", "quantity": 1}]}')$$, :'o1', :'v15'), 'ORDER_NOT_EXCHANGEABLE');

rollback;

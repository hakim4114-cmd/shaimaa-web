-- Carrier shipping (0.6.0): parcel registration and webhook events. Rolled back.
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

\set owner    '20000000-0000-0000-0000-00000000000a'
\set viewer   '20000000-0000-0000-0000-00000000000e'
insert into auth.users (id) values (:'owner'), (:'viewer');

set local role authenticated;
select tests.login(:'owner');
select id as org from public.create_organization('Carrier Test', 'carrier-test') \gset
select id as loc from public.inventory_locations where organization_id = :'org' \gset
insert into public.organization_members (organization_id, user_id, role) values (:'org', :'viewer', 'viewer');
insert into public.products (organization_id, name, status) values (:'org', 'Card holder', 'active') returning id as product \gset
insert into public.product_variants (organization_id, product_id, sku, price_cents, cost_cents)
  values (:'org', :'product', 'CARD-BRN', 14900, 5500) returning id as v1 \gset
select public.adjust_inventory(:'v1', :'loc', 'receipt', 10, 'stock');
insert into public.shipping_providers (organization_id, name, kind, adapter_key, settings)
  values (:'org', 'Sendit', 'api', 'sendit', '{"pickup_city": "Kénitra", "allow_open": true, "allow_try": true}') returning id as sendit \gset


select tests.new_confirmed_order(:'org', :'v1', '+212611000001') as o1 \gset
select tests.new_confirmed_order(:'org', :'v1', '+212611000002') as o2 \gset

-- Registration ----------------------------------------------------------------
select tests.expect_error(format($$select public.register_carrier_shipment(%L, %L, '', 3000)$$, :'o1', :'sendit'), 'TRACKING_REQUIRED');
select id as s1 from public.register_carrier_shipment(:'o1', :'sendit', 'DHTEST001', 3000, '{"district_id": "77", "district_name": "Kénitra - Centre", "status": "PENDING"}') \gset
select tests.eq((select status::text from public.orders where id = :'o1'), 'ready_to_ship', 'a confirmed order moves to ready to ship when its parcel is created');
select tests.eq((select carrier_district_name from public.shipments where id = :'s1'), 'Kénitra - Centre', 'carrier district is kept on the shipment');
select tests.eq((select cod_amount_cents from public.shipments where id = :'s1'), 18400::bigint, 'shipment carries the order COD amount');
select tests.expect_error(format($$select public.register_carrier_shipment(%L, %L, 'DHTEST009', 3000)$$, :'o1', :'sendit'), 'shipments_active_per_order_uq');
select id as s2 from public.register_carrier_shipment(:'o2', :'sendit', 'DHTEST002', 3000) \gset

select tests.login(:'viewer');
select tests.expect_error(format($$select public.register_carrier_shipment(%L, %L, 'DHX', 3000)$$, :'o2', :'sendit'), 'FORBIDDEN');
select tests.login(:'owner');

-- Webhook events: authenticated users may not call them -----------------------
select tests.expect_error(format($$select public.apply_carrier_event(%L, 'DHTEST001', 'PICKEDUP', 'picked_up', '{}')$$, :'sendit'), 'permission denied');

reset role;
set local role service_role;
select tests.eq(public.apply_carrier_event(:'sendit', 'DHTEST001', 'PICKEDUP', 'picked_up', '{"code": "DHTEST001", "newStatus": "PICKEDUP", "lastActionAt": "2026-11-17 10:00:00"}'), 'applied', 'pickup event applied');
select tests.eq((select status::text from public.orders where id = :'o1'), 'shipped', 'carrier pickup ships the order');
select tests.eq((select on_hand from public.inventory_levels where variant_id = :'v1'), 9, 'pickup takes the unit out of stock');
select tests.eq(public.apply_carrier_event(:'sendit', 'DHTEST001', 'PICKEDUP', 'picked_up', '{"code": "DHTEST001", "newStatus": "PICKEDUP", "lastActionAt": "2026-11-17 10:00:00"}'), 'duplicate', 'the same event twice is applied once');

select tests.eq(public.apply_carrier_event(:'sendit', 'DHTEST001', 'UNREACHABLE', 'failed_attempt', '{"newStatus": "UNREACHABLE", "message": "Ne répond pas", "counterUnreachable": 1, "lastActionAt": "2026-11-18 11:00:00"}'), 'applied', 'unreachable applied');
select tests.eq(public.apply_carrier_event(:'sendit', 'DHTEST001', 'POSTPONED', null, '{"newStatus": "POSTPONED", "message": "Programmé par le client", "deliverBy": "2026-11-19", "counterUnreachable": 1, "lastActionAt": "2026-11-18 12:00:00"}'), 'applied', 'postponed updates details only');
select tests.eq((select row(status::text, carrier_status, deliver_by::text, unreachable_count, carrier_message)::text from public.shipments where id = :'s1'),
  row('failed_attempt', 'POSTPONED', '2026-11-19', 1, 'Programmé par le client')::text, 'carrier details follow the latest event');
select tests.eq(public.apply_carrier_event(:'sendit', 'DHTEST001', 'DELIVERED', 'delivered', '{"newStatus": "DELIVERED", "lastActionAt": "2026-11-19 15:00:00"}'), 'applied', 'delivered applied');
select tests.eq((select row(status::text, payment_status::text)::text from public.orders where id = :'o1'), row('delivered', 'awaiting_remittance')::text, 'delivery marks the order delivered and awaiting the carrier payout');
select tests.eq(public.apply_carrier_event(:'sendit', 'DHTEST001', 'REJECTED', 'returned_to_sender', '{"newStatus": "REJECTED", "lastActionAt": "2026-11-20 09:00:00"}'), 'applied', 'late event on a closed shipment is recorded');
select tests.eq((select status::text from public.orders where id = :'o1'), 'delivered', 'a closed shipment is not reopened by a late event');

-- Refusal path
select public.apply_carrier_event(:'sendit', 'DHTEST002', 'PICKEDUP', 'picked_up', '{"lastActionAt": "2026-11-17 10:05:00"}');
select tests.eq(public.apply_carrier_event(:'sendit', 'DHTEST002', 'REJECTED', 'returned_to_sender', '{"newStatus": "REJECTED", "message": "Client a refusé", "lastActionAt": "2026-11-18 16:00:00"}'), 'applied', 'refusal applied');
select tests.eq((select status::text from public.orders where id = :'o2'), 'refused', 'carrier refusal marks the order refused');
select tests.eq((select count(*)::int from public.returns where order_id = :'o2' and kind = 'refusal'), 1, 'a refusal return awaits the parcel');

select tests.eq(public.apply_carrier_event(:'sendit', 'DHNOPE', 'DELIVERED', 'delivered', '{}'), 'unknown_shipment', 'unknown parcels are logged, not applied');
select tests.eq((select count(*)::int from public.carrier_events where provider_id = :'sendit'), 8, 'every distinct received event is logged once');
select tests.expect_error($$delete from public.carrier_events$$, 'IMMUTABLE');

-- Delivery included in the price: new orders default to a delivery fee of 0
reset role;
set local role authenticated;
select tests.login(:'owner');
insert into public.shipping_rates (organization_id, city_id, customer_fee_cents) select :'org', id, 3500 from public.cities where organization_id is null order by id limit 1;
select id as rate_city from public.cities where organization_id is null order by id limit 1 \gset
select (public.create_order(:'org', jsonb_build_object('customer', jsonb_build_object('full_name', 'Fee A', 'phone', '+212611000011', 'address', 'x'), 'city_id', :'rate_city', 'items', jsonb_build_array(jsonb_build_object('variant_id', :'v1', 'quantity', 1))))).shipping_fee_cents as fee_extra \gset
select tests.eq(:'fee_extra'::bigint, 3500::bigint, 'customer pays delivery: the city fee is applied');
update public.organizations set delivery_included = true where id = :'org';
select (public.create_order(:'org', jsonb_build_object('customer', jsonb_build_object('full_name', 'Fee B', 'phone', '+212611000012', 'address', 'x'), 'city_id', :'rate_city', 'items', jsonb_build_array(jsonb_build_object('variant_id', :'v1', 'quantity', 1))))).shipping_fee_cents as fee_included \gset
select tests.eq(:'fee_included'::bigint, 0::bigint, 'delivery included: the default fee is 0');
select (public.create_order(:'org', jsonb_build_object('customer', jsonb_build_object('full_name', 'Fee C', 'phone', '+212611000013', 'address', 'x'), 'city_id', :'rate_city', 'shipping_fee_cents', 2000, 'items', jsonb_build_array(jsonb_build_object('variant_id', :'v1', 'quantity', 1))))).shipping_fee_cents as fee_typed \gset
select tests.eq(:'fee_typed'::bigint, 2000::bigint, 'a fee typed on the order still wins');

-- Only owners and admins change the delivery pricing: RLS turns other updates into no-ops.
select tests.login(:'viewer');
update public.organizations set delivery_included = false where id = :'org';
reset role;
\set outsider '20000000-0000-0000-0000-0000000000f1'
insert into auth.users (id) values (:'outsider');
set local role authenticated;
select tests.login(:'outsider');
update public.organizations set delivery_included = false where id = :'org';
select tests.login(:'owner');
select tests.eq((select delivery_included from public.organizations where id = :'org'), true, 'a viewer or a non-member cannot change the delivery pricing');

-- Parcel cancelled before pickup: the order goes back to preparing and can be shipped again
reset role;
set local role authenticated;
select tests.login(:'owner');
select tests.new_confirmed_order(:'org', :'v1', '+212611000003') as o3 \gset
select id as s3 from public.register_carrier_shipment(:'o3', :'sendit', 'DHTEST003', 3000) \gset
select tests.eq((select status::text from public.orders where id = :'o3'), 'ready_to_ship', 'parcel created: ready to ship');
select public.update_shipment_status(:'s3', 'cancelled', 'Deleted at Sendit');
select tests.eq((select status::text from public.orders where id = :'o3'), 'preparing', 'a parcel cancelled before pickup sends the order back to preparing');
select tests.eq((select stock_state::text from public.orders where id = :'o3'), 'reserved', 'stock stays reserved for the order');
select id as s4 from public.register_carrier_shipment(:'o3', :'sendit', 'DHTEST004', 3000) \gset
select tests.eq((select status::text from public.orders where id = :'o3'), 'ready_to_ship', 'the order can be shipped again');
-- Customer cancelled: parcel cancelled, then the order, which releases the reserved unit
select reserved as reserved_before from public.inventory_levels where variant_id = :'v1' \gset
select public.update_shipment_status(:'s4', 'cancelled', 'Customer cancelled');
select public.transition_order(:'o3', 'cancelled', 'Customer changed mind');
select tests.eq((select row(status::text, stock_state::text)::text from public.orders where id = :'o3'), row('cancelled', 'released')::text, 'cancelling the order after its parcel releases the stock');
select tests.eq((select reserved from public.inventory_levels where variant_id = :'v1'), :'reserved_before'::int - 1, 'the reserved unit is available again');

rollback;

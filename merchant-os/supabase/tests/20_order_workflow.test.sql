-- Order workflow (0.3.0): cities, shipping rates, confirmation calls,
-- blocklist, customer history, editing before confirmation. Rolled back.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;

create schema tests;
grant usage on schema tests to anon, authenticated;
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
grant execute on all functions in schema tests to anon, authenticated;

\set owner    '10000000-0000-0000-0000-00000000000a'
\set operator '10000000-0000-0000-0000-00000000000b'
\set viewer   '10000000-0000-0000-0000-00000000000e'
\set outsider '10000000-0000-0000-0000-00000000000f'
insert into auth.users (id) values (:'owner'), (:'operator'), (:'viewer'), (:'outsider');

set local role authenticated;
select tests.login(:'owner');
select id as org from public.create_organization('Workflow Test', 'workflow-test') \gset
select id as loc from public.inventory_locations where organization_id = :'org' \gset
insert into public.organization_members (organization_id, user_id, role) values (:'org', :'operator', 'operator'), (:'org', :'viewer', 'viewer');
insert into public.products (organization_id, name, status) values (:'org', 'Djellaba', 'active') returning id as product \gset
insert into public.product_variants (organization_id, product_id, sku, price_cents, cost_cents)
  values (:'org', :'product', 'DJ-M', 50000, 20000) returning id as v_m \gset
insert into public.product_variants (organization_id, product_id, sku, price_cents, cost_cents)
  values (:'org', :'product', 'DJ-L', 55000, 21000) returning id as v_l \gset
select public.adjust_inventory(:'v_m', :'loc', 'receipt', 10, 'stock');

-- Cities ---------------------------------------------------------------------
select id as casa from public.cities where name_fr = 'Casablanca' and organization_id is null \gset
select id as rabat from public.cities where name_fr = 'Rabat' and organization_id is null \gset
select tests.eq((select count(*) >= 40 from public.cities where organization_id is null), true, 'reference list of Moroccan cities is seeded');
select tests.eq((select name_ar from public.cities where 'casa' = any(aliases)), 'الدار البيضاء', 'aliases resolve common spellings');
insert into public.cities (organization_id, name_fr, name_ar, region) values (:'org', 'Sidi Bennour', 'سيدي بنور', 'Casablanca-Settat') returning id as custom_city \gset
select tests.expect_error(format($$insert into public.cities (name_fr, name_ar) values ('Fake', 'مزيف')$$), 'row-level security');

-- Shipping rates (default rate per city) ------------------------------------
insert into public.shipping_rates (organization_id, city_id, customer_fee_cents, carrier_cost_cents) values (:'org', :'casa', 2000, 1800);
insert into public.shipping_rates (organization_id, city_id, customer_fee_cents, carrier_cost_cents) values (:'org', :'rabat', 3500, 3000);
select tests.expect_error(format($$insert into public.shipping_rates (organization_id, city_id, customer_fee_cents) values (%L, %L, 1)$$, :'org', :'casa'), 'duplicate key');

-- Orders with city reference --------------------------------------------------
select tests.login(:'operator');
select id as o1, shipping_fee_cents as fee1, city as city1 from public.create_order(:'org', jsonb_build_object(
  'customer', jsonb_build_object('full_name', 'Salma Bennani', 'phone', '+212612345678'),
  'city_id', :'casa',
  'items', jsonb_build_array(jsonb_build_object('variant_id', :'v_m', 'quantity', 1)))) \gset
select tests.eq(:'fee1'::bigint, 2000::bigint, 'shipping fee filled from the city rate');
select tests.eq(:'city1'::text, 'Casablanca', 'city name normalised from the reference');
select tests.expect_error(format($$select public.create_order(%L, %L::jsonb)$$, :'org',
  json_build_object('customer', json_build_object('full_name', 'X Y', 'phone', '+212612345679'), 'city_id', 999999,
    'items', json_build_array(json_build_object('variant_id', :'v_m', 'quantity', 1)))), 'CITY_NOT_FOUND');

-- Editing before confirmation --------------------------------------------------
select public.update_order_details(:'o1', jsonb_build_object(
  'items', jsonb_build_array(jsonb_build_object('variant_id', :'v_l', 'quantity', 2)),
  'city_id', :'rabat', 'address', 'Agdal, rue 5'));
select tests.eq((select row(subtotal_cents, shipping_fee_cents, total_cents, cod_amount_cents, city)::text from public.orders where id = :'o1'),
  '(110000,3500,113500,113500,Rabat)', 'edit replaces lines at catalog price, recomputes fee, total and COD');
select tests.eq((select address from public.order_contacts where order_id = :'o1'), 'Agdal, rue 5', 'edit updates the contact snapshot');
select tests.eq((select note from public.order_events where order_id = :'o1' and event_type = 'edited'), 'items, city, shipping_fee, contact', 'edit is logged in the timeline');

-- Confirmation calls ----------------------------------------------------------
select public.log_call_attempt(:'o1', 'no_answer');
select tests.eq((select row(status, call_attempts, last_call_outcome)::text from public.orders where id = :'o1'),
  '(confirmation_pending,1,no_answer)', 'unanswered call moves a new order to confirmation pending');
select tests.expect_error(format($$select public.log_call_attempt(%L, 'call_back_requested')$$, :'o1'), 'CALL_BACK_TIME_REQUIRED');
select public.log_call_attempt(:'o1', 'call_back_requested', 'after 5pm', now() + interval '3 hours');
select tests.eq((select next_call_at is not null from public.orders where id = :'o1'), true, 'call-back time is scheduled');
-- Variant L has no stock: confirming must fail and roll back the whole call.
select tests.expect_error(format($$select public.log_call_attempt(%L, 'confirmed')$$, :'o1'), 'INSUFFICIENT_STOCK');
select tests.eq((select call_attempts from public.orders where id = :'o1'), 2, 'failed confirmation does not log a call');
select public.update_order_details(:'o1', jsonb_build_object('items', jsonb_build_array(jsonb_build_object('variant_id', :'v_m', 'quantity', 2))));
select public.log_call_attempt(:'o1', 'confirmed', 'OK by phone');
select tests.eq((select row(status, stock_state, call_attempts)::text from public.orders where id = :'o1'),
  '(confirmed,reserved,3)', 'confirmed call confirms the order and reserves stock');
select tests.eq((select reserved from public.inventory_levels where variant_id = :'v_m'), 2, 'stock reserved by the call');
select tests.expect_error(format($$select public.update_order_details(%L, '{"discount_cents": 100}'::jsonb)$$, :'o1'), 'ORDER_LOCKED');
select tests.expect_error(format($$select public.log_call_attempt(%L, 'no_answer')$$, :'o1'), 'ORDER_NOT_AWAITING_CONFIRMATION');
select tests.eq((select count(*) from public.order_call_attempts where order_id = :'o1'), 3::bigint, 'every call is recorded');

-- Refusal history and blocklist -------------------------------------------------
select public.transition_order(:'o1', 'preparing');
select public.transition_order(:'o1', 'ready_to_ship');
select public.transition_order(:'o1', 'shipped');
select public.transition_order(:'o1', 'refused', 'Refused at the door');
select tests.eq((select row(orders_total, delivered, refused, blocked)::text from public.customer_history(:'org', '+212612345678')),
  '(1,0,1,f)', 'customer history counts refusals');
insert into public.customer_blocklist (organization_id, phone, reason) values (:'org', '+212612345678', 'Refused twice');
select tests.expect_error(format($$select public.create_order(%L, %L::jsonb)$$, :'org',
  json_build_object('customer', json_build_object('full_name', 'Salma Bennani', 'phone', '+212612345678'),
    'items', json_build_array(json_build_object('variant_id', :'v_m', 'quantity', 1)))), 'CUSTOMER_BLOCKED');
select tests.expect_error(format($$select public.create_order(%L, %L::jsonb)$$, :'org',
  json_build_object('customer', json_build_object('full_name', 'Salma Bennani', 'phone', '+212612345678'), 'allow_blocked', true,
    'items', json_build_array(json_build_object('variant_id', :'v_m', 'quantity', 1)))), 'CUSTOMER_BLOCKED');
select tests.login(:'owner');
select tests.eq((select status::text from public.create_order(:'org', jsonb_build_object(
  'customer', jsonb_build_object('full_name', 'Salma Bennani', 'phone', '+212612345678'), 'allow_blocked', true,
  'items', jsonb_build_array(jsonb_build_object('variant_id', :'v_m', 'quantity', 1))))), 'new', 'owner can override the blocklist explicitly');

-- Cancel by call requires a reason -----------------------------------------------
select tests.login(:'operator');
select id as o2 from public.create_order(:'org', jsonb_build_object(
  'customer', jsonb_build_object('full_name', 'Youssef Alaoui', 'phone', '+212698765432', 'city', 'Douar Lmers'),
  'items', jsonb_build_array(jsonb_build_object('variant_id', :'v_m', 'quantity', 1)))) \gset
select tests.eq((select row(city, city_id, shipping_fee_cents)::text from public.orders where id = :'o2'), '("Douar Lmers",,0)', 'free-text city still accepted when not in the list');
select tests.expect_error(format($$select public.log_call_attempt(%L, 'cancelled')$$, :'o2'), 'NOTE_REQUIRED');
select public.log_call_attempt(:'o2', 'cancelled', 'Changed mind');
select tests.eq((select status::text from public.orders where id = :'o2'), 'cancelled', 'cancelled call cancels the order');

-- Visibility ------------------------------------------------------------------
select tests.login(:'viewer');
select tests.eq((select count(*) from public.order_call_attempts), 0::bigint, 'viewer cannot read call notes');
select tests.eq((select count(*) from public.customer_blocklist), 0::bigint, 'viewer cannot read the blocklist');
select tests.expect_error(format($$select * from public.customer_history(%L, '+212612345678')$$, :'org'), 'FORBIDDEN');
select tests.expect_error(format($$select public.log_call_attempt(%L, 'no_answer')$$, :'o2'), 'FORBIDDEN');
select tests.login(:'outsider');
select tests.eq((select count(*) from public.cities where organization_id is not null), 0::bigint, 'other tenants do not see custom cities');
select tests.eq((select count(*) from public.shipping_rates), 0::bigint, 'other tenants do not see shipping rates');
reset role;

select tests.expect_error('update public.order_call_attempts set note = $$x$$', 'IMMUTABLE_RECORD');
select app.delete_organization(:'org');
select tests.eq((select count(*) from public.order_call_attempts), 0::bigint, 'tenant deletion removes call records');

\echo 'ORDER WORKFLOW TESTS PASSED'
rollback;

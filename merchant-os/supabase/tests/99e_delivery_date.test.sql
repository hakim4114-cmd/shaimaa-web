-- Delivery on a chosen day (1.23.0). Rolled back.
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

\set owner    '73000000-0000-0000-0000-00000000000a'
\set outsider '73000000-0000-0000-0000-0000000000f1'
insert into auth.users (id) values (:'owner'), (:'outsider');
set local role authenticated;
select tests.login(:'owner');
select id as org from public.create_organization('Date Test', 'date-test') \gset
select public.save_product(:'org', jsonb_build_object('name', 'Date Belt', 'status', 'active', 'options', '[]'::jsonb,
  'variants', jsonb_build_array(jsonb_build_object('sku', 'DATE-1', 'title', '', 'option_values', '{}'::jsonb, 'price_cents', 9900, 'cost_cents', 4000, 'status', 'active')))) as product \gset
select id as variant from public.product_variants where product_id = :'product' \gset
select id as ord from public.create_order(:'org', jsonb_build_object(
  'customer', jsonb_build_object('full_name', 'Date Buyer', 'phone', '+212612349999', 'city', 'Rabat'),
  'items', jsonb_build_array(jsonb_build_object('variant_id', :'variant', 'quantity', 1)))) \gset

-- While confirming: the customer wants it in three days.
select public.set_delivery_date(:'ord', current_date + 3, 'wants it on Saturday');
select tests.eq((select deliver_on from public.orders where id = :'ord'), current_date + 3, 'delivery day saved on the order');
select tests.eq((select count(*) from public.order_events where order_id = :'ord' and note like 'Delivery on %Saturday'), 1::bigint, 'the change is written in the order history');

-- No day in the past, none more than two months ahead.
select tests.expect_error(format($$select public.set_delivery_date(%L, current_date - 1)$$, :'ord'), 'INVALID_DATE');
select tests.expect_error(format($$select public.set_delivery_date(%L, current_date + 61)$$, :'ord'), 'INVALID_DATE');

-- Back to "as soon as possible".
select public.set_delivery_date(:'ord', null);
select tests.eq((select deliver_on from public.orders where id = :'ord'), null::date, 'delivery day cleared');

-- A cancelled order cannot be scheduled; an outsider cannot touch it.
select public.transition_order(:'ord', 'cancelled', 'Changed mind');
select tests.expect_error(format($$select public.set_delivery_date(%L, current_date + 1)$$, :'ord'), 'INVALID_TRANSITION');
select tests.login(:'outsider');
select tests.expect_error(format($$select public.set_delivery_date(%L, current_date + 1)$$, :'ord'), 'FORBIDDEN');

rollback;

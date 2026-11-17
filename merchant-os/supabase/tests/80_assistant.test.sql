-- Assistant connection (1.1.0). Rolled back.
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

\set owner    '60000000-0000-0000-0000-00000000000a'
\set operator '60000000-0000-0000-0000-00000000000b'
insert into auth.users (id) values (:'owner'), (:'operator');
set local role authenticated;
select tests.login(:'owner');
select id as org from public.create_organization('Assistant Test', 'assistant-test') \gset
select id as loc from public.inventory_locations where organization_id = :'org' \gset
insert into public.organization_members (organization_id, user_id, role) values (:'org', :'operator', 'operator');
insert into public.products (organization_id, name, status) values (:'org', 'Folder', 'active') returning id as product \gset
insert into public.product_variants (organization_id, product_id, sku, price_cents, cost_cents) values (:'org', :'product', 'FLD', 40000, 16000) returning id as v1 \gset
select public.adjust_inventory(:'v1', :'loc', 'receipt', 4, 'stock');
select public.create_order(:'org', jsonb_build_object('customer', jsonb_build_object('full_name', 'Secret Name', 'phone', '+212611000031', 'address', 'Secret address'),
  'items', jsonb_build_array(jsonb_build_object('variant_id', :'v1', 'quantity', 1)), 'shipping_fee_cents', 3500));

\set hash 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
select public.create_assistant_token(:'org', 'Claude', :'hash');
select tests.login(:'operator');
select tests.expect_error(format($$select public.create_assistant_token(%L, 'x', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')$$, :'org'), 'FORBIDDEN');
select tests.eq((select count(*)::int from public.assistant_tokens), 0, 'operators cannot see connector tokens');

-- Called without any session, like the MCP endpoint.
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;
select tests.expect_error($$select public.assistant_call('cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc', 'today')$$, 'INVALID_TOKEN');
select tests.eq((public.assistant_call(:'hash', 'today') ->> 'calls_due')::int, 1, 'today: calls due');
select tests.eq((public.assistant_call(:'hash', 'business_summary') ->> 'orders_created')::int, 1, 'summary runs as the token owner');
select tests.eq(jsonb_array_length(public.assistant_call(:'hash', 'orders')), 1, 'orders listed');
select tests.eq(public.assistant_call(:'hash', 'orders')::text like '%Secret%', false, 'no customer name, phone or address in order lists');
select tests.eq((public.assistant_call(:'hash', 'stock') -> 'variants' -> 0 ->> 'on_hand')::int, 4, 'stock tool');
select tests.expect_error(format($$select public.assistant_call(%L, 'drop_everything')$$, :'hash'), 'UNKNOWN_TOOL');
select tests.expect_error($$select * from public.assistant_tokens$$, 'permission denied');

-- Removing the creator's owner role cuts access.
reset role;
insert into auth.users (id) values ('60000000-0000-0000-0000-00000000000c');
insert into public.organization_members (organization_id, user_id, role) values (:'org', '60000000-0000-0000-0000-00000000000c', 'owner');
update public.organization_members set role = 'operator' where user_id = :'owner';
set local role anon;
select tests.expect_error(format($$select public.assistant_call(%L, 'today')$$, :'hash'), 'FORBIDDEN');

rollback;

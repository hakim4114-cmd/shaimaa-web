-- Problems log (1.11.0). Rolled back.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;
create schema tests;
grant usage on schema tests to anon, authenticated, service_role;
create function tests.expect_error(p_sql text, p_expected text) returns void language plpgsql as $$
begin
  begin execute p_sql;
  exception when others then
    if sqlerrm not like '%' || p_expected || '%' then raise exception 'Expected error "%" but got "%" for: %', p_expected, sqlerrm, p_sql; end if;
    return;
  end;
  raise exception 'Expected error "%" but statement succeeded: %', p_expected, p_sql;
end; $$;
create function tests.eq(p_actual anyelement, p_expected anyelement, p_label text) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then raise exception 'FAIL %: expected %, got %', p_label, p_expected, p_actual; end if;
  raise notice 'ok - %', p_label;
end; $$;
create function tests.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
grant execute on all functions in schema tests to anon, authenticated, service_role;
\set owner '20000000-0000-0000-0000-0000000000f1'
\set oper  '20000000-0000-0000-0000-0000000000f2'
\set other '20000000-0000-0000-0000-0000000000f3'
insert into auth.users (id) values (:'owner'), (:'oper'), (:'other');
set local role authenticated;
select tests.login(:'owner');
select id as org from public.create_organization('Events', 'events-test') \gset
insert into public.organization_members (organization_id, user_id, role) values (:'org', :'oper', 'operator');

select tests.expect_error(format($$select public.report_system_event(%L, 'store_webhook', 'x')$$, :'org'), 'permission denied');
reset role;
set local role service_role;
select public.report_system_event(:'org', 'sendit_webhook', 'Invalid signature', '{"n":1}') as e1 \gset
select public.report_system_event(:'org', 'sendit_webhook', 'Invalid signature', '{"n":2}') as e2 \gset
select tests.eq(:'e1'::uuid, :'e2'::uuid, 'the same open problem is counted, not repeated');
reset role;
set local role authenticated;
select tests.login(:'oper');
select tests.eq((select count(*) from public.system_events), 0::bigint, 'operators do not see the problems log');
select public.report_my_system_event(:'org', 'auto_ship', 'Sendit refused the parcel');
select tests.expect_error(format($$select public.report_my_system_event(%L, 'store_webhook', 'fake')$$, :'org'), 'FORBIDDEN');
select tests.expect_error(format($$select public.resolve_system_event(%L)$$, :'e1'), 'FORBIDDEN');
select tests.login(:'other');
select tests.expect_error(format($$select public.report_my_system_event(%L, 'auto_ship', 'x')$$, :'org'), 'FORBIDDEN');
select tests.login(:'owner');
select tests.eq((select occurrences from public.system_events where id = :'e1'), 2, 'owner sees the counter');
select tests.eq((select count(*) from public.system_events where resolved_at is null), 2::bigint, 'two open problems');
select public.resolve_system_event(:'e1');
select tests.eq((select count(*) from public.system_events where resolved_at is null), 1::bigint, 'a handled problem leaves the open list');
rollback;

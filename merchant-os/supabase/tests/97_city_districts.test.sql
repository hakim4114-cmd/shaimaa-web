-- Remembered carrier district per city (1.7.0). Rolled back.
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
  if p_actual is distinct from p_expected then raise exception 'FAIL %: expected %, got %', p_label, p_expected, p_actual; end if;
  raise notice 'ok - %', p_label;
end; $$;
create function tests.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
grant execute on all functions in schema tests to anon, authenticated, service_role;

\set owner  '20000000-0000-0000-0000-0000000000c1'
\set viewer '20000000-0000-0000-0000-0000000000c2'
\set other  '20000000-0000-0000-0000-0000000000c3'
insert into auth.users (id) values (:'owner'), (:'viewer'), (:'other');
set local role authenticated;
select tests.login(:'owner');
select id as org from public.create_organization('Districts', 'districts-test') \gset
insert into public.organization_members (organization_id, user_id, role) values (:'org', :'viewer', 'viewer');
select public.set_sendit_credentials(:'org', 'pk_aaaaaaaa', 'sk_aaaaaaaa') as prov \gset
select id as city from public.cities where organization_id is null order by id limit 1 \gset

insert into public.carrier_city_districts (provider_id, city_id, organization_id, district_id, district_name) values (:'prov', :'city', :'org', '77', 'Kénitra - Centre');
insert into public.carrier_city_districts (provider_id, city_id, organization_id, district_id, district_name) values (:'prov', :'city', :'org', '78', 'Kénitra - Saknia')
  on conflict (provider_id, city_id) do update set district_id = excluded.district_id, district_name = excluded.district_name, updated_at = now();
select tests.eq((select district_id from public.carrier_city_districts where provider_id = :'prov' and city_id = :'city'), '78', 'the last district chosen for a city is remembered');
select tests.expect_error(format($$insert into public.carrier_city_districts (provider_id, city_id, organization_id, district_id) values (%L, %s, %L, 'abc')$$, :'prov', :'city', :'org'), 'check');

select tests.login(:'viewer');
select tests.eq((select count(*) from public.carrier_city_districts), 1::bigint, 'members can read remembered districts');
update public.carrier_city_districts set district_id = '1' where provider_id = :'prov';
select tests.eq((select district_id from public.carrier_city_districts where provider_id = :'prov'), '78', 'viewers cannot change them');
select tests.login(:'other');
select tests.eq((select count(*) from public.carrier_city_districts), 0::bigint, 'other organizations cannot read them');
rollback;
